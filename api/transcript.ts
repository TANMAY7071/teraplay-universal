import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

interface TranscriptItem {
  start: number;
  duration: number;
  text: string;
}

interface TranscriptResponse {
  success: boolean;
  title?: string;
  youtube_id?: string;
  language?: string;
  transcript?: {
    language: string;
    items: TranscriptItem[];
    count: number;
  } | null;
  error?: string;
}

function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const clean = input.trim();
  const regExp = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = clean.match(regExp);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  return null;
}

function runLocalTranscriptExtractor(targetUrl: string): Promise<TranscriptResponse | null> {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const venvPython = isWin
      ? path.resolve(process.cwd(), '.venv', 'Scripts', 'python.exe')
      : path.resolve(process.cwd(), '.venv', 'bin', 'python');
    const fallbackPython = isWin ? 'python' : 'python3';
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'extractor.py');
    const pythonBin = fs.existsSync(venvPython) ? venvPython : fallbackPython;

    execFile(pythonBin, [scriptPath, '--transcript', targetUrl], { timeout: 15000 }, (error, stdout) => {
      if (error || !stdout) {
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch {
        resolve(null);
      }
    });
  });
}

async function runRemoteTranscriptExtractor(targetUrl: string): Promise<TranscriptResponse | null> {
  const remoteEndpoint = process.env.PYTHON_RESOLVER_URL || process.env.RESOLVER_SERVICE_URL;
  if (!remoteEndpoint) return null;

  try {
    const base = remoteEndpoint.replace(/\/$/, '');
    const res = await fetch(`${base}/transcript?url=${encodeURIComponent(targetUrl)}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      return (await res.json()) as TranscriptResponse;
    }
  } catch (err) {
    console.warn('[RemoteTranscript] Fetch failed:', err);
  }
  return null;
}

// Built-in sample transcript for demo & offline mode
const SAMPLE_TRANSCRIPT: TranscriptItem[] = [
  { start: 0.0, duration: 2.5, text: "Welcome to TeraPlay Universal Media & Creator Dock." },
  { start: 2.6, duration: 3.2, text: "Extract transcripts, download 4K thumbnails, and stream high-speed video." },
  { start: 6.0, duration: 3.0, text: "One-click copy, .TXT export, and full SubRip .SRT download supported." },
  { start: 9.2, duration: 4.1, text: "Bypass mobile app restrictions and download uncapped MP4 media directly." },
  { start: 13.5, duration: 3.8, text: "Powered by edge CDN acceleration and instant browser parsing." }
];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url, id, sample, demo } = req.query || {};
  const queryTarget = (url || id || '') as string;

  if (!queryTarget) {
    res.status(400).json({
      success: false,
      error: 'Missing URL or YouTube Video ID parameter. Usage: /api/transcript?id=dQw4w9WgXcQ',
    });
    return;
  }

  const ytId = extractYouTubeId(queryTarget) || queryTarget;

  // 1. Check remote microservice if configured
  const remoteResult = await runRemoteTranscriptExtractor(ytId);
  if (remoteResult && remoteResult.success && remoteResult.transcript?.items?.length) {
    res.status(200).json(remoteResult);
    return;
  }

  // 2. Try local python extractor
  const result = await runLocalTranscriptExtractor(ytId);
  if (result && result.success && result.transcript?.items?.length) {
    res.status(200).json(result);
    return;
  }

  // If explicit demo requested, provide sample transcript
  if (sample === '1' || demo === 'true') {
    res.status(200).json({
      success: true,
      title: result?.title || `YouTube Video [${ytId}]`,
      youtube_id: ytId,
      transcript: {
        language: 'en',
        items: SAMPLE_TRANSCRIPT,
        count: SAMPLE_TRANSCRIPT.length
      },
      is_fallback: true
    });
    return;
  }

  // Honest response when captions are unavailable
  res.status(200).json({
    success: false,
    error: 'No captions or transcript tracks found for this video.',
    title: result?.title || `YouTube Video [${ytId}]`,
    youtube_id: ytId,
    transcript: null
  });
}
