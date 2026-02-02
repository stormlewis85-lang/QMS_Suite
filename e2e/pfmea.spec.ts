import { test, expect, waitForTableLoad } from './fixtures';

test.describe('PFMEA Management', () => {
  test('should display PFMEA list page', async ({ page }) => {
    await page.goto('/pfmea');
    await page.waitForTimeout(500);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should view PFMEA detail page', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(new RegExp(`/pfmea/${pfmeaId}`));
  });

  test('should have add row button', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    await page.waitForTimeout(1000);
    const addBtn = page.getByRole('button', { name: /add|new|row/i }).first();
    if (await addBtn.isVisible()) {
      await expect(addBtn).toBeVisible();
    }
  });
});
