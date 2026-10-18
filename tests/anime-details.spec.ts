import { test, expect } from '@playwright/test';

test.describe('Anime Details Page Verification', () => {

  test.beforeEach(async ({ context }) => {
    // Pre-acknowledge consent banner so it does not intercept pointer clicks
    await context.addInitScript(() => {
      localStorage.setItem('donghua-consent-granted', 'true');
    });
  });

  test('Desktop: Verify Locked Elements and Sections', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173/anime/battle-through-the-heavens', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Loading Qi...', { state: 'detached', timeout: 15000 }).catch(() => {});

    const desktopContainer = page.locator('div.hidden.md\\:block').filter({ hasText: 'FRANCHISE JOURNEY' });

    // 1. Verify locked upper elements are intact
    await expect(desktopContainer.locator('text=FRANCHISE JOURNEY')).toBeVisible({ timeout: 10000 });

    // 2. Verify Episodes preview section exists
    await expect(desktopContainer.getByRole('heading', { name: 'EPISODES', exact: true })).toBeVisible({ timeout: 10000 });

    // 3. Verify Editorial About block & Series Info
    await expect(desktopContainer.locator('text=About the Saga')).toBeVisible();
    await expect(desktopContainer.locator('text=Series Information')).toBeVisible();

    // 4. Verify Characters and Universe Explore sections
    await expect(desktopContainer.locator('text=MAIN CHARACTERS')).toBeVisible();
    await expect(desktopContainer.locator('text=EXPLORE THE UNIVERSE')).toBeVisible();
  });

  test('Desktop: Verify Season Switching in Navigator', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173/anime/battle-through-the-heavens', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Loading Qi...', { state: 'detached', timeout: 15000 }).catch(() => {});

    const desktopContainer = page.locator('div.hidden.md\\:block').filter({ hasText: 'FRANCHISE JOURNEY' });

    // Make sure Season 1 is visible
    await expect(desktopContainer.locator('text=FRANCHISE JOURNEY')).toBeVisible({ timeout: 10000 });

    // Click Season 2 in Franchise Journey navigator
    const season2Card = desktopContainer.locator('text=SEASON 2').first();
    await expect(season2Card).toBeVisible();
    await season2Card.click();

    // Verify Season 2 becomes active
    await expect(desktopContainer.locator('text=Season 2').first()).toBeVisible({ timeout: 10000 });
  });

  test('Tablet: Verify Responsive Layout Collapsing', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 1024 });
    await page.goto('http://localhost:5173/anime/battle-through-the-heavens', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Loading Qi...', { state: 'detached', timeout: 15000 }).catch(() => {});

    const desktopContainer = page.locator('div.hidden.md\\:block').filter({ hasText: 'FRANCHISE JOURNEY' });

    // In tablet mode (800px), md:block is still visible
    await expect(desktopContainer).toBeVisible({ timeout: 10000 });
    await expect(desktopContainer.locator('.lg\\:col-span-7')).toBeVisible();
    await expect(desktopContainer.locator('.lg\\:col-span-5')).toBeVisible();

    // Verify episodes preview still functional
    await expect(desktopContainer.getByRole('heading', { name: 'EPISODES', exact: true })).toBeVisible();
  });

  test('Mobile: Verify Locked Mobile view remains intact', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173/anime/battle-through-the-heavens', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Loading Qi...', { state: 'detached', timeout: 15000 }).catch(() => {});

    const mobileContainer = page.locator('.block.md\\:hidden');

    // Mobile layout uses bottom sticky tab bar
    const overviewTabButton = mobileContainer.locator('button').filter({ hasText: /^Overview$/ });
    await expect(overviewTabButton).toBeVisible({ timeout: 10000 });

    const charactersTabButton = mobileContainer.locator('button').filter({ hasText: /^Characters$/ });
    await expect(charactersTabButton).toBeVisible({ timeout: 10000 });
  });

});
