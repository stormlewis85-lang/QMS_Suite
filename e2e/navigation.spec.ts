import { test, expect } from './fixtures';

test.describe('Navigation', () => {
  test('should load dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should navigate via sidebar', async ({ page }) => {
    await page.goto('/');
    const navItems = [
      { link: /parts/i, url: '/parts' },
      { link: /processes/i, url: '/processes' },
      { link: /pfmea/i, url: '/pfmea' },
      { link: /control plans/i, url: '/control-plans' },
      { link: /actions/i, url: '/actions' },
    ];
    for (const item of navItems) {
      await page.getByRole('link', { name: item.link }).click();
      await expect(page).toHaveURL(item.url);
    }
  });

  test('should show 404 for invalid routes', async ({ page }) => {
    await page.goto('/invalid-route-xyz-123');
    await expect(page.getByText(/not found|404/i)).toBeVisible();
  });
});
