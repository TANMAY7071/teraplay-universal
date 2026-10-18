import assert from 'node:assert/strict';
import { extractYouTubeVideoId, normalizeMediaUrl, isTeraBoxUrl, extractTeraBoxShareId } from '../src/lib/urlNormalizer.ts';

console.log('--- RUNNING UNIVERSAL DOCK VERIFICATION SUITE ---');

// 1. YouTube Video ID & Normalization
console.log('[1/4] Testing YouTube link normalization...');
const ytTests = [
  { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expectedId: 'dQw4w9WgXcQ' },
  { url: 'https://youtu.be/dQw4w9WgXcQ', expectedId: 'dQw4w9WgXcQ' },
  { url: 'https://www.youtube.com/shorts/5O3w2wMvB3E', expectedId: '5O3w2wMvB3E' },
  { url: 'https://www.youtube.com/live/dQw4w9WgXcQ', expectedId: 'dQw4w9WgXcQ' },
  { url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', expectedId: 'dQw4w9WgXcQ' },
  { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', expectedId: 'dQw4w9WgXcQ' },
  { url: 'https://www.youtube.com/watch?feature=shared&v=dQw4w9WgXcQ', expectedId: 'dQw4w9WgXcQ' },
  { url: 'dQw4w9WgXcQ', expectedId: 'dQw4w9WgXcQ' },
];

for (const t of ytTests) {
  const id = extractYouTubeVideoId(t.url);
  assert.equal(id, t.expectedId, `Failed to extract ID from ${t.url}`);
  const norm = normalizeMediaUrl(t.url);
  assert.equal(norm.isValid, true, `Expected valid for ${t.url}`);
  assert.equal(norm.platform, 'youtube');
  assert.equal(norm.shareId, t.expectedId);
}

// Invalid YouTube URL (missing ID)
const invalidYt = normalizeMediaUrl('https://www.youtube.com/');
assert.equal(invalidYt.isValid, false, 'Expected invalid for bare youtube.com domain');
assert.match(invalidYt.error || '', /11-character video ID/i);
console.log('  ✓ YouTube link patterns and edge cases passed');

// 2. TeraBox & Mirrors Normalization
console.log('[2/4] Testing TeraBox mirror normalization...');
const tbTests = [
  'https://terabox.com/s/1abcdef12345678',
  'https://www.1024tera.com/sharing/link?surl=abcdef12345678',
  'https://nephobox.com/s/1abcdef12345678',
  'https://freeterabox.com/s/1abcdef12345678',
  'https://1024terabox.com/s/1abcdef12345678',
];

for (const url of tbTests) {
  assert.equal(isTeraBoxUrl(url), true, `Expected isTeraBoxUrl to be true for ${url}`);
  const norm = normalizeMediaUrl(url);
  assert.equal(norm.isValid, true);
  assert.equal(norm.platform, 'terabox');
  assert.ok(norm.shareId?.length && norm.shareId.length >= 8);
}
console.log('  ✓ TeraBox mirrors and share IDs passed');

// 3. Direct Video URLs
console.log('[3/4] Testing Direct Video streams...');
const directNorm = normalizeMediaUrl('https://example.com/stream/video.mp4');
assert.equal(directNorm.isValid, true);
assert.equal(directNorm.platform, 'direct');

const hlsNorm = normalizeMediaUrl('https://example.com/live/playlist.m3u8?token=xyz');
assert.equal(hlsNorm.isValid, true);
assert.equal(hlsNorm.platform, 'direct');
console.log('  ✓ Direct MP4 and M3U8 detection passed');

// 4. Subtitle Time & Format Logic
console.log('[4/4] Testing Subtitle & SRT formatting...');

function formatTime(sec) {
  const totalSec = Math.max(0, Math.floor(sec));
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  const pad = (n, z = 2) => String(n).padStart(z, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

function formatSrtTimestamp(seconds) {
  const totalMs = Math.max(0, Math.floor(seconds * 1000));
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  const pad = (n, z = 2) => String(n).padStart(z, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

function generateSrtContent(items) {
  return items
    .map((item, index) => {
      const nextItem = items[index + 1];
      const startStr = formatSrtTimestamp(item.start);
      const dur = item.duration && item.duration > 0 ? item.duration : 2.5;
      const rawEnd = item.start + dur;
      const endVal = nextItem && nextItem.start > item.start ? Math.min(rawEnd, nextItem.start) : rawEnd;
      const endStr = formatSrtTimestamp(endVal);
      const cleanText = item.text.replace(/\r?\n+/g, '\n').trim();
      return `${index + 1}\n${startStr} --> ${endStr}\n${cleanText}`;
    })
    .join('\n\n');
}

assert.equal(formatTime(45), '00:45');
assert.equal(formatTime(125), '02:05');
assert.equal(formatTime(3665), '01:01:05'); // 1 hour 1 minute 5 seconds
assert.equal(formatTime(7325), '02:02:05'); // 2 hours 2 minutes 5 seconds

assert.equal(formatSrtTimestamp(0), '00:00:00,000');
assert.equal(formatSrtTimestamp(1.5), '00:00:01,500');
assert.equal(formatSrtTimestamp(3665.123), '01:01:05,123');

const sampleCues = [
  { start: 1.0, duration: 2.0, text: 'First line\nwith newline' },
  { start: 2.5, duration: 3.0, text: 'Second line' },
];

const srtOut = generateSrtContent(sampleCues);
assert.ok(srtOut.includes('1\n00:00:01,000 --> 00:00:02,500\nFirst line\nwith newline'));
assert.ok(srtOut.includes('2\n00:00:02,500 --> 00:00:05,500\nSecond line'));
assert.ok(srtOut.includes('\n\n2\n')); // Standard blank line between blocks
console.log('  ✓ Timestamp formats, boundary clipping, and SRT blocks verified');

console.log('ALL UNIVERSAL DOCK VERIFICATIONS PASSED SUCCESSFULLY!');
