export interface TranscriptItem {
  start: number;
  duration: number;
  text: string;
}

export interface TranscriptData {
  language: string;
  items: TranscriptItem[];
  count: number;
}

// Built-in sample transcript for instant demonstration, honest offline fallback, and tests
export const FALLBACK_DEMO_TRANSCRIPT: TranscriptItem[] = [
  { start: 1.36, duration: 1.68, text: "[Music intro]" },
  { start: 18.64, duration: 3.24, text: "We're no strangers to love" },
  { start: 22.64, duration: 4.32, text: "You know the rules and so do I" },
  { start: 27.04, duration: 4.0, text: "A full commitment's what I'm thinking of" },
  { start: 31.12, duration: 3.96, text: "You wouldn't get this from any other guy" },
  { start: 35.16, duration: 4.36, text: "I just wanna tell you how I'm feeling" },
  { start: 40.52, duration: 2.4, text: "Gotta make you understand" },
  { start: 43.0, duration: 2.12, text: "Never gonna give you up" },
  { start: 45.2, duration: 1.88, text: "Never gonna let you down" },
  { start: 47.32, duration: 3.8, text: "Never gonna run around and desert you" },
  { start: 51.48, duration: 2.0, text: "Never gonna make you cry" },
  { start: 53.6, duration: 1.92, text: "Never gonna say goodbye" },
  { start: 55.72, duration: 3.64, text: "Never gonna tell a lie and hurt you" },
];

/**
 * Format seconds into mm:ss or hh:mm:ss for UI badge presentation
 */
export function formatTime(sec?: number | null): string {
  if (typeof sec !== 'number' || isNaN(sec) || !isFinite(sec) || sec <= 0) {
    return '00:00';
  }
  const totalSec = Math.floor(sec);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

/**
 * Format seconds to strictly compliant SubRip SRT timestamp: HH:MM:SS,mmm
 */
export function formatSrtTimestamp(seconds?: number | null): string {
  if (typeof seconds !== 'number' || isNaN(seconds) || !isFinite(seconds) || seconds <= 0) {
    return '00:00:00,000';
  }
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

/**
 * Generates SubRip (.SRT) formatted file content from transcript items.
 * Strictly adheres to SubRip specification:
 * - 1-based sequential cue numbers
 * - Timestamps: HH:MM:SS,mmm --> HH:MM:SS,mmm
 * - Ascending chronological ordering
 * - Non-empty clean text formatting
 * - Blank line separation between blocks
 */
export function generateSrtContent(items?: TranscriptItem[] | null): string {
  if (!Array.isArray(items) || items.length === 0) return '';
  const validItems = items
    .filter((item): item is TranscriptItem => Boolean(item && typeof item.text === 'string' && item.text.trim().length > 0))
    .map((item) => {
      const start = typeof item.start === 'number' && !isNaN(item.start) && isFinite(item.start) && item.start >= 0 ? item.start : 0;
      const duration = typeof item.duration === 'number' && !isNaN(item.duration) && isFinite(item.duration) && item.duration > 0 ? item.duration : 2.5;
      return {
        start,
        duration,
        text: item.text.replace(/\r?\n+/g, '\n').trim(),
      };
    })
    .sort((a, b) => a.start - b.start);

  if (validItems.length === 0) return '';

  return validItems
    .map((item, index) => {
      const nextItem = validItems[index + 1];
      const startStr = formatSrtTimestamp(item.start);
      const rawEnd = item.start + item.duration;
      const endVal = nextItem && nextItem.start > item.start ? Math.min(rawEnd, nextItem.start) : rawEnd;
      const endStr = formatSrtTimestamp(Math.max(item.start + 0.1, endVal));
      return `${index + 1}\n${startStr} --> ${endStr}\n${item.text}`;
    })
    .join('\n\n');
}

/**
 * Generates plain text (.TXT) transcript with optional timestamps
 */
export function generateTxtContent(items?: TranscriptItem[] | null, withTimestamps?: boolean, title?: string): string {
  const safeTitle = title || 'Media';
  const header = `Transcript: ${safeTitle}\nExported from TeraPlay Universal Dock\n${'='.repeat(40)}\n\n`;
  if (!Array.isArray(items) || items.length === 0) {
    return header + '(No transcript cues available)';
  }
  const body = items
    .filter((item): item is TranscriptItem => Boolean(item && typeof item.text === 'string' && item.text.trim().length > 0))
    .map((item) => {
      const text = item.text.replace(/\r?\n+/g, ' ').trim();
      if (withTimestamps) {
        return `[${formatTime(item.start)}] ${text}`;
      }
      return text;
    })
    .join('\n');
  return header + body;
}

export interface GroqSegment {
  id?: number;
  seek?: number;
  start?: number;
  end?: number;
  duration?: number;
  text?: string;
  tokens?: number[];
  temperature?: number;
  avg_logprob?: number;
  compression_ratio?: number;
  no_speech_prob?: number;
}

export interface GroqVerboseJsonResponse {
  task?: string;
  language?: string;
  duration?: number;
  text?: string;
  segments?: GroqSegment[];
  words?: Array<{ word: string; start: number; end: number }>;
}

/**
 * Maps Groq Whisper verbose_json API response (model whisper-large-v3-turbo)
 * into standard TranscriptData structure: { language, count, items: [{ start, duration, text }] }
 */
export function mapGroqResponseToTranscript(
  groqData?: GroqVerboseJsonResponse | Record<string, unknown> | null
): TranscriptData {
  if (!groqData) {
    return { language: 'en', count: 0, items: [] };
  }

  const rawSegments: GroqSegment[] = Array.isArray(groqData.segments)
    ? (groqData.segments as GroqSegment[]).filter((seg): seg is GroqSegment => Boolean(seg && typeof seg === 'object'))
    : [];
  let items: TranscriptItem[] = [];

  if (rawSegments.length > 0) {
    items = rawSegments
      .map((seg: GroqSegment) => {
        const start = typeof seg.start === 'number' && !isNaN(seg.start) ? Math.max(0, seg.start) : 0;
        let duration = 2.5;
        if (typeof seg.duration === 'number' && !isNaN(seg.duration) && seg.duration > 0) {
          duration = seg.duration;
        } else if (typeof seg.end === 'number' && !isNaN(seg.end) && seg.end > start) {
          duration = Number((seg.end - start).toFixed(3));
        }
        const text = String(seg.text || '')
          .replace(/\r?\n+/g, ' ')
          .trim();
        return {
          start: Number(start.toFixed(3)),
          duration: Number(duration.toFixed(3)),
          text,
        };
      })
      .filter((item) => item.text.length > 0);
  } else if (typeof groqData.text === 'string' && groqData.text.trim()) {
    const rawText = groqData.text.trim();
    const sentences = rawText
      .split(/(?<=[.?!])\s+/)
      .map((s: string) => s.trim())
      .filter(Boolean);

    if (sentences.length > 1) {
      const totalDur =
        typeof groqData.duration === 'number' && groqData.duration > 0
          ? groqData.duration
          : sentences.length * 3;
      const avgDuration = Number((totalDur / sentences.length).toFixed(3));
      items = sentences.map((sent: string, idx: number) => ({
        start: Number((idx * avgDuration).toFixed(3)),
        duration: avgDuration,
        text: sent,
      }));
    } else {
      items = [
        {
          start: 0,
          duration:
            typeof groqData.duration === 'number' && groqData.duration > 0
              ? Number(groqData.duration.toFixed(3))
              : 3.0,
          text: rawText,
        },
      ];
    }
  }

  return {
    language: groqData.language || 'en',
    count: items.length,
    items,
  };
}
