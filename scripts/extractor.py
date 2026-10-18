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
    # Try srv1, then vtt, then json3, or first
    formats = {item.get('ext'): item.get('url') for item in target_sub if item.get('url')}
    sub_url = formats.get('srv1') or formats.get('vtt') or formats.get('json3') or target_sub[0].get('url')
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
    # If XML / timedtext
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

    # If JSON3
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

def resolve_ytdlp(url):
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

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        if not info:
            return {"success": False, "error": "Could not extract video metadata"}

        title = info.get('title') or 'Universal Video Stream'
        thumbnail = info.get('thumbnail') or ''
        duration = info.get('duration') or 0
        size_bytes = info.get('filesize') or info.get('filesize_approx') or 0
        extractor_key = info.get('extractor_key', '').lower()
        is_youtube = 'youtube' in extractor_key or 'youtu' in url.lower()
        youtube_id = info.get('id') if is_youtube else None

        # Extract transcript if YouTube
        transcript = None
        if is_youtube:
            transcript = extract_transcript_from_info(info)

        available_formats = []
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

        # Combine video formats with highest resolution first
        all_videos = prog_formats + video_formats
        all_videos.sort(key=lambda x: (x.get('height') or 0, 1 if x.get('has_audio') else 0), reverse=True)
        available_formats.extend(all_videos)

        # 3. Extract High Quality Audio Tracks (MP3 Tiers + Original M4A Master)
        audio_streams = [
            f for f in raw_formats
            if f.get('url')
            and f.get('vcodec') in ['none', None]
            and f.get('acodec') not in ['none', None]
        ]
        m4a_audio = [f for f in audio_streams if f.get('ext') == 'm4a']
        best_audio = m4a_audio[-1] if m4a_audio else (audio_streams[-1] if audio_streams else None)
        
        # Fallback to progressive stream if no dedicated audio-only streams exist (e.g. mobile Shorts)
        if not best_audio and progressive:
            best_audio = progressive[-1]
        if best_audio:
            # Add Standard MP3 Quality tiers (320k, 256k, 192k, 128k)
            mp3_tiers = [
                (320, "320 kbps (High Quality)"),
                (256, "256 kbps (Standard)"),
                (192, "192 kbps (Medium)"),
                (128, "128 kbps (Fast & Compact)"),
            ]
            for abr, q_label in mp3_tiers:
                est_bytes = int((abr * 1000 / 8) * duration) if duration else 0
                available_formats.append({
                    "format_id": f"mp3_{abr}",
                    "quality": q_label,
                    "height": 0,
                    "ext": "mp3",
                    "filesize": format_size(est_bytes) if est_bytes else f"{abr} kbps",
                    "url": best_audio.get('url'),
                    "has_audio": True,
                    "has_video": False,
                    "is_audio_only": True
                })

            # Original Master Audio track
            a_size = best_audio.get('filesize') or best_audio.get('filesize_approx') or (int(best_audio.get('tbr', 0) * 1024 / 8 * duration) if best_audio.get('tbr') and duration else 0)
            orig_abr = int(best_audio.get('abr') or 128)
            available_formats.append({
                "format_id": str(best_audio.get('format_id')),
                "quality": f"Master Audio Track ({orig_abr} kbps {best_audio.get('ext', 'm4a').upper()})",
                "height": 0,
                "ext": best_audio.get('ext') or 'm4a',
                "filesize": format_size(a_size),
                "url": best_audio.get('url'),
                "has_audio": True,
                "has_video": False,
                "is_audio_only": True
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
            return {"success": False, "error": "No direct media stream found for this link"}

        return {
            "success": True,
            "title": title,
            "thumbnail": thumbnail,
            "stream_url": stream_url,
            "download_url": stream_url,
            "size": format_size(size_bytes),
            "duration": duration,
            "source": f"ytdlp_{extractor_key or 'universal'}",
            "platform": "youtube" if is_youtube else "direct",
            "youtube_id": youtube_id,
            "transcript": transcript,
            "formats": available_formats
        }

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

    url = sys.argv[url_arg_idx].strip()
    if not url:
        print(json.dumps({"success": False, "error": "Empty URL"}))
        sys.exit(1)

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
                print(json.dumps(tb_result))
                return

    # Universal / Social Media / YouTube resolution via yt-dlp
    try:
        ytdlp_result = resolve_ytdlp(url)
        if is_transcript_only:
            if ytdlp_result.get('success') and ytdlp_result.get('transcript'):
                print(json.dumps({
                    "success": True,
                    "title": ytdlp_result.get('title'),
                    "youtube_id": ytdlp_result.get('youtube_id'),
                    "transcript": ytdlp_result.get('transcript')
                }))
            else:
                print(json.dumps({
                    "success": False,
                    "error": "No transcript available for this video",
                    "title": ytdlp_result.get('title'),
                    "youtube_id": ytdlp_result.get('youtube_id')
                }))
            return

        print(json.dumps(ytdlp_result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == '__main__':
    main()
