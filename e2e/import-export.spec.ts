import { test, expect } from './fixtures';

test.describe('Import & Export', () => {
  test('should export PFMEA to PDF', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export/i }).click();
    await page.getByRole('menuitem', { name: /pdf/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });

  test('should export PFMEA to Excel', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export/i }).click();
    await page.getByRole('menuitem', { name: /excel/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
  });

  test('should show import wizard', async ({ page }) => {
    await page.goto('/import');
    await expect(page.getByRole('heading', { name: /import/i })).toBeVisible();
    await expect(page.getByText(/upload|drag|drop/i)).toBeVisible();
  });

  test('should download import template', async ({ page }) => {
    await page.goto('/import');
    const downloadBtn = page.getByRole('button', { name: /download.*template/i });
    if (await downloadBtn.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await downloadBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
    }
  });
});
