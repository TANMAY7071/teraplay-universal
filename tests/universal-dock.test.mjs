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

// 3b. Social & Universal Platform URL normalization
console.log('[3b/5] Testing Social & Universal link normalization...');
// WhatsApp E2EE handling
const waTest1 = normalizeMediaUrl('https://wa.me/1234567890');
assert.equal(waTest1.isValid, false);
assert.equal(waTest1.platform, 'whatsapp');
assert.match(waTest1.error || '', /end-to-end encrypted/i);

const waTest2 = normalizeMediaUrl('https://chat.whatsapp.com/ABC123xyz');
assert.equal(waTest2.isValid, false);
assert.equal(waTest2.platform, 'whatsapp');
assert.match(waTest2.error || '', /end-to-end encrypted/i);

const waTest3 = normalizeMediaUrl('https://wa.link/abc123xyz');
assert.equal(waTest3.isValid, false);
assert.equal(waTest3.platform, 'whatsapp');
assert.match(waTest3.error || '', /end-to-end encrypted/i);

// Instagram (reels plural)
const igNorm = normalizeMediaUrl('https://www.instagram.com/reels/C1234567890/');
assert.equal(igNorm.isValid, true);
assert.equal(igNorm.platform, 'instagram');
assert.equal(igNorm.shareId, 'C1234567890');

// TikTok
const tiktokNorm = normalizeMediaUrl('https://www.tiktok.com/@creator/video/1234567890');
assert.equal(tiktokNorm.isValid, true);
assert.equal(tiktokNorm.platform, 'tiktok');

// Bilibili
const biliNorm = normalizeMediaUrl('https://www.bilibili.com/video/BV1xx411c7mD');
assert.equal(biliNorm.isValid, true);
assert.equal(biliNorm.platform, 'bilibili');

// Dailymotion
const dmNorm = normalizeMediaUrl('https://www.dailymotion.com/video/x8abcdef');
assert.equal(dmNorm.isValid, true);
assert.equal(dmNorm.platform, 'dailymotion');

// Snapchat
const snapNorm = normalizeMediaUrl('https://www.snapchat.com/spotlight/W7_EDHA1_somelink');
assert.equal(snapNorm.isValid, true);
assert.equal(snapNorm.platform, 'snapchat');

// LinkedIn
const liNorm = normalizeMediaUrl('https://www.linkedin.com/posts/activity-1234567890');
assert.equal(liNorm.isValid, true);
assert.equal(liNorm.platform, 'linkedin');

// Twitter / X
const xNorm = normalizeMediaUrl('https://x.com/user/status/1234567890');
assert.equal(xNorm.isValid, true);
assert.equal(xNorm.platform, 'twitter');

// Vimeo
const vimeoNorm = normalizeMediaUrl('https://vimeo.com/123456789');
assert.equal(vimeoNorm.isValid, true);
assert.equal(vimeoNorm.platform, 'vimeo');
assert.equal(vimeoNorm.shareId, '123456789');

// Twitch
const twitchNorm = normalizeMediaUrl('https://www.twitch.tv/videos/1234567890');
assert.equal(twitchNorm.isValid, true);
assert.equal(twitchNorm.platform, 'twitch');

// Universal link (any valid HTTP/HTTPS URL)
const uniNorm = normalizeMediaUrl('https://news.ycombinator.com/item?id=123');
assert.equal(uniNorm.isValid, true);
assert.equal(uniNorm.platform, 'universal');

console.log('  ✓ WhatsApp E2EE error, social platforms, and universal links verified');

// 4. Subtitle Time & Format Logic
console.log('[4/4] Testing Subtitle & SRT formatting...');
import {
  mapGroqResponseToTranscript as mapGroq,
  generateSrtContent as genSrtLib,
  generateTxtContent as genTxtLib,
  formatSrtTimestamp as fmtSrtLib,
  formatTime as fmtTimeLib,
} from '../src/lib/transcription.ts';

