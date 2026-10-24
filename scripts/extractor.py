#!/usr/bin/env python3
"""
TeraPlay Universal Media Extractor Engine
Resolves real video streams from Instagram, YouTube, Facebook, TeraBox, and universal links.
"""

import sys
import os
import ssl
import io
import json
import re
import shutil
import socket
import ipaddress
import zipfile
import urllib.parse
import urllib.request
import urllib.error
from html import unescape as html_unescape

def _assert_public_http_url(url, allowed_hosts=None):
    """SSRF guard: http/https only, optionally host-allowlisted, and every
    resolved IP must be public (blocks loopback, private, link-local, and
    cloud-metadata ranges)."""
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme not in ('http', 'https'):
        raise ValueError(f'Only http(s) URLs are supported, got {parsed.scheme or "none"}')
    host = (parsed.hostname or '').lower()
    if not host:
        raise ValueError('URL has no hostname')
    if allowed_hosts:
        if not any(host == h or host.endswith('.' + h) for h in allowed_hosts):
            raise ValueError(f'Unsupported host: {host}')
    port = parsed.port or (443 if parsed.scheme == 'https' else 80)
    for _, _, _, _, sockaddr in socket.getaddrinfo(host, port):
        ip = ipaddress.ip_address(sockaddr[0])
        if not ip.is_global:
            raise ValueError(f'Blocked non-public address for {host}: {ip}')
    return host

def _safe_open(url, headers, timeout=20, allowed_hosts=None):
    """urlopen with SSRF validation applied to the initial URL and every
    redirect target."""
    _assert_public_http_url(url, allowed_hosts)

    class _GuardedRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers_, newurl):
            _assert_public_http_url(newurl, allowed_hosts)
            return super().redirect_request(req, fp, code, msg, headers_, newurl)

    opener = urllib.request.build_opener(_GuardedRedirect)
    req = urllib.request.Request(url, headers=headers)
    return opener.open(req, timeout=timeout)

try:
    import certifi
    os.environ['SSL_CERT_FILE'] = certifi.where()
    os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()
    ssl._create_default_https_context = ssl._create_unverified_context
except Exception:
    pass

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

try:
    import imageio_ffmpeg
    FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_PATH = shutil.which('ffmpeg')

def format_size(bytes_val):
    if not bytes_val or bytes_val <= 0:
        return "Direct Stream"
    mb = bytes_val / (1024 * 1024)
    if mb > 1024:
        return f"{mb / 1024:.2f} GB"
    return f"{mb:.1f} MB"

def extract_terabox_share_id(url):
    clean = url.strip()
    slash_match = re.search(r'/s/(?:1)?([a-zA-Z0-9_-]+)', clean, re.IGNORECASE)
    if slash_match:
        return slash_match.group(1)
    surl_match = re.search(r'[?&]surl=([a-zA-Z0-9_-]+)', clean, re.IGNORECASE)
    if surl_match:
        return surl_match.group(1)
    if re.match(r'^[a-zA-Z0-9_-]{10,40}$', clean):
        return clean
    return None

