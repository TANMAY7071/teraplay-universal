const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1536, height: 872 } });
  const page = await context.newPage();
  
  console.log('1. Navigating to watch page S1 E1...');
  await page.goto('http://localhost:5173/watch/battle-through-the-heavens/episode-1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  
  // Dismiss stateless mode banner if present
  const guestBtn = page.locator('button').filter({ hasText: 'STATELESS MODE' });
  if (await guestBtn.count() > 0) {
    console.log('Dismissing consent banner...');
    await guestBtn.first().click().catch(() => {});
    await page.waitForTimeout(500);
  }
  
  // Check localStorage on watch page
  const saved = await page.evaluate(() => localStorage.getItem('donghua-continue-watching'));
  console.log('LocalStorage continue watching after visiting S1 E1:', saved);
  
  // Go to Home
  console.log('2. Navigating to Home page...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Scroll down to see Continue Watching row
  await page.evaluate(() => window.scrollBy(0, 420));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/ASUS/.gemini/antigravity-ide/brain/72db0f9c-5a15-42e5-a0cb-c7f201a2c902/test_continue_home_playing.png' });
  console.log('Captured test_continue_home_playing.png');
  
  // Test deleting from Home page using the trash button!
  const trashBtn = page.locator('button[title="Remove from history"], button[aria-label="Remove from history"]');
  console.log('Trash buttons found on Home page:', await trashBtn.count());
  if (await trashBtn.count() > 0) {
    console.log('Hovering over first continue watching card to reveal delete button...');
    const card = page.locator('.aspect-video').first();
    await card.hover().catch(() => {});
    await page.waitForTimeout(500);
    console.log('Clicking delete button on Home page...');
    await trashBtn.first().click().catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:/Users/ASUS/.gemini/antigravity-ide/brain/72db0f9c-5a15-42e5-a0cb-c7f201a2c902/test_continue_home_after_delete.png' });
    console.log('Captured test_continue_home_after_delete.png');
  }
  
  // Re-visit watch page S1 E1 so it adds it back to continue watching
  console.log('3. Re-visiting watch page S1 E1...');
  await page.goto('http://localhost:5173/watch/battle-through-the-heavens/episode-1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  
  // Go to Library
  console.log('4. Navigating to Library page...');
  await page.goto('http://localhost:5173/library?tab=continue-watching', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const bypassBtn = page.locator('button').filter({ hasText: 'Bypass Auth' });
  if (await bypassBtn.count() > 0) {
    console.log('Clicking Bypass Auth on library page...');
    await bypassBtn.first().click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: 'C:/Users/ASUS/.gemini/antigravity-ide/brain/72db0f9c-5a15-42e5-a0cb-c7f201a2c902/test_continue_library_playing.png' });
  console.log('Captured test_continue_library_playing.png');
  
  await browser.close();
  console.log('Full test completed successfully!');
})();