assert.equal(fmtTimeLib(45), '00:45');
assert.equal(fmtTimeLib(125), '02:05');
assert.equal(fmtTimeLib(3665), '01:01:05'); // 1 hour 1 minute 5 seconds
assert.equal(fmtTimeLib(7325), '02:02:05'); // 2 hours 2 minutes 5 seconds

assert.equal(fmtSrtLib(0), '00:00:00,000');
assert.equal(fmtSrtLib(1.5), '00:00:01,500');
assert.equal(fmtSrtLib(3665.123), '01:01:05,123');
assert.equal(fmtSrtLib(4.007), '00:00:04,007'); // Floating-point rounding precision test
assert.equal(fmtSrtLib(8.001), '00:00:08,001'); // Floating-point rounding precision test

const sampleCues = [
  { start: 1.0, duration: 2.0, text: 'First line\nwith newline' },
  { start: 2.5, duration: 3.0, text: 'Second line' },
];

const srtOut = genSrtLib(sampleCues);
assert.ok(srtOut.includes('1\n00:00:01,000 --> 00:00:02,500\nFirst line\nwith newline'));
assert.ok(srtOut.includes('2\n00:00:02,500 --> 00:00:05,500\nSecond line'));
assert.ok(srtOut.includes('\n\n2\n')); // Standard blank line between blocks
console.log('  ✓ Timestamp formats, boundary clipping, and SRT blocks verified');

// 5. Groq Whisper Transcription JSON to SubRip .SRT Verification
console.log('[5/5] Testing Groq Whisper transcription JSON to SubRip .SRT conversion...');

const mockGroqResponse = {
  task: 'transcribe',
  language: 'english',
  duration: 14.52,
  text: 'Welcome to TeraPlay Universal Media Dock. High-speed video streaming and SubRip SRT subtitles. Free forever.',
  segments: [
    {
      id: 0,
      seek: 0,
      start: 0.0,
      end: 3.25,
      text: 'Welcome to TeraPlay Universal Media Dock.',
      tokens: [50364, 7062, 284, 18918, 13, 50526],
      temperature: 0.0,
      avg_logprob: -0.12,
      compression_ratio: 1.1,
      no_speech_prob: 0.005,
    },
    {
      id: 1,
      seek: 325,
      start: 3.25,
      end: 8.75,
      text: 'High-speed video streaming and SubRip SRT subtitles.',
      tokens: [50526, 3500, 12, 1891, 24193, 13, 50801],
      temperature: 0.0,
      avg_logprob: -0.15,
      compression_ratio: 1.05,
      no_speech_prob: 0.01,
    },
    {
      id: 2,
      seek: 875,
      start: 8.75,
      end: 12.0,
      text: 'Free forever.',
      tokens: [50801, 8820, 4821, 13, 50964],
      temperature: 0.0,
      avg_logprob: -0.09,
      compression_ratio: 1.02,
      no_speech_prob: 0.002,
    },
  ],
};

const mappedData = mapGroq(mockGroqResponse);
assert.equal(mappedData.language, 'english');
assert.equal(mappedData.count, 3);
assert.equal(mappedData.items.length, 3);
assert.equal(mappedData.items[0].start, 0.0);
assert.equal(mappedData.items[0].duration, 3.25);
assert.equal(mappedData.items[0].text, 'Welcome to TeraPlay Universal Media Dock.');
assert.equal(mappedData.items[1].start, 3.25);
assert.equal(mappedData.items[1].duration, 5.5);
assert.equal(mappedData.items[2].start, 8.75);
assert.equal(mappedData.items[2].text, 'Free forever.');

const groqSrt = genSrtLib(mappedData.items);

// Verify SubRip specification compliance
// 1. Blocks separated by double newline
const srtBlocks = groqSrt.trim().split(/\r?\n\r?\n/);
assert.equal(srtBlocks.length, 3, 'Expected 3 subtitle cue blocks');

const srtTimeRegex = /^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/;