def resolve_terabox_dm_link(url, share_id):
    """dm.terabox.app direct dlink flow (jsToken + root='1,').

    Verified live 2026-10-22: /share/list on dm.terabox.app returns a REAL
    steaming dlink when called with a jsToken extracted from the share page,
    root="1," and browser-like Sec-Fetch headers. The dlink (dm-d.terabox.app)
    serves video/mp4 with Accept-Ranges and requires the ndus cookie at
    fetch time — which our /api/stream-download proxy already attaches.
    """
    surl = share_id[1:] if share_id.startswith('1') else share_id
    tb_cookie = os.environ.get('TERABOX_COOKIE', '').strip()
    if not tb_cookie:
        return None

    cookie_header = tb_cookie if 'ndus=' in tb_cookie else f"ndus={tb_cookie}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Cookie': cookie_header,
    }

    # 1. Share page → jsToken (fn%22... pattern embedded in page HTML)
    page_url = f"https://dm.terabox.app/sharing/link?surl={surl}&clearCache=1"
    js_token = ''
    try:
        req = urllib.request.Request(page_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as res:
            page = res.read().decode('utf-8', 'replace')
        m = re.search(r'fn%28%22(.*?)%22%29', page)
        if m:
            js_token = m.group(1)
    except Exception:
        return None
    if not js_token:
        return None

    # 2. share/list with jsToken + root="1," → dlink present in list payload
    params = urllib.parse.urlencode({
        'app_id': '250528', 'web': '1', 'channel': 'dubox', 'clienttype': '0',
        'jsToken': js_token, 'page': '1', 'num': '20',
        'by': 'name', 'order': 'asc', 'shorturl': surl, 'root': '1,',
    })
    list_headers = dict(headers, Referer=page_url, Origin='https://dm.terabox.app',
                        **{'X-Requested-With': 'XMLHttpRequest'})
    try:
        req = urllib.request.Request(f"https://dm.terabox.app/share/list?{params}", headers=list_headers)
        with urllib.request.urlopen(req, timeout=10) as res:
            data = json.loads(res.read().decode('utf-8'))
    except Exception:
        return None
    if data.get('errno') != 0 or not data.get('list'):
        return None

    item = data['list'][0]
    dlink = item.get('dlink')
    if not dlink:
        return None

    filename = item.get('server_filename') or f"TeraBox_Video_{surl[:8]}.mp4"
    size_bytes = int(item.get('size') or 0)
    thumbs = item.get('thumbs') or {}
    thumbnail = thumbs.get('url3') or thumbs.get('url2') or thumbs.get('url1') or ''
    duration_val = int(item.get('duration') or 0)
    clean_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', filename)
    proxy_url = f"/api/stream-download?url={urllib.parse.quote(dlink)}&filename={clean_name}&source=terabox"

    return {
        "success": True,
        "title": filename,
        "thumbnail": thumbnail,
        "stream_url": proxy_url,
        "download_url": proxy_url,
        "size": format_size(size_bytes),
        "duration": duration_val,
        "shareId": share_id,
        "platform": "terabox",
        "source": "terabox_dm_dlink",
        # Playback runs in TeraBox's own embed player. The dlink above is for
        # downloads only: dm-d.terabox.app throttles wide range requests, so a
        # <video> pointed at the proxied dlink stalls at readyState 0.
        "embed_url": f"https://www.1024tera.com/sharing/embed?surl={surl}",
        "formats": [
            {
                "format_id": "terabox_hd",
                "quality": "Original File Quality",
                "ext": "mp4",
                "filesize": format_size(size_bytes),
                "url": proxy_url,
                "download_url": proxy_url,
                "has_audio": True,
                "has_video": True,
                "is_progressive": True
            }
        ]
    }


def resolve_terabox(url, share_id):
    surl = share_id
    if surl.startswith('1'):
        surl = surl[1:]

    # 0. FAST PATH: dm.terabox.app jsToken flow returns real dlink directly
    dm_result = resolve_terabox_dm_link(url, share_id)
    if dm_result:
        return dm_result

    tb_cookie = os.environ.get('TERABOX_COOKIE', '').strip()
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.terabox.app/',
    }
    if tb_cookie:
        headers['Cookie'] = tb_cookie if 'ndus=' in tb_cookie else f"ndus={tb_cookie}"

    api_endpoints = [
        f"https://www.terabox.app/share/list?app_id=250528&shorturl={surl}&root=1",
        f"https://www.1024tera.com/api/share/list?app_id=250528&shorturl={surl}&root=1",
        f"https://terabox.com/api/share/list?shorturl={surl}&root=1",
    ]
    
    file_metadata = None

    for ep in api_endpoints:
        try:
            req = urllib.request.Request(ep, headers=headers)
            with urllib.request.urlopen(req, timeout=8) as res:
                if res.status == 200:
                    data = json.loads(res.read().decode('utf-8'))
                    if data.get('errno') == 0 and data.get('list'):
                        item = data['list'][0]
                        filename = item.get('server_filename') or f"TeraBox_Video_{share_id[:8]}.mp4"
                        size_bytes = int(item.get('size') or 0)
                        thumbs = item.get('thumbs') or {}
                        thumbnail = thumbs.get('url3') or thumbs.get('url2') or thumbs.get('url1') or ''
                        duration_val = int(item.get('duration') or 0)
                        fs_id = item.get('fs_id')
                        uk_val = data.get('uk')
                        share_id_val = data.get('share_id')
                        dlink = item.get('dlink')

                        file_metadata = {
                            "title": filename,
                            "thumbnail": thumbnail,
                            "size_bytes": size_bytes,
                            "duration": duration_val,
                            "fs_id": fs_id,
                            "uk": uk_val,
                            "share_id": share_id_val,
                            "dlink": dlink
                        }

                        # If dlink is absent and cookie is provided, attempt /share/download
                        if not dlink and tb_cookie and share_id_val and uk_val and fs_id:
                            try:
                                dl_url = f"https://www.terabox.app/share/download?app_id=250528&shareid={share_id_val}&uk={uk_val}&primaryid={share_id_val}&fid_list=%5B{fs_id}%5D"
                                req_dl = urllib.request.Request(dl_url, headers=headers)
                                with urllib.request.urlopen(req_dl, timeout=8) as res_dl:
                                    dl_data = json.loads(res_dl.read().decode('utf-8'))
                                    if dl_data.get('dlink'):
                                        dlink = dl_data.get('dlink')
                                        file_metadata["dlink"] = dlink
                            except Exception:
                                pass

                        if dlink:
                            clean_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', filename)
                            proxy_url = f"/api/stream-download?url={urllib.parse.quote(dlink)}&filename={clean_name}&source=terabox"
                            return {
                                "success": True,
                                "title": filename,
                                "thumbnail": thumbnail,
                                "stream_url": proxy_url,
                                "download_url": proxy_url,
                                "size": format_size(size_bytes),
                                "duration": duration_val,
                                "shareId": share_id,
                                "platform": "terabox",
                                "source": "terabox_direct_gateway",
                                "formats": [
                                    {
                                        "format_id": "terabox_hd",
                                        "quality": "Original File Quality",
                                        "ext": "mp4",
                                        "filesize": format_size(size_bytes),
                                        "url": proxy_url,
                                        "download_url": proxy_url,
                                        "has_audio": True,
                                        "has_video": True,
                                        "is_progressive": True
                                    }
                                ]
                            }
                        break
        except Exception:
            continue

    # Try external mirror scrapers if dlink not yet found
    mirrors = [
        f"https://terabox-api.grayhat.workers.dev/api?url={urllib.parse.quote(url)}",
        f"https://yt-api.site/api/terabox?url={urllib.parse.quote(url)}",
        f"https://teradl-api.dapuntaratya.com/api?url={urllib.parse.quote(url)}"
    ]
    for m in mirrors:
        try:
            req = urllib.request.Request(m, headers={'User-Agent': headers['User-Agent'], 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=6) as res:
                if res.status == 200:
                    data = json.loads(res.read().decode('utf-8'))
                    dlink = data.get('dlink') or data.get('download_url') or data.get('stream_url')
                    if dlink:
                        title = data.get('title') or data.get('file_name') or f"TeraBox_{share_id[:8]}.mp4"
                        clean_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', title)
                        proxy_url = f"/api/stream-download?url={urllib.parse.quote(dlink)}&filename={clean_name}&source=terabox"
                        return {
                            "success": True,
                            "title": title,
                            "thumbnail": data.get('thumbnail') or data.get('thumb') or '',
                            "stream_url": proxy_url,
                            "download_url": proxy_url,
                            "size": data.get('size') or "HD Stream",
                            "duration": 0,
                            "shareId": share_id,
                            "platform": "terabox",
                            "source": "terabox_public_mirror"
                        }
        except Exception:
            continue

    # If we got official metadata but need cookie/microservice for dlink, return honest, structured metadata!
    if file_metadata:
        fn = file_metadata["title"]
        sb = file_metadata["size_bytes"]
        clean_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', fn)
        embed_player_url = f"https://www.1024tera.com/sharing/embed?surl={surl}"
        return {
            "success": True,
            "title": fn,
            "thumbnail": file_metadata["thumbnail"],
            "stream_url": embed_player_url,
            "download_url": embed_player_url,
            "embed_url": embed_player_url,
            "size": format_size(sb),
            "duration": file_metadata["duration"],
            "shareId": share_id,
            "platform": "terabox",
            "source": "terabox_metadata_verified",
            "is_unauthenticated": True,
            "formats": [
                {
                    "format_id": "terabox_web",
                    "quality": "Direct Web Player",
                    "ext": "mp4",
                    "filesize": format_size(sb),
                    "url": embed_player_url,
                    "download_url": embed_player_url,
                    "has_audio": True,
                    "has_video": True,
                    "is_progressive": True
                }
            ]
        }

    return None

import xml.etree.ElementTree as ET
import html

def fetch_and_parse_subtitles(target_sub):
    if not target_sub:
        return []
    # Prioritize WebVTT, srv1, JSON3, JSON, or any valid URL
    formats = {item.get('ext'): item.get('url') for item in target_sub if item.get('url')}
    sub_url = (
        formats.get('vtt')
        or formats.get('srv1')
        or formats.get('json3')
        or formats.get('json')
        or formats.get('ttml')
        or target_sub[0].get('url')
    )
    if not sub_url:
        return []

    try:
        req = urllib.request.Request(sub_url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        })
        with urllib.request.urlopen(req, timeout=8) as resp:
            content = resp.read().decode('utf-8', errors='replace')
    except Exception:
        return []

    items = []

    # 1. WebVTT format (Dailymotion, Vimeo, TikTok, etc.)
    if 'WEBVTT' in content or '-->' in content:
        cue_pattern = re.compile(
            r'(?:(\d{1,2}):)?(\d{2}):(\d{2})[\.,](\d{3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[\.,](\d{3})'
        )

        def parse_ts(h, m, s, ms):
            hours = int(h) if h else 0
            mins = int(m)
            secs = int(s)
            millis = int(ms)
            return round(hours * 3600 + mins * 60 + secs + millis / 1000.0, 2)

        blocks = re.split(r'\r?\n\r?\n+', content)
        for block in blocks:
            lines = [l.strip() for l in block.strip().splitlines() if l.strip()]
            if not lines:
                continue
            time_match = None
            text_lines = []
            for line in lines:
                m = cue_pattern.search(line)
                if m:
                    time_match = m
                elif time_match:
                    clean_l = re.sub(r'<[^>]+>', '', line).strip()
                    if clean_l and not clean_l.startswith('NOTE') and not clean_l.startswith('STYLE'):
                        text_lines.append(clean_l)
            if time_match and text_lines:
                start_sec = parse_ts(time_match.group(1), time_match.group(2), time_match.group(3), time_match.group(4))
                end_sec = parse_ts(time_match.group(5), time_match.group(6), time_match.group(7), time_match.group(8))
                dur = round(max(0.5, end_sec - start_sec), 2)
                cue_text = html.unescape(' '.join(text_lines))
                items.append({
                    'start': start_sec,
                    'duration': dur,
                    'text': cue_text
                })
        if items:
            return items

    # 2. Bilibili JSON CC body format: {"body": [{"from": 1.2, "to": 3.4, "content": "..."}]}
    if content.strip().startswith('{') and '"body"' in content:
        try:
            data = json.loads(content)
            body_list = data.get('body') or (data.get('data', {}).get('body') if isinstance(data.get('data'), dict) else None)
            if isinstance(body_list, list):
                for cue in body_list:
                    c_from = float(cue.get('from', 0))
                    c_to = float(cue.get('to', 0))
                    c_text = str(cue.get('content', '')).strip()
                    if c_text:
                        items.append({
                            'start': round(c_from, 2),
                            'duration': round(max(0.5, c_to - c_from), 2),
                            'text': html.unescape(c_text)
                        })
                if items:
                    return items
        except Exception:
            pass

    # 3. XML / timedtext (YouTube / standard TTML)
    if '<transcript>' in content or '<timedtext' in content or '<text' in content:
        try:
            root = ET.fromstring(content)
            for elem in root.findall('.//text'):
                start = float(elem.attrib.get('start', '0'))
                dur = float(elem.attrib.get('dur', '0'))
                raw_txt = (elem.text or '').strip()
                if raw_txt:
                    items.append({
                        'start': round(start, 2),
                        'duration': round(dur, 2),
                        'text': html.unescape(raw_txt)
                    })
            if items:
                return items
        except Exception:
            pass

    # 4. JSON3 (YouTube events format)
    if content.strip().startswith('{') and '"events"' in content:
        try:
            data = json.loads(content)
            for ev in data.get('events', []):
                if 'segs' in ev:
                    seg_text = ''.join(s.get('utf8', '') for s in ev['segs']).strip()
                    if seg_text:
                        start_ms = ev.get('tStartMs', 0)
                        dur_ms = ev.get('dDurationMs', 0)
                        items.append({
                            'start': round(start_ms / 1000.0, 2),
                            'duration': round(dur_ms / 1000.0, 2),
                            'text': html.unescape(seg_text)
                        })
            if items:
                return items
        except Exception:
            pass

    return items

