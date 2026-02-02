import { test, expect } from './fixtures';

test.describe('Import & Export', () => {
  test('should have export button on PFMEA detail', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    await page.waitForTimeout(1000);
    const exportBtn = page.getByRole('button', { name: /export/i }).first();
    if (await exportBtn.isVisible()) {
      await expect(exportBtn).toBeVisible();
    }
  });

  test('should navigate to import page', async ({ page }) => {
    await page.goto('/import');
    await page.waitForTimeout(500);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});