srtBlocks.forEach((block, idx) => {
  const lines = block.split(/\r?\n/);
  assert.equal(lines[0], String(idx + 1), `Expected cue block index ${idx + 1}`);
  assert.ok(srtTimeRegex.test(lines[1]), `Timestamp line "${lines[1]}" does not match SubRip spec HH:MM:SS,mmm --> HH:MM:SS,mmm`);
  assert.ok(lines[2]?.length > 0, `Text line in block ${idx + 1} must not be empty`);
});

assert.ok(srtBlocks[0].includes('1\n00:00:00,000 --> 00:00:03,250\nWelcome to TeraPlay Universal Media Dock.'));
assert.ok(srtBlocks[1].includes('2\n00:00:03,250 --> 00:00:08,750\nHigh-speed video streaming and SubRip SRT subtitles.'));
assert.ok(srtBlocks[2].includes('3\n00:00:08,750 --> 00:00:12,000\nFree forever.'));

// Hour+ formatting verification for long media
assert.equal(fmtSrtLib(3665.45), '01:01:05,450');
assert.equal(fmtSrtLib(7325.805), '02:02:05,805');

// Boundary & edge case formatting verification (NaN, undefined, negative, Infinity)
assert.equal(fmtSrtLib(NaN), '00:00:00,000');
assert.equal(fmtSrtLib(null), '00:00:00,000');
assert.equal(fmtSrtLib(-10), '00:00:00,000');
assert.equal(fmtSrtLib(Infinity), '00:00:00,000');
assert.equal(fmtSrtLib(-Infinity), '00:00:00,000');
assert.equal(fmtTimeLib(NaN), '00:00');
assert.equal(fmtTimeLib(undefined), '00:00');
assert.equal(fmtTimeLib(null), '00:00');
assert.equal(fmtTimeLib(-10), '00:00');
assert.equal(fmtTimeLib(Infinity), '00:00');
assert.equal(fmtTimeLib(-Infinity), '00:00');

// Non-array, null, and whitespace-only input robustness in SRT and TXT generators
assert.equal(genSrtLib({}), '');
assert.equal(genSrtLib(null), '');
assert.equal(genSrtLib(undefined), '');
assert.ok(genTxtLib(null, false, 'Title').includes('No transcript cues available'));
assert.ok(genTxtLib([{ text: '   ' }], false, 'Title').includes('No transcript cues available'));

// SubRip standard trailing newline compliance
assert.ok(srtOut.endsWith('\n'), 'SubRip output must end with trailing newline');

// Null/undefined/Infinity segment element handling in Groq response mapper
const nullSegmentGroq = {
  segments: [
    null,
    undefined,
    { start: 1.0, text: 'Valid segment' },
    { start: Infinity, duration: Infinity, end: Infinity, text: 'Infinite segment' },
  ],
};
const mappedNullSeg = mapGroq(nullSegmentGroq);
assert.equal(mappedNullSeg.count, 2);
assert.equal(mappedNullSeg.items[0].text, 'Valid segment');
assert.equal(mappedNullSeg.items[1].start, 0); // Normalized from Infinity
assert.equal(mappedNullSeg.items[1].duration, 2.5); // Normalized from Infinity

// Out-of-order cues and empty-text cue filtering in SRT generator
const chaoticCues = [
  { start: 10.0, duration: 2.0, text: 'Later event' },
  { start: 1.0, duration: 3.0, text: 'First event' },
  { start: 5.0, duration: 2.0, text: '   ' }, // Blank text, must be ignored
  { start: NaN, duration: 2.0, text: 'Invalid start time, normalized' },
];
const sanitizedSrt = genSrtLib(chaoticCues);
const sanitizedBlocks = sanitizedSrt.trim().split(/\r?\n\r?\n/);
assert.equal(sanitizedBlocks.length, 3, 'Expected 3 valid sanitized cue blocks');
assert.ok(sanitizedBlocks[0].includes('1\n00:00:00,000'));
assert.ok(sanitizedBlocks[1].includes('2\n00:00:01,000'));
assert.ok(sanitizedBlocks[2].includes('3\n00:00:10,000'));