def extract_transcript_from_info(info):
    subtitles = info.get('subtitles') or {}
    auto_subs = info.get('automatic_captions') or {}

    target_sub = None
    target_lang = 'en'
    # Try preferred English tracks first
    for lang in ['en', 'en-US', 'en-GB']:
        if lang in subtitles:
            target_sub = subtitles[lang]
            target_lang = lang
            break
        if lang in auto_subs:
            target_sub = auto_subs[lang]
            target_lang = lang
            break

    # Fallback to any available language
    if not target_sub:
        if subtitles:
            target_lang = list(subtitles.keys())[0]
            target_sub = subtitles[target_lang]
        elif auto_subs:
            target_lang = list(auto_subs.keys())[0]
            target_sub = auto_subs[target_lang]

    if not target_sub:
        return None

    items = fetch_and_parse_subtitles(target_sub)
    if items:
        return {
            'language': target_lang,
            'items': items,
            'count': len(items)
        }
    return None

import shutil
import re

def format_friendly_error(err_str):
    if not err_str:
        return "Video stream could not be extracted. Please check the link and try again."
    err_lower = err_str.lower()
    if 'instagram' in err_lower:
        if any(w in err_lower for w in ['registered users', 'follow this account', 'login', 'cookies', 'private']):
            return "This Instagram post is from a private account or requires an Instagram login. Only public reels and posts can be analyzed without login."
        if 'not found' in err_lower or '404' in err_lower:
            return "This Instagram post was deleted or is no longer available."
        return "Instagram restricted or rate-limited access to this post. Please try a public Reel."
    if 'youtube' in err_lower or 'youtu' in err_lower:
        if 'bot' in err_lower or 'sign in' in err_lower:
            return "YouTube temporary anti-bot verification active. Please try again in a moment."
        if 'unavailable' in err_lower or 'private' in err_lower:
            return "This YouTube video is private or unavailable."
    if 'terabox' in err_lower:
        return "TeraBox share link expired or file has been deleted by owner."
    clean = re.sub(r'^ERROR:\s*(\[[^\]]+\]\s*)?', '', err_str)
    clean = re.sub(r'Use --cookies[^\.]*\.', '', clean)
    clean = re.sub(r'See https?:\/\/[^\s]+ for [^\.]*\.', '', clean)
    return clean.strip() or "Video stream could not be extracted. Please check the link and try again."

import struct

def get_jpeg_dimensions(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=4) as r:
            data = r.read(65536)
            i = 0
            while i < len(data) - 9:
                if data[i] == 0xFF and data[i+1] in [0xC0, 0xC1, 0xC2]:
                    h, w = struct.unpack('>HH', data[i+5:i+9])
                    return w, h
                i += 1
    except Exception:
        pass
    return None, None

def resolve_instagram_media(url):
    if not yt_dlp:
        return None
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ie = ydl.get_info_extractor('Instagram')
            res = ie._real_extract(url)
            if not res:
                return None

            title = res.get('title') or 'Instagram Post'
            uploader = res.get('uploader') or res.get('uploader_id') or 'Instagram Creator'
            entries = res.get('entries') or []
            is_carousel = len(entries) > 1

            # Detect actual image dimensions from the first item
            first_url = None
            if is_carousel:
                for item in entries:
                    thumbs = item.get('thumbnails') or []
                    if thumbs and thumbs[-1].get('url'):
                        first_url = thumbs[-1].get('url')
                        break
            else:
                target = entries[0] if entries else res
                thumbs = target.get('thumbnails') or res.get('thumbnails') or []
                if thumbs and thumbs[-1].get('url'):
                    first_url = thumbs[-1].get('url')

            det_w, det_h = (None, None)
            if first_url:
                det_w, det_h = get_jpeg_dimensions(first_url)

            final_w = det_w or 1080
            final_h = det_h or 1350
            is_vertical = final_h > final_w
            res_label = f"{final_w} × {final_h}"
            tier_label = "4K Ultra HD" if (final_w >= 3000 or final_h >= 3000) else ("1080p HD" if (final_w >= 1080 or final_h >= 1080) else "HD")

            thumbnails = []
            formats = []

            if is_carousel:
                for idx, item in enumerate(entries):
                    thumbs = item.get('thumbnails') or []
                    if thumbs:
                        best = thumbs[-1]
                        slide_url = best.get('url')
                        slide_label = f"Slide {idx + 1} of {len(entries)} ({tier_label} Portrait)" if is_vertical else f"Slide {idx + 1} of {len(entries)} ({tier_label})"
                        thumbnails.append({
                            "url": slide_url,
                            "width": final_w,
                            "height": final_h,
                            "resolution": res_label,
                            "quality_label": slide_label,
                        })
                        formats.append({
                            "format_id": f"slide_{idx + 1}",
                            "quality": f"Slide {idx + 1} Image ({tier_label} JPG)",
                            "height": final_h,
                            "ext": "jpg",
                            "filesize": f"{res_label} JPG",
                            "url": slide_url,
                            "download_url": slide_url,
                            "has_audio": False,
                            "has_video": False,
                            "is_audio_only": False,
                            "is_progressive": True
                        })
            else:
                target = entries[0] if entries else res
                thumbs = target.get('thumbnails') or res.get('thumbnails') or []
                if thumbs:
                    best = thumbs[-1]
                    slide_url = best.get('url')
                    thumbnails.append({
                        "url": slide_url,
                        "width": final_w,
                        "height": final_h,
                        "resolution": res_label,
                        "quality_label": f"Full-Res Image ({tier_label} Portrait)" if is_vertical else f"Full-Res Image ({tier_label})",
                    })
                    formats.append({
                        "format_id": "image_1",
                        "quality": f"Full-Res Image ({tier_label} JPG)",
                        "height": final_h,
                        "ext": "jpg",
                        "filesize": f"{res_label} JPG",
                        "url": slide_url,
                        "download_url": slide_url,
                        "has_audio": False,
                        "has_video": False,
                        "is_audio_only": False,
                        "is_progressive": True
                    })

            if not thumbnails:
                return None

            primary_thumb = thumbnails[0]["url"]
            clean_title = f"{uploader}: {title}" if uploader and title and not title.startswith(uploader) else (title or 'Instagram Media')

            return {
                "success": True,
                "title": clean_title,
                "thumbnail": primary_thumb,
                "thumbnails": thumbnails,
                "stream_url": primary_thumb,
                "download_url": primary_thumb,
                "size": f"{len(thumbnails)} {tier_label} Slides" if is_carousel else f"{tier_label} Photo",
                "duration": 0,
                "shareId": res.get('id') or 'instagram',
                "source": "instagram_carousel_engine",
                "platform": "instagram",
                "media_type": "carousel" if is_carousel else "image",
                "is_vertical": is_vertical,
                "aspect_ratio": f"{final_w}:{final_h}",
                "formats": formats,
                "video_formats": formats,
                "audio_formats": [],
                "is_mock": False
            }
    except Exception:
        return None

