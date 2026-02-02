import { test, expect } from './fixtures';

test.describe('Navigation', () => {
  test('should load dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should navigate via sidebar', async ({ page }) => {
    await page.goto('/');
    const navItems = [
      { testId: 'nav-parts', url: '/parts' },
      { testId: 'nav-processes', url: '/processes' },
      { testId: 'nav-pfmea', url: '/pfmea' },
      { testId: 'nav-control-plans', url: '/control-plans' },
      { testId: 'nav-actions', url: '/actions' },
    ];
    for (const item of navItems) {
      await page.getByTestId(item.testId).click();
      await expect(page).toHaveURL(item.url);
    }
  });

  test('should show 404 for invalid routes', async ({ page }) => {
    await page.goto('/invalid-route-xyz-123');
    await expect(page.getByText(/not found|404/i)).toBeVisible();
  });
});
