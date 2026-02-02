import { test, expect } from './fixtures';

test.describe('Dashboard', () => {
  test('should display dashboard metrics', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/total parts|parts/i)).toBeVisible();
    await expect(page.getByText(/pfmea|failure/i)).toBeVisible();
  });

  test('should display AP distribution chart', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/action priority|ap distribution/i)).toBeVisible();
    const chart = page.locator('.recharts-wrapper, svg[class*="chart"], canvas');
    await expect(chart.first()).toBeVisible();
  });

  test('should have working quick links', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /parts/i }).first().click();
    await expect(page).toHaveURL(/\/parts/);
  });
});