def resolve_tiktok_media(url):
    try:
        clean_url = url.strip()
        endpoint = f"https://www.tikwm.com/api/?url={urllib.parse.quote(clean_url)}"
        req = urllib.request.Request(
            endpoint,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            }
        )
        with urllib.request.urlopen(req, timeout=10) as res:
            if res.status != 200:
                return None
            payload = json.loads(res.read().decode('utf-8'))
            if payload.get('code') != 0 or not payload.get('data'):
                return None

            data = payload['data']
            video_id = str(data.get('id') or 'tiktok_video')
            title = data.get('title') or f"TikTok Video [{video_id}]"
            cover = data.get('cover') or data.get('origin_cover') or ''
            duration = int(data.get('duration') or 0)

            # Check if image slideshow / carousel
            images = data.get('images') or []
            if images:
                thumbnails = []
                formats = []
                for idx, img_url in enumerate(images):
                    slide_label = f"Slide {idx + 1} of {len(images)} (HD Photo)"
                    thumbnails.append({
                        "url": img_url,
                        "width": 1080,
                        "height": 1920,
                        "resolution": "1080 × 1920",
                        "quality_label": slide_label,
                    })
                    formats.append({
                        "format_id": f"slide_{idx + 1}",
                        "quality": f"Slide {idx + 1} Photo (JPG)",
                        "height": 1920,
                        "ext": "jpg",
                        "filesize": "HD Photo",
                        "url": img_url,
                        "download_url": img_url,
                        "has_audio": False,
                        "has_video": False,
                        "is_audio_only": False,
                        "is_progressive": True
                    })

                audio_formats = []
                music_url = data.get('music')
                if music_url:
                    audio_formats.append({
                        "format_id": "music_audio",
                        "quality": "Original Audio (MP3)",
                        "height": 0,
                        "ext": "mp3",
                        "filesize": "Audio Track",
                        "url": music_url,
                        "download_url": music_url,
                        "has_audio": True,
                        "has_video": False,
                        "is_audio_only": True,
                        "is_progressive": False
                    })

                return {
                    "success": True,
                    "title": title,
                    "thumbnail": cover or (thumbnails[0]["url"] if thumbnails else ""),
                    "thumbnails": thumbnails,
                    "stream_url": thumbnails[0]["url"] if thumbnails else "",
                    "download_url": thumbnails[0]["url"] if thumbnails else "",
                    "size": f"{len(images)} HD Slides",
                    "duration": 0,
                    "shareId": video_id,
                    "source": "tiktok_tikwm_engine",
                    "platform": "tiktok",
                    "media_type": "carousel",
                    "is_vertical": True,
                    "aspect_ratio": "9:16",
                    "formats": formats,
                    "video_formats": formats,
                    "audio_formats": audio_formats,
                    "is_mock": False
                }

            hd_play_url = data.get('hdplay')
            play_url = data.get('play')
            watermark_url = data.get('wmplay')
            music_url = data.get('music')
            primary_stream = hd_play_url or play_url or watermark_url
            if not primary_stream:
                return None

            formats = []

            # 1. HD No Watermark (if provided by TikWM)
            if hd_play_url:
                hd_size_bytes = int(data.get('hd_size') or data.get('size') or 0)
                hd_size_label = format_size(hd_size_bytes) if hd_size_bytes > 0 else "1080p HD"
                formats.append({
                    "format_id": "hd_no_watermark",
                    "quality": "1080p Full HD (No Watermark)",
                    "height": 1080,
                    "ext": "mp4",
                    "filesize": hd_size_label,
                    "url": hd_play_url,
                    "download_url": hd_play_url,
                    "has_audio": True,
                    "has_video": True,
                    "is_audio_only": False,
                    "is_progressive": True
                })

            # 2. Standard play URL (No Watermark)
            if play_url and play_url != hd_play_url:
                size_bytes = int(data.get('size') or 0)
                size_label = format_size(size_bytes) if size_bytes > 0 else ("720p HD" if hd_play_url else "HD Quality")
                height = 720 if hd_play_url else 1080
                label = "720p HD (No Watermark)" if hd_play_url else "1080p Full HD (No Watermark)"
                formats.append({
                    "format_id": "sd_no_watermark" if hd_play_url else "hd_no_watermark",
                    "quality": label,
                    "height": height,
                    "ext": "mp4",
                    "filesize": size_label,
                    "url": play_url,
                    "download_url": play_url,
                    "has_audio": True,
                    "has_video": True,
                    "is_audio_only": False,
                    "is_progressive": True
                })

            # 3. Watermarked version (Official TikTok copy)
            if watermark_url and watermark_url != play_url and watermark_url != hd_play_url:
                wm_size_bytes = int(data.get('wm_size') or data.get('size') or 0)
                wm_size_label = format_size(wm_size_bytes) if wm_size_bytes > 0 else "Original"
                formats.append({
                    "format_id": "watermark",
                    "quality": "Original (With Watermark)",
                    "height": 1080,
                    "ext": "mp4",
                    "filesize": wm_size_label,
                    "url": watermark_url,
                    "download_url": watermark_url,
                    "has_audio": True,
                    "has_video": True,
                    "is_audio_only": False,
                    "is_progressive": True
                })

            size_label = formats[0]["filesize"] if formats else format_size(int(data.get('size') or 0))

            audio_formats = []
            if music_url:
                audio_formats.append({
                    "format_id": "music_mp3",
                    "quality": "Original Audio (MP3)",
                    "height": 0,
                    "ext": "mp3",
                    "filesize": "Audio MP3",
                    "url": music_url,
                    "download_url": music_url,
                    "has_audio": True,
                    "has_video": False,
                    "is_audio_only": True,
                    "is_progressive": False
                })
                formats.append(audio_formats[0])

            thumbnails = [
                {
                    "url": cover,
                    "width": 1080,
                    "height": 1920,
                    "resolution": "1080 × 1920",
                    "quality_label": "Cover Thumbnail",
                }
            ] if cover else []

            return {
                "success": True,
                "title": title,
                "thumbnail": cover,
                "thumbnails": thumbnails,
                "stream_url": primary_stream,
                "download_url": primary_stream,
                "size": size_label,
                "duration": duration,
                "shareId": video_id,
                "source": "tiktok_tikwm_engine",
                "platform": "tiktok",
                "media_type": "video",
                "is_vertical": True,
                "aspect_ratio": "9:16",
                "formats": formats,
                "video_formats": [f for f in formats if not f.get('is_audio_only')],
                "audio_formats": audio_formats,
                "is_mock": False
            }
    except Exception:
        return None

