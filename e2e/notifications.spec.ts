import { test, expect } from './fixtures';

test.describe('Notifications', () => {
  test('should display notification bell', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('button-notifications')).toBeVisible();
  });

  test('should open notification panel', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('button-notifications').click();
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  });

  test('should navigate to notifications page', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: /notification/i })).toBeVisible();
  });
});
