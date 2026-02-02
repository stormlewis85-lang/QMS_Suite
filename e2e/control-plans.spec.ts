import { test, expect, waitForTableLoad } from './fixtures';

test.describe('Control Plans', () => {
  test('should display control plans list', async ({ page }) => {
    await page.goto('/control-plans');
    await page.waitForTimeout(500);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should view control plan detail', async ({ page, controlPlanId }) => {
    await page.goto(`/control-plans/${controlPlanId}`);
    await page.waitForTimeout(1000);
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });
});