def resolve_bilibili_media(url):
    """Cobalt-style Bilibili resolver (from cobalt api/.../services/bilibili.py).

    yt-dlp parses window.__INITIAL_STATE__ from the page HTML, but bilibili's
    overseas CDN edge serves those requests a 2KB stub. The server-rendered
    <script>window.__playinfo__= payload survives that (cobalt's facebookexternalhit
    UA trick), so parse it directly. bilibili.tv links skip the page entirely
    via the public intl gateway API.
    """
    clean = url.strip()
    lower = clean.lower()

    try:
        if 'b23.tv' in lower:
            # Short link: read the Location header without following it, then
            # treat the target like any other .com link.
            class NoRedirect(urllib.request.HTTPRedirectHandler):
                def redirect_request(self, req, fp, code, msg, headers, newurl):
                    return None
            opener = urllib.request.build_opener(NoRedirect)
            req = urllib.request.Request(clean, headers={'User-Agent': 'Mozilla/5.0'})
            try:
                opener.open(req, timeout=10)
            except urllib.error.HTTPError as e:
                location = (e.headers.get('Location') or '') if e.headers else ''
                if location:
                    clean = urllib.parse.urljoin(clean, location)
                    lower = clean.lower()
                else:
                    return None
            else:
                return None

        tv_match = re.search(r'bilibili\.tv/[^/]+/video/(\d+)', clean)
        com_match = re.search(r'bilibili\.(?:com|net)/(?:video/)?(BV[0-9A-Za-z]+|\d+)', clean)
        part_match = re.search(r'[?&]p=(\d+)', clean)
        if not tv_match and not com_match:
            return None

        if tv_match:
            # Intl gateway: reachable from regions where bilibili.com WAF 412s.
            # Returns up to 480p DASH (qn=64) with no auth, avc1 only per cobalt.
            aid = tv_match.group(1)
            endpoint = (
                'https://api.bilibili.tv/intl/gateway/web/playurl'
                '?s_locale=en_US&platform=web&qn=64&type=0&device=wap'
                f'&tf=0&spm_id=bstar-web.ugc-video-detail.0.0&from_spm_id=&aid={aid}'
            )
            req = urllib.request.Request(endpoint, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            })
            with urllib.request.urlopen(req, timeout=12) as res:
                payload = json.loads(res.read().decode('utf-8'))
            playurl = ((payload.get('data') or {}).get('playurl') or {})
            raw_video = [v.get('video_resource') for v in (playurl.get('video') or []) if v.get('video_resource')]
            video_tracks = [v for v in raw_video if 'avc1' in str(v.get('codecs') or '')]
            audio_tracks = list(playurl.get('audio_resource') or [])
            duration = int(next((int(v.get('duration') or 0) for v in video_tracks if v.get('duration')), 0))
            title = f"Bilibili TV Video [{aid}]"
            cover = ''
            source = 'bilibili_tv_gateway'
        else:
            vid = com_match.group(1)
            page_url = f"https://www.bilibili.com/video/{vid}"
            if part_match:
                page_url += f"?p={part_match.group(1)}"
            req = urllib.request.Request(page_url, headers={
                'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                'Accept': 'text/html,application/xhtml+xml',
            })
            with urllib.request.urlopen(req, timeout=12) as res:
                html = res.read().decode('utf-8', 'ignore')
            if '<script>window.__playinfo__=' not in html or '"video_codecid"' not in html:
                return None
            play_m = re.search(r'<script>window.__playinfo__=(\{.*?\})</script>', html)
            if not play_m:
                return None
            play = json.loads(play_m.group(1))
            dash = (play.get('data') or {}).get('dash') or {}
            video_tracks = list(dash.get('video') or [])
            audio_tracks = list(dash.get('audio') or [])
            duration = int(((play.get('data') or {}).get('timelength') or 0)) // 1000
            title_m = re.search(r'og:title"\s+content="([^"]+)"', html) or re.search(r'<title[^>]*>([^<]+)</title>', html)
            title = (title_m.group(1).strip() if title_m else '') or f"Bilibili Video [{vid}]"
            cover_m = re.search(r'og:image"\s+content="([^"]+)"', html)
            cover = cover_m.group(1) if cover_m else ''
            source = 'bilibili_playinfo_engine'

        def best_track(tracks):
            usable = [t for t in tracks if t.get('url') or t.get('baseUrl')]
            if not usable:
                return None
            return max(usable, key=lambda t: t.get('bandwidth') or (t.get('width', 0) * t.get('height', 0)))

        def track_url(t):
            return (t.get('url') or t.get('baseUrl') or '') if t else ''

        best_video = best_track(video_tracks)
        best_audio = best_track(audio_tracks)
        best_audio_url = track_url(best_audio)
        if not best_video or not best_audio_url:
            return None

        def quality_label(h):
            if h >= 2160:
                return "2160p (4K)"
            if h >= 1080:
                return "1080p Full HD"
            if h >= 720:
                return "720p HD"
            if h >= 480:
                return "480p SD"
            return f"{h}p" if h else "Default"

        clean_title = re.sub(r'[^a-zA-Z0-9_-]', '_', title).strip('_') or 'bilibili_video'
        enc_a = urllib.parse.quote(best_audio_url)

        # DASH tracks are video-only + audio-only. Pair every video tier with
        # the master audio through the mux proxy, like the universal path.
        seen_heights = set()
        video_formats = []
        for t in sorted(video_tracks, key=lambda t: t.get('height') or 0, reverse=True):
            v_url = track_url(t)
            h = int(t.get('height') or 0)
            if not v_url or h in seen_heights:
                continue
            seen_heights.add(h)
            enc_v = urllib.parse.quote(v_url)
            bandwidth = int(t.get('bandwidth') or 0)
            est_bytes = int(bandwidth / 8 * duration) if (bandwidth and duration) else 0
            video_formats.append({
                "format_id": str(t.get('id') or f"bili_{h}"),
                "quality": f"{quality_label(h)} (Audio + Video)",
                "height": h,
                "ext": "mp4",
                "filesize": format_size(est_bytes),
                "url": v_url,
                "download_url": f"/api/stream-download?url={enc_v}&audio_url={enc_a}&filename={clean_title}_{h}p&ext=mp4",
                "audio_url": best_audio_url,
                "has_audio": True,
                "has_video": True,
                "is_audio_only": False,
                "is_progressive": False,
                "can_mux": True,
            })

        mp3_tiers = [
            (320, "320 kbps (High Quality)"),
            (256, "256 kbps (Standard)"),
            (192, "192 kbps (Medium)"),
            (128, "128 kbps (Fast & Compact)"),
        ]
        audio_formats = []
        for abr, q_label in mp3_tiers:
            est_bytes = int((abr * 1000 / 8) * duration) if duration else 0
            audio_formats.append({
                "format_id": f"mp3_{abr}",
                "quality": q_label,
                "height": 0,
                "ext": "mp3",
                "filesize": format_size(est_bytes) if est_bytes else f"{abr} kbps",
                "url": best_audio_url,
                "download_url": f"/api/stream-download?url={enc_a}&filename={clean_title}_{abr}kbps&ext=mp3",
                "has_audio": True,
                "has_video": False,
                "is_audio_only": True,
                "is_progressive": False,
            })

        best_v_url = track_url(best_video)
        enc_v = urllib.parse.quote(best_v_url)
        stream_url = f"/api/stream-download?url={enc_v}&audio_url={enc_a}&filename=player_{clean_title[:48]}&ext=mp4"

        best_w = int(best_video.get('width') or 0)
        best_h = int(best_video.get('height') or 0)
        thumbnails = [{
            "url": cover,
            "width": best_w or 1280,
            "height": best_h or 720,
            "resolution": f"{best_w or 1280} × {best_h or 720}",
            "quality_label": "Cover Thumbnail",
        }] if cover else []

        return {
            "success": True,
            "title": title,
            "thumbnail": cover,
            "thumbnails": thumbnails,
            "stream_url": stream_url,
            "download_url": stream_url,
            "size": format_size(int(best_video.get('bandwidth') or 0) // 8 * duration) if duration else "Direct Stream",
            "duration": duration,
            "shareId": (tv_match or com_match).group(1),
            "source": source,
            "platform": "bilibili",
            "media_type": "video",
            "is_vertical": bool(best_h and best_w and best_h > best_w),
            "aspect_ratio": f"{best_w}:{best_h}" if (best_w and best_h) else None,
            "formats": video_formats + audio_formats,
            "video_formats": video_formats,
            "audio_formats": audio_formats,
            "is_mock": False
        }
    except Exception as e:
        print(f"[extractor] bilibili engine fell back to yt-dlp: {e}", file=sys.stderr)
        return None

def resolve_ytdlp(url):
    if 'tiktok.com' in url.lower():
        tt_res = resolve_tiktok_media(url)
        if tt_res and tt_res.get('success'):
            return tt_res

    if 'bilibili' in url.lower() or 'b23.tv' in url.lower():
        bili_res = resolve_bilibili_media(url)
        if bili_res and bili_res.get('success'):
            return bili_res

    if not yt_dlp:
        return {"success": False, "error": "yt-dlp is not installed"}

    node_bin = shutil.which('node') or r'C:\Program Files\nodejs\node.exe'
    js_runtime_config = {'node': {'path': node_bin}} if node_bin and sys.platform == 'win32' else {'node': {}}

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'extract_flat': False,
        'skip_download': True,
        'noplaylist': True,
        'remote_components': ['ejs:github'],
        'js_runtimes': js_runtime_config,
        'extractor_args': {
            'youtube': {
                'player_client': ['tv', 'web_embedded', 'default', 'android']
            }
        },
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    }

    if FFMPEG_PATH:
        ydl_opts['ffmpeg_location'] = FFMPEG_PATH

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        if 'instagram' in url.lower():
            ig_res = resolve_instagram_media(url)
            if ig_res and ig_res.get('success'):
                return ig_res
        if 'tiktok' in url.lower():
            tt_res = resolve_tiktok_media(url)
            if tt_res and tt_res.get('success'):
                return tt_res
        return {"success": False, "error": format_friendly_error(str(e))}

    if not info:
        if 'instagram' in url.lower():
            ig_res = resolve_instagram_media(url)
            if ig_res and ig_res.get('success'):
                return ig_res
        if 'tiktok' in url.lower():
            tt_res = resolve_tiktok_media(url)
            if tt_res and tt_res.get('success'):
                return tt_res
        return {"success": False, "error": "Could not extract video metadata"}

    try:
        title = info.get('title') or 'Universal Video Stream'
        thumbnail = info.get('thumbnail') or ''
        duration = info.get('duration') or 0
        size_bytes = info.get('filesize') or info.get('filesize_approx') or 0
        extractor_key = (info.get('extractor_key') or info.get('extractor') or '').lower()

        url_lower = url.lower()
        if 'youtube' in extractor_key or 'youtu' in url_lower:
            platform = 'youtube'
        elif 'tiktok' in extractor_key or 'tiktok' in url_lower:
            platform = 'tiktok'
        elif 'bilibili' in extractor_key or 'bilibili' in url_lower or 'b23.tv' in url_lower:
            platform = 'bilibili'
        elif 'dailymotion' in extractor_key or 'dailymotion' in url_lower or 'dai.ly' in url_lower:
            platform = 'dailymotion'
        elif 'snapchat' in extractor_key or 'snapchat' in url_lower:
            platform = 'snapchat'
        elif 'instagram' in extractor_key or 'instagram' in url_lower:
            platform = 'instagram'
        elif 'facebook' in extractor_key or 'fb' in extractor_key or any(k in url_lower for k in ['facebook', 'fb.watch', 'fb.com']):
            platform = 'facebook'
        elif 'twitter' in extractor_key or any(k in url_lower for k in ['twitter', 'x.com', 't.co']):
            platform = 'twitter'
        elif 'vimeo' in extractor_key or 'vimeo' in url_lower:
            platform = 'vimeo'
        elif 'linkedin' in extractor_key or 'linkedin' in url_lower:
            platform = 'linkedin'
        elif 'terabox' in extractor_key or any(d in url_lower for d in ['terabox', '1024tera', 'nephobox', '4funbox', 'mirrobox']):
            platform = 'terabox'
        elif any(url_lower.endswith(ext) or ext in url_lower for ext in ['.mp4', '.m3u8', '.webm', '.ogg']):
            platform = 'direct'
        else:
            platform = 'universal'

        is_youtube = platform == 'youtube'
        youtube_id = info.get('id') if is_youtube else None

        # Universal transcript extraction across all platforms
        transcript = extract_transcript_from_info(info)

        # Dynamic thumbnails collection
        raw_thumbs = info.get('thumbnails') or []
        dynamic_thumbs = []
        seen_thumb_urls = set()

        for t in raw_thumbs:
            t_url = t.get('url')
            if not t_url or t_url in seen_thumb_urls:
                continue
            seen_thumb_urls.add(t_url)
            w = t.get('width') or 0
            h = t.get('height') or 0
            res = f"{w} × {h}" if (w and h) else (t.get('resolution') or "Standard")
            if (w and w >= 1920) or (h and h >= 1080):
                q_label = "1080p Full HD"
            elif (w and w >= 1280) or (h and h >= 720):
                q_label = "720p HD"
            elif (w and w >= 640) or (h and h >= 480):
                q_label = "480p SD"
            elif w or h:
                q_label = f"{h or w}p"
            else:
                q_label = "Standard Quality"

            dynamic_thumbs.append({
                "url": t_url,
                "width": w,
                "height": h,
                "resolution": res,
                "quality_label": q_label
            })

        # Sort thumbnails descending by resolution
        dynamic_thumbs.sort(key=lambda x: (x.get('width') or 0) * (x.get('height') or 0), reverse=True)

        # For YouTube, guarantee standard cover tiers
        if is_youtube and youtube_id:
            yt_defaults = [
                {"url": f"https://img.youtube.com/vi/{youtube_id}/maxresdefault.jpg", "width": 1920, "height": 1080, "resolution": "1920 × 1080", "quality_label": "MaxRes Quality (1080p)"},
                {"url": f"https://img.youtube.com/vi/{youtube_id}/hqdefault.jpg", "width": 1280, "height": 720, "resolution": "1280 × 720", "quality_label": "High Quality (HQ 720p)"},
                {"url": f"https://img.youtube.com/vi/{youtube_id}/sddefault.jpg", "width": 640, "height": 480, "resolution": "640 × 480", "quality_label": "Standard Quality (SD)"},
                {"url": f"https://img.youtube.com/vi/{youtube_id}/mqdefault.jpg", "width": 320, "height": 180, "resolution": "320 × 180", "quality_label": "Medium Quality (MQ)"},
            ]
            yt_to_add = [yd for yd in yt_defaults if yd["url"] not in seen_thumb_urls]
            dynamic_thumbs = yt_to_add + dynamic_thumbs

        if not dynamic_thumbs and thumbnail:
            dynamic_thumbs.append({
                "url": thumbnail,
                "width": 1280,
                "height": 720,
                "resolution": "HD",
                "quality_label": "Cover Thumbnail"
            })

        raw_formats = info.get('formats') or []

        def get_eff_h(f):
            w = f.get('width') or 0
            h = f.get('height') or 0
            if w and h:
                if w >= 3840 and h >= 1600:
                    return 2160
                if w >= 2560 and h >= 1080:
                    return 1440
                if w >= 1920 and h >= 750:
                    return 1080
                if w >= 1280 and h >= 500:
                    return 720
                return min(w, h)
            return h or w or 0

        # Format clean title base with youtube_id when present
        clean_title_base = re.sub(r'[^a-zA-Z0-9_-]', '_', title).strip('_') or 'video'
        if youtube_id:
            clean_title_base = f"{clean_title_base}_{youtube_id}"

        # 1. Progressive streams (Audio + Video combined in single file)
        progressive = [f for f in raw_formats if f.get('url') and f.get('vcodec') not in ['none', None] and f.get('acodec') not in ['none', None]]
        prog_formats = []
        for f in progressive:
            h = get_eff_h(f) or (f.get('height') or 0)
            mapped_h = 360 if abs(h - 360) <= 40 else (720 if abs(h - 720) <= 60 else (480 if abs(h - 480) <= 50 else (1080 if abs(h - 1080) <= 90 else h)))
            sz = f.get('filesize') or f.get('filesize_approx') or (int(f.get('tbr', 0) * 1024 / 8 * duration) if f.get('tbr') and duration else 0)
            q_label = f"{mapped_h}p Standard (Audio + Video)" if mapped_h else "Universal MP4 (Audio + Video)"
            clean_title = clean_title_base
            p_url = f.get('url') or ''
            enc_p = urllib.parse.quote(p_url) if p_url else ''
            p_dl = f"/api/stream-download?url={enc_p}&filename={clean_title}_{mapped_h}p&ext=mp4" if enc_p else ""
            prog_formats.append({
                "format_id": str(f.get('format_id')),
                "quality": q_label,
                "height": mapped_h,
                "ext": f.get('ext') or 'mp4',
                "filesize": format_size(sz),
                "url": p_url,
                "download_url": p_dl,
                "has_audio": True,
                "has_video": True,
                "is_audio_only": False,
                "is_progressive": True
            })

        # 2. Extract Audio Tracks First (to attach to high-res video formats for muxing)
        audio_streams = [
            f for f in raw_formats
            if f.get('url')
            and f.get('vcodec') in ['none', None]
            and f.get('acodec') not in ['none', None]
        ]
        m4a_audio = [f for f in audio_streams if f.get('ext') == 'm4a']
        best_audio = m4a_audio[-1] if m4a_audio else (audio_streams[-1] if audio_streams else None)

        if not best_audio and progressive:
            best_audio = progressive[-1]

        best_audio_url = best_audio.get('url') if best_audio else None

        # 3. Extract High-Res Video Streams (4K, 1440p, 1080p, 720p, 480p, 360p)
        target_buckets = [
            (2160, '4K Ultra HD', 150),
            (1440, '1440p 2K QHD', 120),
            (1080, '1080p Full HD', 90),
            (720, '720p HD', 70),
            (480, '480p SD', 50),
            (360, '360p Standard', 40)
        ]

        video_only = [f for f in raw_formats if f.get('url') and f.get('vcodec') not in ['none', None] and f.get('acodec') in ['none', None]]
        video_formats = []
        used_format_ids = set()
        prog_heights = {p['height'] for p in prog_formats if p.get('height')}

        for min_h, label, tol in target_buckets:
            # Skip video-only duplicate if progressive format already provides this tier with audio
            if any(abs(ph - min_h) <= tol for ph in prog_heights):
                continue

            candidates = [
                f for f in video_only
                if str(f.get('format_id')) not in used_format_ids and (
                    abs(get_eff_h(f) - min_h) <= tol
                )
            ]
            if not candidates:
                continue

            def rank_candidate(c):
                ext_score = 10 if c.get('ext') == 'mp4' else 5
                codec = str(c.get('vcodec') or '')
                codec_score = 10 if codec.startswith('avc') else (8 if codec.startswith('av01') else 6)
                sz_val = c.get('filesize') or c.get('filesize_approx') or 0
                size_score = 10 if sz_val > 0 else 0
                return (size_score, ext_score, codec_score, sz_val)

            candidates.sort(key=rank_candidate, reverse=True)
            best = candidates[0]
            used_format_ids.add(str(best.get('format_id')))
            h = min_h
            sz = best.get('filesize') or best.get('filesize_approx') or (int(best.get('tbr', 0) * 1024 / 8 * duration) if best.get('tbr') and duration else 0)

            clean_title = clean_title_base
            best_v_url = best.get('url') or ''
            enc_v = urllib.parse.quote(best_v_url) if best_v_url else ''
            enc_a = urllib.parse.quote(best_audio_url) if best_audio_url else ''
            if enc_v and enc_a:
                v_dl = f"/api/stream-download?url={enc_v}&audio_url={enc_a}&filename={clean_title}_{h}p&ext=mp4"
            elif enc_v:
                v_dl = f"/api/stream-download?url={enc_v}&filename={clean_title}_{h}p&ext=mp4"
            else:
                v_dl = ""

            video_formats.append({
                "format_id": str(best.get('format_id')),
                "quality": f"{label} (Audio + Video)" if best_audio_url else f"{label} (Video Stream)",
                "height": h,
                "ext": best.get('ext') or 'mp4',
                "filesize": format_size(sz),
                "url": best_v_url,
                "download_url": v_dl,
                "audio_url": best_audio_url,
                "has_audio": bool(best_audio_url),
                "has_video": True,
                "is_audio_only": False,
                "is_progressive": False,
                "can_mux": bool(best_audio_url)
            })

        # Combine video formats: sort by resolution descending, progressive/muxed audio+video preferred
        all_videos = prog_formats + video_formats
        all_videos.sort(key=lambda x: (x.get('height') or 0, 1 if x.get('has_audio') else 0), reverse=True)

        audio_formats_list = []
        if best_audio:
            mp3_tiers = [
                (320, "320 kbps (High Quality)"),
                (256, "256 kbps (Standard)"),
                (192, "192 kbps (Medium)"),
                (128, "128 kbps (Fast & Compact)"),
            ]
            for abr, q_label in mp3_tiers:
                est_bytes = int((abr * 1000 / 8) * duration) if duration else 0
                clean_title = clean_title_base
                a_stream_url = best_audio.get('url') or ''
                enc_a_stream = urllib.parse.quote(a_stream_url) if a_stream_url else ''
                a_dl = f"/api/stream-download?url={enc_a_stream}&filename={clean_title}_{abr}kbps&ext=mp3" if enc_a_stream else ""
                audio_formats_list.append({
                    "format_id": f"mp3_{abr}",
                    "quality": q_label,
                    "height": 0,
                    "ext": "mp3",
                    "filesize": format_size(est_bytes) if est_bytes else f"{abr} kbps",
                    "url": a_stream_url,
                    "download_url": a_dl,
                    "has_audio": True,
                    "has_video": False,
                    "is_audio_only": True,
                    "is_progressive": False
                })

            a_size = best_audio.get('filesize') or best_audio.get('filesize_approx') or (int(best_audio.get('tbr', 0) * 1024 / 8 * duration) if best_audio.get('tbr') and duration else 0)
            orig_abr = int(best_audio.get('abr') or 128)
            clean_title = clean_title_base
            m_url = best_audio.get('url') or ''
            enc_m = urllib.parse.quote(m_url) if m_url else ''
            m_ext = best_audio.get('ext') or 'm4a'
            m_dl = f"/api/stream-download?url={enc_m}&filename={clean_title}_master_{orig_abr}kbps&ext={m_ext}" if enc_m else ""
            audio_formats_list.append({
                "format_id": str(best_audio.get('format_id')),
                "quality": f"Master Audio Track ({orig_abr} kbps {m_ext.upper()})",
                "height": 0,
                "ext": m_ext,
                "filesize": format_size(a_size),
                "url": m_url,
                "download_url": m_dl,
                "has_audio": True,
                "has_video": False,
                "is_audio_only": True,
                "is_progressive": False
            })

        # Best playable stream for immediate video player — it MUST carry the audio track.
        # Modern DASH sources (e.g. Instagram reels) deliver video-only + audio-only separately;
        # raw video-only URLs would play silently in the browser. Route through the mux proxy.
        progressive_candidates = [f for f in raw_formats if f.get('url') and f.get('vcodec') not in ['none', None] and f.get('acodec') not in ['none', None]]
        stream_url = progressive_candidates[-1].get('url') if progressive_candidates else None
        if not stream_url:
            mux_candidates = [v for v in all_videos if v.get('can_mux') and v.get('url')]
            if mux_candidates and best_audio_url:
                top = mux_candidates[0]  # all_videos sorted by height desc → highest tier
                enc_v = urllib.parse.quote(top.get('url'))
                enc_a = urllib.parse.quote(best_audio_url)
                stream_url = f"/api/stream-download?url={enc_v}&audio_url={enc_a}&filename=player_{clean_title_base[:48]}&ext=mp4"
                print(f"[extractor] no progressive stream; mux-proxy player URL selected ({top.get('height')}p + {best_audio.get('ext')})", file=sys.stderr)
            else:
                stream_url = info.get('url')
                if not stream_url and raw_formats:
                    valid_urls = [f.get('url') for f in raw_formats if f.get('url')]
                    if valid_urls:
                        stream_url = valid_urls[-1]

        if not stream_url and is_youtube:
            stream_url = f"https://www.youtube.com/watch?v={youtube_id}"

        if not stream_url:
            if platform == 'instagram':
                ig_res = resolve_instagram_media(url)
                if ig_res and ig_res.get('success'):
                    return ig_res
            return {"success": False, "error": "No direct media stream found for this link"}

        if not all_videos and stream_url:
            all_videos.append({
                "format_id": "default",
                "quality": f"{info.get('height') or 720}p Standard (Audio + Video)",
                "height": info.get('height') or 720,
                "ext": info.get('ext') or 'mp4',
                "filesize": format_size(size_bytes),
                "url": stream_url,
                "has_audio": True,
                "has_video": True,
                "is_audio_only": False,
                "is_progressive": True
            })

        available_formats = all_videos + audio_formats_list

        info_w = info.get('width') or 0
        info_h = info.get('height') or 0
        if not info_w or not info_h:
            for f in raw_formats:
                fw = f.get('width') or 0
                fh = f.get('height') or 0
                if fw and fh and (fw * fh > info_w * info_h):
                    info_w = fw
                    info_h = fh
        is_vertical = info_h > info_w if (info_w and info_h) else False

        return {
            "success": True,
            "title": title,
            "thumbnail": thumbnail,
            "thumbnails": dynamic_thumbs,
            "stream_url": stream_url,
            "download_url": stream_url,
            "size": format_size(size_bytes),
            "duration": duration,
            "source": f"ytdlp_{extractor_key or 'universal'}",
            "platform": platform,
            "youtube_id": youtube_id,
            "transcript": transcript,
            "is_vertical": is_vertical,
            "aspect_ratio": f"{info_w}:{info_h}" if (info_w and info_h) else None,
            "formats": available_formats,
            "video_formats": all_videos,
            "audio_formats": audio_formats_list
        }
    except Exception as e:
        return {"success": False, "error": format_friendly_error(str(e))}