// Text-only fallback mapping when segments are absent
const textOnlyGroq = {
  task: 'transcribe',
  language: 'en',
  duration: 6.0,
  text: 'Single sentence transcription.',
};
const mappedTextOnly = mapGroq(textOnlyGroq);
assert.equal(mappedTextOnly.count, 1);
assert.equal(mappedTextOnly.items[0].text, 'Single sentence transcription.');
assert.equal(mappedTextOnly.items[0].start, 0);

console.log('  ✓ Groq transcription JSON to SubRip .SRT format & timestamp specs verified');

// 6. Transcribe Endpoint & Fallback States Verification
console.log('[6/6] Testing Transcribe serverless endpoint & honest fallback states...');
import transcribeHandler from '../api/transcribe.ts';

const createMockRes = () => {
  const res = {
    headers: {},
    statusCode: 200,
    setHeader(k, v) { res.headers[k] = v; },
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
    end() { return res; },
  };
  return res;
};

// 6a. Missing parameters returns 400
const missingRes = createMockRes();
await transcribeHandler({ method: 'GET', query: {} }, missingRes);
assert.equal(missingRes.statusCode, 400);
assert.equal(missingRes.body.code, 'MISSING_PARAM');
assert.equal(missingRes.body.can_fallback_demo, true);

// 6a2. Empty 0-byte Buffer in POST body returns 400 MISSING_PARAM (does not crash or fetch empty string)
const emptyBufRes = createMockRes();
await transcribeHandler({ method: 'POST', body: Buffer.alloc(0) }, emptyBufRes);
assert.equal(emptyBufRes.statusCode, 400);
assert.equal(emptyBufRes.body.code, 'MISSING_PARAM');

// 6b. Demo mode returns fallback cues immediately (GET query and POST body)
const demoRes = createMockRes();
await transcribeHandler({ method: 'GET', query: { demo: 'true' } }, demoRes);
assert.equal(demoRes.statusCode, 200);
assert.equal(demoRes.body.success, true);
assert.equal(demoRes.body.is_demo, true);
assert.ok(demoRes.body.transcript?.items?.length > 0);

const demoPostRes = createMockRes();
await transcribeHandler({ method: 'POST', body: { demo: true } }, demoPostRes);
assert.equal(demoPostRes.statusCode, 200);
assert.equal(demoPostRes.body.success, true);
assert.equal(demoPostRes.body.is_demo, true);

// 6c. Missing GROQ_API_KEY surfaces honest state without crashing
const origKey = process.env.GROQ_API_KEY;
delete process.env.GROQ_API_KEY;
const missingKeyRes = createMockRes();
await transcribeHandler({ method: 'GET', query: { url: 'https://example.com/audio.mp3' } }, missingKeyRes);
assert.equal(missingKeyRes.statusCode, 500);
assert.equal(missingKeyRes.body.success, false);
assert.equal(missingKeyRes.body.code, 'MISSING_API_KEY');
assert.equal(missingKeyRes.body.can_fallback_demo, true);

// 6d. Direct audio buffer in POST body is accepted (does not return MISSING_PARAM)
const directAudioRes = createMockRes();
await transcribeHandler({
  method: 'POST',
  body: Buffer.from('mock_audio_header_bytes'),
  headers: { 'content-type': 'audio/mpeg' },
}, directAudioRes);
assert.equal(directAudioRes.statusCode, 500);
// Missing API key is reached because direct audio payload was accepted!
assert.equal(directAudioRes.body.code, 'MISSING_API_KEY');

