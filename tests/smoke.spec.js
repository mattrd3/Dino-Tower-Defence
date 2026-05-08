const { test, expect } = require('@playwright/test');

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

  await page.locator('[data-testid="start-wave"]').click();

  await expect(page.locator('#status')).toContainText(/Breach/i);
});