def resolve_reddit_media(url):
    """Reddit requires auth cookies for yt-dlp since 2024, but the public .json
    endpoint still serves media to logged-out clients. fallback_url is a direct
    video MP4; non-muted posts also expose a sibling DASH audio track."""
    browser_headers = {
        # Script-style UA is the shape Reddit's public JSON still accepts from
        # logged-out clients; browser UAs get 403.
        'User-Agent': 'script:TeraPlay:v1.0 (by /u/teraplay)',
        'Accept': 'application/json',
    }
    try:
        json_url = re.sub(r'[?#].*$', '', url).rstrip('/') + '.json'
        json_url = json_url.replace('//www.reddit.com', '//old.reddit.com')
        payload = None
        for attempt_cookie in (False, True):
            headers = dict(browser_headers)
            if attempt_cookie:
                session = os.environ.get('REDDIT_SESSION')
                if not session:
                    break
                headers['Cookie'] = f'reddit_session={session}'
            req = urllib.request.Request(json_url, headers=headers)
            try:
                with _safe_open(json_url, headers,
                                allowed_hosts=('reddit.com',)) as resp:
                    final_url = resp.geturl()
                    if '/login/' in final_url:
                        continue
                    payload = json.loads(resp.read().decode('utf-8', 'replace'))
                    break
            except (urllib.error.HTTPError, ValueError):
                continue
        if payload is None:
            return {"success": False, "error": "Reddit is blocking anonymous access from this server. Set the REDDIT_SESSION environment variable to a reddit_session cookie to enable Reddit downloads."}
        post = payload[0]['data']['children'][0]['data']
        media = post.get('secure_media') or post.get('media') or {}
        video = media.get('reddit_video') if isinstance(media, dict) else None
        if not video and post.get('crosspost_parent_list'):
            cp_media = post['crosspost_parent_list'][0].get('secure_media') or {}
            video = cp_media.get('reddit_video') if isinstance(cp_media, dict) else None
        fallback = (video or {}).get('fallback_url')
        if not fallback:
            # Image/text post: let the generic yt-dlp path try gallery handling.
            return None

        audio_url = None
        audio_guess = re.sub(r'/DASH_\d+\.mp4', '/DASH_AUDIO_128.mp4', fallback)
        try:
            probe = urllib.request.Request(audio_guess, headers={
                'User-Agent': browser_headers['User-Agent'],
                'Range': 'bytes=0-16',
            })
            with urllib.request.urlopen(probe, timeout=10) as r:
                if r.status == 200:
                    audio_url = audio_guess
        except Exception:
            audio_url = None

        thumb = post.get('thumbnail')
        return {
            "success": True,
            "title": post.get('title') or 'Reddit Video',
            "thumbnail": thumb if isinstance(thumb, str) and thumb.startswith('http') else None,
            "thumbnails": [],
            "stream_url": fallback,
            "download_url": fallback,
            "size": "Direct Stream",
            "duration": int(video.get('duration') or 0),
            "source": "reddit_json",
            "platform": "reddit",
            "youtube_id": None,
            "transcript": None,
            "is_vertical": None,
            "aspect_ratio": None,
            "formats": [],
            "audio_url": audio_url,
        }
    except Exception as e:
        return {"success": False, "error": format_friendly_error(str(e))}