// 6e. Unresolved social media webpage link returns honest STREAM_RESOLVE_FAILED
process.env.GROQ_API_KEY = 'gsk_test_mock_key';
const unresolvableRes = createMockRes();
await transcribeHandler({
  method: 'GET',
  query: { url: 'https://www.instagram.com/p/invalid_nonexistent_private_test/' },
}, unresolvableRes);
assert.ok(
  unresolvableRes.statusCode === 422 || unresolvableRes.statusCode === 502,
  `Expected 422 or 502, got ${unresolvableRes.statusCode}`
);
assert.equal(unresolvableRes.body.success, false);
assert.ok(
  unresolvableRes.body.code === 'STREAM_RESOLVE_FAILED' || unresolvableRes.body.code === 'MEDIA_FETCH_FAILED',
  `Expected STREAM_RESOLVE_FAILED or MEDIA_FETCH_FAILED, got ${unresolvableRes.body.code}`
);
assert.equal(unresolvableRes.body.can_fallback_demo, true);

// 6f. Instagram reels plural URL (/reels/) returns honest error without crashing
const igReelsRes = createMockRes();
await transcribeHandler({
  method: 'GET',
  query: { url: 'https://www.instagram.com/reels/DA7x03uJ6wW/' },
}, igReelsRes);
assert.ok(
  igReelsRes.statusCode === 422 || igReelsRes.statusCode === 502,
  `Expected 422 or 502, got ${igReelsRes.statusCode}`
);
assert.equal(igReelsRes.body.success, false);
assert.ok(
  igReelsRes.body.code === 'STREAM_RESOLVE_FAILED' || igReelsRes.body.code === 'MEDIA_FETCH_FAILED'
);

// 6g. Vimeo webpage URL returns honest STREAM_RESOLVE_FAILED without sending HTML to Groq
const vimeoRes = createMockRes();
await transcribeHandler({
  method: 'GET',
  query: { url: 'https://vimeo.com/123456789' },
}, vimeoRes);
assert.ok(
  vimeoRes.statusCode === 422 || vimeoRes.statusCode === 502,
  `Expected 422 or 502, got ${vimeoRes.statusCode}`
);
assert.equal(vimeoRes.body.success, false);
assert.ok(
  vimeoRes.body.code === 'STREAM_RESOLVE_FAILED' || vimeoRes.body.code === 'MEDIA_FETCH_FAILED'
);

// 6h. Non-URL target string cleanly returns STREAM_RESOLVE_FAILED without unhandled TypeError
const invalidUrlRes = createMockRes();
await transcribeHandler({
  method: 'GET',
  query: { url: 'not-a-valid-url-target' },
}, invalidUrlRes);
assert.equal(invalidUrlRes.statusCode, 422);
assert.equal(invalidUrlRes.body.success, false);
assert.equal(invalidUrlRes.body.code, 'STREAM_RESOLVE_FAILED');
assert.equal(invalidUrlRes.body.can_fallback_demo, true);

// 6h2. Internal targets are refused before the handler reaches the network.
// The url parameter is caller-controlled, so a request must not be able to
// steer the function at the cloud metadata service or a loopback port.
process.env.GROQ_API_KEY = 'gsk_test_mock_key';
for (const internalTarget of [
  'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
  'http://127.0.0.1:8080/secret',
  'http://localhost/secret',
  'http://10.0.0.5/internal',
]) {
  const ssrfRes = createMockRes();
  await transcribeHandler({ method: 'GET', query: { url: internalTarget } }, ssrfRes);
  assert.equal(ssrfRes.statusCode, 400, `Expected 400 for ${internalTarget}`);
  assert.equal(ssrfRes.body.code, 'INVALID_MEDIA_URL', `Expected INVALID_MEDIA_URL for ${internalTarget}`);
  assert.equal(ssrfRes.body.success, false);
}

// 6i. Direct audio buffer with WAV and WebM headers accepted as audio payloads
delete process.env.GROQ_API_KEY;
const wavAudioRes = createMockRes();
const wavBuffer = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVEfmt ')]);
await transcribeHandler({
  method: 'POST',
  body: wavBuffer,
  headers: { 'content-type': 'audio/wav' },
}, wavAudioRes);
assert.equal(wavAudioRes.statusCode, 500);
assert.equal(wavAudioRes.body.code, 'MISSING_API_KEY'); // Reached API key check because buffer accepted!

