const { test, expect, devices } = require('@playwright/test');

async function waitForReady(page) {
  await page.waitForFunction(() => window.__JO_READY === true);
}

test('game loads without crashing', async ({ page }) => {
  const errors = [];

  page.on('pageerror', err => {
    errors.push(err.message);
  });

  await page.goto('/');
  await waitForReady(page);

  await expect(page.locator('[data-testid="game"]')).toBeVisible();
  await expect(page.locator('[data-testid="start-wave"]')).toBeVisible();

  expect(errors).toEqual([]);
});

test('all tower types selectable', async ({ page }) => {
  await page.goto('/');
  await waitForReady(page);

  await page.locator('[data-testid="tower-ranger"]').click();
  await page.locator('[data-testid="tower-cannon"]').click();
  await page.locator('[data-testid="tower-cryo"]').click();

  await expect(page.locator('[data-testid="tower-cryo"]')).toHaveClass(/active/);
});

test('wave can start', async ({ page }) => {
  await page.goto('/');
  await waitForReady(page);

  const status = await page.evaluate(() => {
    const button = document.querySelector('[data-testid="start-wave"]');
    if (!button || typeof button.onclick !== 'function') {
      throw new Error('Start wave handler is not attached');
    }
    button.onclick();
    return document.querySelector('#status')?.textContent || '';
  });

  expect(status).toMatch(/Breach/i);
});

test('mobile portrait layout keeps controls reachable', async ({ browser }) => {
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    viewport: { width: 412, height: 915 }
  });

  const page = await context.newPage();
  await page.goto('/');
  await waitForReady(page);

  await expect(page.locator('[data-testid="game"]')).toBeVisible();
  await expect(page.locator('[data-testid="tower-ranger"]')).toBeVisible();
  await expect(page.locator('[data-testid="upgrade"]')).toBeVisible();

  await context.close();
});

test('mobile landscape layout keeps map visible', async ({ browser }) => {
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    viewport: { width: 915, height: 412 }
  });

  const page = await context.newPage();
  await page.goto('/');
  await waitForReady(page);

  await expect(page.locator('[data-testid="game"]')).toBeVisible();
  await expect(page.locator('[data-testid="tower-ranger"]')).toBeVisible();

  const gameBox = await page.locator('[data-testid="game"]').boundingBox();
  expect(gameBox.width).toBeGreaterThan(300);
  expect(gameBox.height).toBeGreaterThan(180);

  await context.close();
});

test('orientation changes preserve game visibility', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('/');
  await waitForReady(page);

  await page.setViewportSize({ width: 915, height: 412 });
  await page.waitForTimeout(300);

  await expect(page.locator('[data-testid="game"]')).toBeVisible();

  await page.setViewportSize({ width: 412, height: 915 });
  await page.waitForTimeout(300);

  await expect(page.locator('[data-testid="game"]')).toBeVisible();
});