def _html_to_text(html: str) -> str:
    """Minimal tag stripper for Wattpad part HTML. No bs4 dependency."""
    text = re.sub(r'<(br|/p|/div|/h\d)[^>]*>', '\n', html, flags=re.I)
    text = re.sub(r'<[^>]+>', '', text)
    text = html_unescape(text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def resolve_wattpad_media(url):
    """Free public Wattpad stories via the public v3/apiv2 endpoints used by
    TheOnlyWayUp/WattpadDownloader. Paid Stories are refused, not bypassed."""
    browser_headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    }
    try:
        story_id = None
        part_id = None
        m = re.search(r'wattpad\.com/story/(\d+)', url)
        if m:
            story_id = m.group(1)
        else:
            m = re.search(r'wattpad\.com/(?:story/\d+[^/]*/)?part/(\d+)', url)
            if m:
                part_id = m.group(1)
            else:
                m = re.search(r'wattpad\.com/(\d{5,})', url)
                if m:
                    part_id = m.group(1)
        if not story_id and not part_id:
            return None

        if part_id and not story_id:
            with _safe_open(
                f'https://www.wattpad.com/api/v3/story_parts/{part_id}?fields=groupId',
                browser_headers, allowed_hosts=('wattpad.com',)) as resp:
                story_id = str(json.loads(resp.read().decode('utf-8', 'replace'))['groupId'])

        fields = 'id,title,createDate,modifyDate,completed,mature,url,isPaywalled,user(username),parts(id,title),cover,description'
        with _safe_open(
            f'https://www.wattpad.com/api/v3/stories/{story_id}?fields={fields}',
            browser_headers, allowed_hosts=('wattpad.com',)) as resp:
            story = json.loads(resp.read().decode('utf-8', 'replace'))

        if story.get('isPaywalled'):
            return {
                "success": False,
                "error": "This is a Wattpad Paid Story. TeraPlay does not bypass payments; only free public stories are supported.",
                "title": story.get('title'),
            }

        with _safe_open(
            f'https://www.wattpad.com/apiv2/?m=storytext&group_id={story_id}&output=zip',
            browser_headers, timeout=30, allowed_hosts=('wattpad.com',)) as resp:
            zip_bytes = resp.read()
        archive = zipfile.ZipFile(io.BytesIO(zip_bytes), 'r')
        title_by_id = {str(p['id']): p.get('title', '') for p in story.get('parts', [])}

        sections = []
        total_chars = 0
        truncated = False
        for name in archive.namelist():
            part_key = str(name).rsplit('.', 1)[0]
            if part_key not in title_by_id:
                continue
            part_html = archive.read(name).decode('utf-8', 'replace')
            part_text = _html_to_text(part_html)
            if not part_text:
                continue
            sections.append(f"\n\n## {title_by_id[part_key]}\n\n{part_text}")
            total_chars += len(part_text)
            if total_chars > 500000:
                truncated = True
                break

        if not sections:
            return {"success": False, "error": "This story has no readable public parts."}

        author = (story.get('user') or {}).get('username') or 'Unknown'
        text_content = f"{story.get('title', 'Wattpad Story')}\nby {author} on Wattpad\n{'=' * 40}\n" + ''.join(sections)
        if truncated:
            text_content += "\n\n[Truncated: story exceeds TeraPlay's 500k character limit.]"

        cover = story.get('cover')
        return {
            "success": True,
            "title": story.get('title') or 'Wattpad Story',
            "thumbnail": cover if isinstance(cover, str) and cover.startswith('http') else None,
            "thumbnails": [],
            "stream_url": None,
            "download_url": None,
            "size": f"{len(text_content) // 1024} KB text",
            "duration": 0,
            "source": "wattpad_api",
            "platform": "wattpad",
            "youtube_id": None,
            "transcript": None,
            "text_content": text_content,
            "formats": [],
        }
    except Exception as e:
        return {"success": False, "error": format_friendly_error(str(e))}

