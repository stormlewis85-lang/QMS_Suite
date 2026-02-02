import { test, expect } from './fixtures';

test.describe('Keyboard Shortcuts', () => {
  test('should close dialogs with Escape', async ({ page }) => {
    await page.goto('/parts');
    await page.getByRole('button', { name: /add|create|new/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should be able to tab through form fields', async ({ page }) => {
    await page.goto('/parts');
    await page.getByRole('button', { name: /add|create|new/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });
});
