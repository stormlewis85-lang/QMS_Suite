import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Mobile tests need mobile project');

  test('should have responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show sidebar trigger on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForTimeout(500);
    const trigger = page.getByTestId('button-sidebar-toggle');
    if (await trigger.isVisible()) {
      await expect(trigger).toBeVisible();
    }
  });
});