def resolve_slideshare_media(url):
    """Public SlideShare decks: slide images are rendered openly on the page
    and served from image.slidesharecdn.com without login."""
    browser_headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    }
    try:
        with _safe_open(url, browser_headers,
                        allowed_hosts=('slideshare.net', 'slideshare.com')) as resp:
            page = resp.read().decode('utf-8', 'replace')

        title_match = re.search(r'<meta property="og:title" content="([^"]+)"', page)
        title = html_unescape(title_match.group(1)) if title_match else 'SlideShare Deck'

        seen = set()
        slides = []
        for img in re.findall(r'https://image\.slidesharecdn\.com/[^\s"\'\\<>]+?\.(?:jpg|jpeg|png)[^\s"\'\\<>]*', page):
            base = img.split('?')[0]
            if base in seen:
                continue
            seen.add(base)
            slides.append(img)
        if not slides:
            return {"success": False, "error": "No public slide images found on this SlideShare page. The deck may be private or SlideShare may have changed its layout."}

        thumbs = []
        for idx, slide in enumerate(slides):
            thumbs.append({
                "url": slide,
                "width": 1024,
                "height": 768,
                "resolution": "Slide Image",
                "quality_label": f"Slide {idx + 1} of {len(slides)}",
            })
        return {
            "success": True,
            "title": title,
            "thumbnail": slides[0],
            "thumbnails": thumbs,
            "stream_url": slides[0],
            "download_url": slides[0],
            "size": f"{len(slides)} slides",
            "duration": 0,
            "source": "slideshare_page",
            "platform": "slideshare",
            "youtube_id": None,
            "transcript": None,
            "is_vertical": False,
            "aspect_ratio": None,
            "formats": [],
        }
    except Exception as e:
        return {"success": False, "error": format_friendly_error(str(e))}

def extract_media_info(url: str, is_transcript_only: bool = False) -> dict:
    url = (url or "").strip()
    if not url:
        return {"success": False, "error": "Empty URL"}

    if not url.startswith('http') and len(url) == 11:
        url = f"https://www.youtube.com/watch?v={url}"

    # Check TeraBox unless transcript only
    terabox_attempted = False
    if not is_transcript_only:
        share_id = extract_terabox_share_id(url)
        lower = url.lower()
        is_terabox = any(domain in lower for domain in ['terabox', '1024tera', 'nephobox', 'terashare']) or (share_id and len(share_id) >= 15)

        if is_terabox and share_id:
            terabox_attempted = True
            tb_result = resolve_terabox(url, share_id)
            if tb_result:
                return tb_result

    if not is_transcript_only:
        lower_url = url.lower()
        if 'wattpad.com' in lower_url:
            wattpad_result = resolve_wattpad_media(url)
            if wattpad_result is not None:
                return wattpad_result
        if 'slideshare.' in lower_url:
            slideshare_result = resolve_slideshare_media(url)
            if slideshare_result is not None:
                return slideshare_result

    if not is_transcript_only and 'reddit.com' in url.lower():
        reddit_result = resolve_reddit_media(url)
        if reddit_result is not None:
            return reddit_result

    # Universal / Social Media / YouTube resolution via yt-dlp
    try:
        ytdlp_result = resolve_ytdlp(url)
        if terabox_attempted and not ytdlp_result.get('success'):
            # yt-dlp reports the mirror's error page ("Unsupported URL: .../error/404.html").
            # Say what actually happened: the share is gone.
            return {
                "success": False,
                "error": "This TeraBox share link could not be opened. It may have expired, been removed, or be rate limited.",
            }
        if is_transcript_only:
            if ytdlp_result.get('success') and ytdlp_result.get('transcript'):
                return {
                    "success": True,
                    "title": ytdlp_result.get('title'),
                    "youtube_id": ytdlp_result.get('youtube_id'),
                    "transcript": ytdlp_result.get('transcript')
                }
            else:
                return {
                    "success": False,
                    "error": "No transcript available for this video",
                    "title": ytdlp_result.get('title'),
                    "youtube_id": ytdlp_result.get('youtube_id')
                }

        return ytdlp_result
    except Exception as e:
        return {"success": False, "error": format_friendly_error(str(e))}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Missing URL argument"}))
        sys.exit(1)

    is_transcript_only = False
    url_arg_idx = 1
    if sys.argv[1] in ['--transcript', '-t']:
        is_transcript_only = True
        if len(sys.argv) < 3:
            print(json.dumps({"success": False, "error": "Missing URL/ID argument after --transcript"}))
            sys.exit(1)
        url_arg_idx = 2

    raw_url = sys.argv[url_arg_idx]
    result = extract_media_info(raw_url, is_transcript_only=is_transcript_only)
    print(json.dumps(result))

if __name__ == '__main__':
    main()

