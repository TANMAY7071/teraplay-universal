import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

async function main() {
  const rawMock = JSON.parse(fs.readFileSync('scripts/resolved_formats.json', 'utf8'));

  const mockData = {
    ...rawMock,
    video_formats: rawMock.formats.filter((f) => !f.is_audio_only),
    audio_formats: [
      {
        format_id: 'mp3_320',
        quality: 'MP3 (320 kbps)',
        ext: 'mp3',
        filesize: '8.4 MB',
        url: 'https://example.com/audio.mp3',
        is_audio_only: true,
        has_audio: true,
        has_video: false,
      },
    ],
  };

  const browser = await chromium.launch({ headless: true });
  // Use a wide 16:11 viewport ratio: 1280 x 880 (ratio 1.4545 = 16/11)
  const context = await browser.newContext({
    viewport: { width: 1280, height: 880 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.route('**/api/resolve*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockData),
    });
  });

  await page.route('**/api/transcript*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        transcript: {
          items: [{ start: 0, text: "We're no strangers to love" }],
        },
      }),
    });
  });

  const outDir = path.resolve('public/assets/how-it-works');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // ==========================================
  // Step 1: Input with YouTube link in full hero
  // ==========================================
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const input = await page.locator('.tp-url-input');
  await input.click();
  await input.pressSequentially('https://www.youtube.com/watch?v=dQw4w9WgXcQ', { delay: 10 });
  await page.waitForTimeout(400);

  // Take 16:11 full hero screenshot
  await page.screenshot({
    path: path.join(outDir, 'step-01-paste.jpg'),
    type: 'jpeg',
    quality: 95,
    clip: {
      x: 0,
      y: 0,
      width: 1280,
      height: 880,
    },
  });
  console.log('✓ Captured step-01-paste.jpg (full hero frame 1280x880)');

  // ==========================================
  // Step 2: Resolving button state in full hero
  // ==========================================
  await page.evaluate(() => {
    const btn = document.querySelector('.tp-btn-launch');
    if (btn) {
      btn.innerHTML = `
        <svg class="w-4 h-4 animate-spin shrink-0 inline-block mr-1.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
          <path d="M21 3v5h-5"></path>
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
          <path d="M8 16H3v5"></path>
        </svg>
        <span>Resolving...</span>
      `;
      btn.style.opacity = '0.9';
    }
  });
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.join(outDir, 'step-02-analyzing.jpg'),
    type: 'jpeg',
    quality: 95,
    clip: {
      x: 0,
      y: 0,
      width: 1280,
      height: 880,
    },
  });
  console.log('✓ Captured step-02-analyzing.jpg (full hero frame 1280x880)');

  // ==========================================
  // Step 3: Top section with player and dock
  // ==========================================
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  const freshInput = await page.locator('.tp-url-input');
  await freshInput.click();
  await freshInput.pressSequentially('https://www.youtube.com/watch?v=dQw4w9WgXcQ', { delay: 10 });
  await page.waitForTimeout(200);
  await freshInput.press('Enter');

  const playerViewport = await page.waitForSelector('#player-viewport', { timeout: 10000 });
  await page.waitForTimeout(1500);

  const clipBox = await playerViewport.boundingBox();
  if (clipBox) {
    // Center a 16:11 frame around the player viewport
    const captureWidth = Math.min(clipBox.width + 32, 1280);
    const captureHeight = Math.round(captureWidth * (11 / 16));
    const startY = Math.max(0, clipBox.y - 16);

    await page.screenshot({
      path: path.join(outDir, 'step-03-results.jpg'),
      type: 'jpeg',
      quality: 95,
      clip: {
        x: Math.max(0, clipBox.x - 16),
        y: startY,
        width: captureWidth,
        height: captureHeight,
      },
    });
    console.log(`✓ Captured step-03-results.jpg (${captureWidth}x${captureHeight})`);
  }

  // ==========================================
  // Step 4: Clean Full Quality Downloads Table
  // ==========================================
  const downloadsDir = await page.waitForSelector('#downloads-directory', { timeout: 10000 });
  if (downloadsDir) {
    await page.evaluate(() => {
      const el = document.getElementById('downloads-directory');
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top - 20);
      }
    });
    await page.waitForTimeout(800);

    const dBox = await downloadsDir.boundingBox();
    if (dBox) {
      const captureWidth = Math.min(dBox.width + 32, 1280);
      const captureHeight = Math.round(captureWidth * (11 / 16));
      const startY = Math.max(0, dBox.y - 12);

      await page.screenshot({
        path: path.join(outDir, 'step-04-save.jpg'),
        type: 'jpeg',
        quality: 95,
        clip: {
          x: Math.max(0, dBox.x - 16),
          y: startY,
          width: captureWidth,
          height: captureHeight,
        },
      });
      console.log(`✓ Captured step-04-save.jpg (${captureWidth}x${captureHeight})`);
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
