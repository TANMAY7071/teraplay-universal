import sys
import os
import json
import tempfile
import yt_dlp
import shutil

def run_worker():
    if len(sys.argv) < 5:
        print(json.dumps({"success": False, "error": "Insufficient arguments"}))
        sys.exit(1)

    url = sys.argv[1]
    fmt = sys.argv[2]
    out_dir = sys.argv[3]
    ext = sys.argv[4].lower().replace(".", "")

    os.makedirs(out_dir, exist_ok=True)
    outtmpl = os.path.join(out_dir, "%(id)s_%(format_id)s.%(ext)s")

    ffmpeg_bin = None
    try:
        import imageio_ffmpeg
        ffmpeg_bin = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        ffmpeg_bin = shutil.which("ffmpeg")

    ydl_opts = {
        "format": fmt,
        "outtmpl": outtmpl,
        "concurrent_fragment_downloads": 16,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "windowsfilenames": True,
    }

    if ffmpeg_bin and os.path.exists(ffmpeg_bin):
        ydl_opts["ffmpeg_location"] = ffmpeg_bin

    if ext == "mp3":
        ydl_opts["postprocessors"] = [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "320",
        }]
    else:
        ydl_opts["merge_output_format"] = ext or "mp4"

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            prep_fn = ydl.prepare_filename(info)

        root, _ = os.path.splitext(prep_fn)
        candidate_exts = [f".{ext}", ".mp4", ".mkv", ".webm", ".mp3", ".m4a"]
        resolved_file = None

        if os.path.exists(prep_fn):
            resolved_file = prep_fn
        else:
            for ce in candidate_exts:
                target = root + ce
                if os.path.exists(target):
                    resolved_file = target
                    break

        if not resolved_file:
            # Fallback search in out_dir matching video ID
            vid_id = info.get("id") or ""
            if vid_id:
                for fname in os.listdir(out_dir):
                    if vid_id in fname and any(fname.endswith(ce) for ce in candidate_exts):
                        resolved_file = os.path.join(out_dir, fname)
                        break

        if resolved_file and os.path.exists(resolved_file):
            size_bytes = os.path.getsize(resolved_file)
            res_payload = {
                "success": True,
                "file_path": os.path.abspath(resolved_file),
                "size_bytes": size_bytes,
                "title": info.get("title") or "video",
                "ext": ext
            }
            print("__TERA_DATA__" + json.dumps(res_payload) + "__TERA_DATA__")
            sys.exit(0)
        else:
            err_payload = {"success": False, "error": "Merged output file not found on disk"}
            print("__TERA_DATA__" + json.dumps(err_payload) + "__TERA_DATA__")
            sys.exit(1)

    except Exception as e:
        err_payload = {"success": False, "error": str(e)}
        print("__TERA_DATA__" + json.dumps(err_payload) + "__TERA_DATA__")
        sys.exit(1)

if __name__ == "__main__":
    run_worker()
