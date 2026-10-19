#!/usr/bin/env python3
"""
TeraPlay Universal Media Extractor Engine
Resolves real video streams from Instagram, YouTube, Facebook, TeraBox, and universal links.
"""

import sys
import json
import re
import urllib.parse
import urllib.request

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

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

def resolve_terabox(url, share_id):
    surl = share_id
    if surl.startswith('1'):
        surl = surl[1:]
    
    api_endpoints = [
        f"https://www.terabox.app/share/list?shorturl={surl}&root=1",
        f"https://www.1024tera.com/api/share/list?shorturl={surl}&root=1",
        f"https://terabox.com/api/share/list?shorturl={surl}&root=1",
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.terabox.com/',
    }

    for ep in api_endpoints:
        try:
            req = urllib.request.Request(ep, headers=headers)
            with urllib.request.urlopen(req, timeout=8) as res:
                if res.status == 200:
                    data = json.loads(res.read().decode('utf-8'))
                    if data.get('errno') == 0 and data.get('list'):
                        item = data['list'][0]
                        dlink = item.get('dlink')
                        filename = item.get('server_filename') or f"TeraBox_Video_{share_id[:8]}.mp4"
                        size_bytes = int(item.get('size') or 0)
                        thumbs = item.get('thumbs') or {}
                        thumbnail = thumbs.get('url3') or thumbs.get('url2') or thumbs.get('url1') or ''
                        
                        if dlink:
                            return {
                                "success": True,
                                "title": filename,
                                "thumbnail": thumbnail,
                                "stream_url": dlink,
                                "download_url": dlink,
                                "size": format_size(size_bytes),
                                "duration": 0,
                                "shareId": share_id,
                                "source": "terabox_official_gateway"
                            }
        except Exception:
            continue
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

            no_watermark_url = data.get('play') or data.get('hdplay')
            watermark_url = data.get('wmplay')
            music_url = data.get('music')
            primary_stream = no_watermark_url or watermark_url
            if not primary_stream:
                return None

            size_bytes = int(data.get('size') or 0)
            size_label = format_size(size_bytes)

            formats = []
            if no_watermark_url:
                formats.append({
                    "format_id": "hd_no_watermark",
                    "quality": "1080p HD (No Watermark)",
                    "height": 1080,
                    "ext": "mp4",
                    "filesize": size_label,
                    "url": no_watermark_url,
                    "download_url": no_watermark_url,
                    "has_audio": True,
                    "has_video": True,
                    "is_audio_only": False,
                    "is_progressive": True
                })
            if watermark_url and watermark_url != no_watermark_url:
                formats.append({
                    "format_id": "watermark",
                    "quality": "Original (With Watermark)",
                    "height": 1080,
                    "ext": "mp4",
                    "filesize": size_label,
                    "url": watermark_url,
                    "download_url": watermark_url,
                    "has_audio": True,
                    "has_video": True,
                    "is_audio_only": False,
                    "is_progressive": True
                })

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

def resolve_ytdlp(url):
    if 'tiktok.com' in url.lower():
        tt_res = resolve_tiktok_media(url)
        if tt_res and tt_res.get('success'):
            return tt_res

    if not yt_dlp:
        return {"success": False, "error": "yt-dlp is not installed"}

    node_bin = shutil.which('node') or r'C:\Program Files\nodejs\node.exe'
    js_runtime_config = {'node': {'path': node_bin}} if node_bin and sys.platform == 'win32' else {'node': {}}

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
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

        # 1. Progressive streams (Audio + Video combined in single file)
        progressive = [f for f in raw_formats if f.get('url') and f.get('vcodec') not in ['none', None] and f.get('acodec') not in ['none', None]]
        prog_formats = []
        for f in progressive:
            h = get_eff_h(f) or (f.get('height') or 0)
            mapped_h = 360 if abs(h - 360) <= 40 else (720 if abs(h - 720) <= 60 else (480 if abs(h - 480) <= 50 else (1080 if abs(h - 1080) <= 90 else h)))
            sz = f.get('filesize') or f.get('filesize_approx') or (int(f.get('tbr', 0) * 1024 / 8 * duration) if f.get('tbr') and duration else 0)
            q_label = f"{mapped_h}p Standard (Audio + Video)" if mapped_h else "Universal MP4 (Audio + Video)"
            prog_formats.append({
                "format_id": str(f.get('format_id')),
                "quality": q_label,
                "height": mapped_h,
                "ext": f.get('ext') or 'mp4',
                "filesize": format_size(sz),
                "url": f.get('url'),
                "has_audio": True,
                "has_video": True,
                "is_audio_only": False,
                "is_progressive": True
            })

        # 2. Extract High-Res Video Streams (4K, 1440p, 1080p, 720p, 480p, 360p)
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

            video_formats.append({
                "format_id": str(best.get('format_id')),
                "quality": f"{label} (Video Stream)",
                "height": h,
                "ext": best.get('ext') or 'mp4',
                "filesize": format_size(sz),
                "url": best.get('url'),
                "has_audio": False,
                "has_video": True,
                "is_audio_only": False,
                "is_progressive": False
            })

        # Combine video formats: sort by resolution descending, progressive audio+video preferred
        all_videos = prog_formats + video_formats
        all_videos.sort(key=lambda x: (x.get('height') or 0, 1 if x.get('has_audio') else 0), reverse=True)

        # 3. Extract Audio Tracks
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
                audio_formats_list.append({
                    "format_id": f"mp3_{abr}",
                    "quality": q_label,
                    "height": 0,
                    "ext": "mp3",
                    "filesize": format_size(est_bytes) if est_bytes else f"{abr} kbps",
                    "url": best_audio.get('url'),
                    "has_audio": True,
                    "has_video": False,
                    "is_audio_only": True,
                    "is_progressive": False
                })

            a_size = best_audio.get('filesize') or best_audio.get('filesize_approx') or (int(best_audio.get('tbr', 0) * 1024 / 8 * duration) if best_audio.get('tbr') and duration else 0)
            orig_abr = int(best_audio.get('abr') or 128)
            audio_formats_list.append({
                "format_id": str(best_audio.get('format_id')),
                "quality": f"Master Audio Track ({orig_abr} kbps {best_audio.get('ext', 'm4a').upper()})",
                "height": 0,
                "ext": best_audio.get('ext') or 'm4a',
                "filesize": format_size(a_size),
                "url": best_audio.get('url'),
                "has_audio": True,
                "has_video": False,
                "is_audio_only": True,
                "is_progressive": False
            })

        # Best playable stream for immediate video player
        progressive_candidates = [f for f in raw_formats if f.get('url') and f.get('vcodec') not in ['none', None] and f.get('acodec') not in ['none', None]]
        stream_url = progressive_candidates[-1].get('url') if progressive_candidates else info.get('url')
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

def extract_media_info(url: str, is_transcript_only: bool = False) -> dict:
    url = (url or "").strip()
    if not url:
        return {"success": False, "error": "Empty URL"}

    if not url.startswith('http') and len(url) == 11:
        url = f"https://www.youtube.com/watch?v={url}"

    # Check TeraBox unless transcript only
    if not is_transcript_only:
        share_id = extract_terabox_share_id(url)
        lower = url.lower()
        is_terabox = any(domain in lower for domain in ['terabox', '1024tera', 'nephobox', 'terashare']) or (share_id and len(share_id) >= 15)

        if is_terabox and share_id:
            tb_result = resolve_terabox(url, share_id)
            if tb_result:
                return tb_result

    # Universal / Social Media / YouTube resolution via yt-dlp
    try:
        ytdlp_result = resolve_ytdlp(url)
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