// 6j - 6n. Groq Whisper API HTTP responses & retry handling (Mocked upstream)
const origGlobalFetch = globalThis.fetch;
try {
  process.env.GROQ_API_KEY = 'gsk_mock_valid_test_key';

  // 6j. Groq 401 Invalid/Expired API Key
  globalThis.fetch = async (url) => {
    if (String(url).includes('api.groq.com')) {
      return {
        status: 401,
        ok: false,
        json: async () => ({ error: { message: 'Invalid API Key' } }),
        text: async () => JSON.stringify({ error: { message: 'Invalid API Key' } }),
      };
    }
    return origGlobalFetch(url);
  };
  const groq401Res = createMockRes();
  await transcribeHandler({
    method: 'POST',
    body: Buffer.from('mock_audio_bytes'),
    headers: { 'content-type': 'audio/mpeg' },
  }, groq401Res);
  assert.equal(groq401Res.statusCode, 500);
  assert.equal(groq401Res.body.code, 'INVALID_API_KEY');
  assert.equal(groq401Res.body.can_fallback_demo, true);

  // 6k. Groq 429 Rate Limit Exceeded
  globalThis.fetch = async (url) => {
    if (String(url).includes('api.groq.com')) {
      return {
        status: 429,
        ok: false,
        json: async () => ({ error: { message: 'Rate limit' } }),
        text: async () => JSON.stringify({ error: { message: 'Rate limit' } }),
      };
    }
    return origGlobalFetch(url);
  };
  const groq429Res = createMockRes();
  await transcribeHandler({
    method: 'POST',
    body: Buffer.from('mock_audio_bytes'),
    headers: { 'content-type': 'audio/mpeg' },
  }, groq429Res);
  assert.equal(groq429Res.statusCode, 429);
  assert.equal(groq429Res.body.code, 'RATE_LIMITED');
  assert.equal(groq429Res.body.can_fallback_demo, true);

  // 6l. Groq 200 with empty transcription returns NO_SPEECH_DETECTED
  globalThis.fetch = async (url) => {
    if (String(url).includes('api.groq.com')) {
      return {
        status: 200,
        ok: true,
        json: async () => ({ task: 'transcribe', language: 'en', duration: 3.0, text: '', segments: [] }),
      };
    }
    return origGlobalFetch(url);
  };
  const groqEmptyRes = createMockRes();
  await transcribeHandler({
    method: 'POST',
    body: Buffer.from('mock_audio_bytes'),
    headers: { 'content-type': 'audio/mpeg' },
  }, groqEmptyRes);
  assert.equal(groqEmptyRes.statusCode, 422);
  assert.equal(groqEmptyRes.body.code, 'NO_SPEECH_DETECTED');
  assert.equal(groqEmptyRes.body.can_fallback_demo, true);

  // 6m. Groq 200 with valid segments returns success & mapped transcript
  globalThis.fetch = async (url) => {
    if (String(url).includes('api.groq.com')) {
      return {
        status: 200,
        ok: true,
        json: async () => ({
          task: 'transcribe',
          language: 'en',
          duration: 5.2,
          text: 'Verified audio cue.',
          segments: [{ id: 0, start: 0.0, end: 5.2, text: 'Verified audio cue.' }],
        }),
      };
    }
    return origGlobalFetch(url);
  };
  const groqSuccessRes = createMockRes();
  await transcribeHandler({
    method: 'POST',
    body: Buffer.from('mock_audio_bytes'),
    headers: { 'content-type': 'audio/mpeg' },
  }, groqSuccessRes);
  assert.equal(groqSuccessRes.statusCode, 200);
  assert.equal(groqSuccessRes.body.success, true);
  assert.equal(groqSuccessRes.body.source, 'groq-whisper');
  assert.equal(groqSuccessRes.body.model, 'whisper-large-v3-turbo');
  assert.equal(groqSuccessRes.body.transcript.count, 1);
  assert.equal(groqSuccessRes.body.transcript.items[0].text, 'Verified audio cue.');

  // 6n. Transcription retry action when API key toggles from missing to valid
  delete process.env.GROQ_API_KEY;
  const initialRetryRes = createMockRes();
  await transcribeHandler({
    method: 'POST',
    body: Buffer.from('mock_audio_bytes'),
    headers: { 'content-type': 'audio/mpeg' },
  }, initialRetryRes);
  assert.equal(initialRetryRes.body.code, 'MISSING_API_KEY');

  // Key now configured, retry execution succeeds
  process.env.GROQ_API_KEY = 'gsk_mock_valid_test_key';
  const postRetryRes = createMockRes();
  await transcribeHandler({
    method: 'POST',
    body: Buffer.from('mock_audio_bytes'),
    headers: { 'content-type': 'audio/mpeg' },
  }, postRetryRes);
  assert.equal(postRetryRes.body.success, true);
  assert.equal(postRetryRes.body.transcript.count, 1);
} finally {
  globalThis.fetch = origGlobalFetch;
}

