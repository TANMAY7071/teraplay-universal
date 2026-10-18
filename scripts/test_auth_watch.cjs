const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1536, height: 872 } });
  const page = await context.newPage();
  
  // 1. Authenticate as Guest first
  console.log('1. Authenticating as guest...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  const bypass = page.locator('button').filter({ hasText: 'Bypass Auth' });
  if (await bypass.count() > 0) {
    await bypass.first().click();
    await page.waitForTimeout(1000);
  }
  
  // 2. Go to watch S1 E1
  console.log('2. Navigating to BTTH S1 E1...');
  await page.goto('http://localhost:5173/watch/battle-through-the-heavens/episode-1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  console.log('Current URL on watch:', page.url());
  
  // Dismiss stateless mode banner if present
  const guestBtn = page.locator('button').filter({ hasText: 'STATELESS MODE' });
  if (await guestBtn.count() > 0) {
    await guestBtn.first().click().catch(() => {});
    await page.waitForTimeout(500);
  }
  
  // Check localStorage
  const saved = await page.evaluate(() => localStorage.getItem('donghua-continue-watching'));
  console.log('LocalStorage continue watching:', saved);
  
  // 3. Go to Home
  console.log('3. Navigating to Home...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/ASUS/.gemini/antigravity-ide/brain/72db0f9c-5a15-42e5-a0cb-c7f201a2c902/real_continue_home.png' });
  console.log('Captured real_continue_home.png');
  
  // 4. Test delete on Home
  const trash = page.locator('button[title="Remove from history"]');
  const count = await trash.count();
  console.log('Trash buttons on Home:', count);
  if (count > 0) {
    console.log('Clicking trash button on Home...');
    await trash.first().click({ force: true });
    await page.waitForTimeout(1000);
    const afterDelete = await page.evaluate(() => localStorage.getItem('donghua-continue-watching'));
    console.log('LocalStorage after delete:', afterDelete);
    await page.screenshot({ path: 'C:/Users/ASUS/.gemini/antigravity-ide/brain/72db0f9c-5a15-42e5-a0cb-c7f201a2c902/real_continue_home_deleted.png' });
    console.log('Captured real_continue_home_deleted.png');
  }
  
  await browser.close();
  console.log('Done test!');
})();
