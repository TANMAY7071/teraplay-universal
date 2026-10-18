const { chromium } = require('playwright');

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1536, height: 900 } });
  
  // 1. Home Trending
  const page1 = await context.newPage();
  await page1.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page1.waitForTimeout(1000);
  await page1.evaluate(() => window.scrollTo(0, 1100));
  await page1.waitForTimeout(1000);
  await page1.screenshot({ path: 'C:/Users/ASUS/.gemini/antigravity-ide/brain/72db0f9c-5a15-42e5-a0cb-c7f201a2c902/home_trending_synced.png' });

  // 2. Login as guest first
  const page2 = await context.newPage();
  await page2.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page2.waitForTimeout(500);
  const bypassBtn = await page2.$('text="Bypass Auth (Local Guest Mode)"');
  if (bypassBtn) {
    await bypassBtn.click();
    await page2.waitForTimeout(1000);
  }

  // 3. Watch Page Episode List
  await page2.goto('http://localhost:5173/watch/battle-through-the-heavens/episode-1');
  await page2.waitForSelector('text=OVERVIEW', { state: 'attached', timeout: 15000 });
  await page2.waitForTimeout(4000);
  await page2.evaluate(() => window.scrollTo(0, 450));
  await page2.waitForTimeout(1000);
  await page2.screenshot({ path: 'C:/Users/ASUS/.gemini/antigravity-ide/brain/72db0f9c-5a15-42e5-a0cb-c7f201a2c902/watch_episodes_synced.png' });

  await browser.close();
  console.log('Screenshots captured successfully!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
