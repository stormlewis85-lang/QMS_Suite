import { test, expect } from './fixtures';

test.describe('Notifications', () => {
  test('should display notification bell', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /notification/i }).or(page.locator('[data-notification-bell]'))).toBeVisible();
  });

  test('should open notification panel', async ({ page }) => {
    await page.goto('/');
    const bell = page.getByRole('button', { name: /notification/i }).or(page.locator('[data-notification-bell]'));
    if (await bell.isVisible()) {
      await bell.click();
      await expect(page.getByText(/notification/i)).toBeVisible();
    }
  });

  test('should navigate to notifications page', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: /notification/i })).toBeVisible();
  });
});