if (origKey) {
  process.env.GROQ_API_KEY = origKey;
} else {
  delete process.env.GROQ_API_KEY;
}

console.log('  ✓ Endpoint parameter validation, demo mode, and honest error states verified');

// 7. High-Res Audio+Video Muxing & Stream Download Verification
console.log('[7/7] Testing YouTube high-res muxed formats and stream-download endpoint...');
import resolveHandler from '../api/resolve.ts';
import streamDownloadHandler from '../api/stream-download.ts';

// 7a. Verify resolve handler returns high-res formats with audio_url and has_audio: true
const resolveRes = createMockRes();
await resolveHandler({
  method: 'GET',
  query: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
}, resolveRes);

assert.equal(resolveRes.statusCode, 200);
if (resolveRes.body.success) {
  assert.ok(Array.isArray(resolveRes.body.formats), 'formats must be an array');
  const f1080 = resolveRes.body.formats.find((f) => f.format_id === '1080p' || (f.height && f.height >= 1080));
  assert.ok(f1080, '1080p or higher format should be present');
  assert.equal(f1080.has_audio, true, '1080p format must have has_audio: true for merged output');
  assert.ok(f1080.download_url?.includes('audio_url='), '1080p download_url must contain audio_url query param');
} else {
  // In headless CI environments (GitHub Actions / Azure), YouTube blocks datacenter IPs with bot checks
  // or rate limits. Verify that the resolver handled it honestly without crashing.
  assert.ok(resolveRes.body.error, 'Resolver must provide an honest error message when YouTube blocks the runner');
}

// 7b. Stream download endpoint HEAD request with audio_url returns 200 with video/mp4 headers
// The host is a public IP literal on purpose: the handler refuses private and
// unresolvable targets, and a hostname would make the test depend on DNS.
const streamHeadRes = createMockRes();
await streamDownloadHandler({
  method: 'HEAD',
  query: {
    url: 'https://1.1.1.1/video.mp4',
    audio_url: 'https://8.8.8.8/audio.mp4',
    filename: 'rick_astley_1080p',
    ext: 'mp4',
  },
}, streamHeadRes);

assert.equal(streamHeadRes.statusCode, 200);
assert.equal(streamHeadRes.headers['Content-Type'], 'video/mp4');
assert.ok(streamHeadRes.headers['Content-Disposition']?.includes('rick_astley_1080p.mp4'));

// 7c. Missing URL returns 400
const streamMissingRes = createMockRes();
await streamDownloadHandler({ method: 'GET', query: {} }, streamMissingRes);
assert.equal(streamMissingRes.statusCode, 400);
assert.equal(streamMissingRes.body.success, false);

// 7d. OPTIONS request returns 200 for CORS preflight
const streamOptionsRes = createMockRes();
await streamDownloadHandler({ method: 'OPTIONS' }, streamOptionsRes);
assert.equal(streamOptionsRes.statusCode, 200);

console.log('  ✓ High-res video formats, audio_url muxing parameters, CORS, and stream-download headers verified');

console.log('ALL UNIVERSAL DOCK VERIFICATIONS PASSED SUCCESSFULLY!');
