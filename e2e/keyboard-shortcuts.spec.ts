import { test, expect } from './fixtures';

test.describe('Keyboard Shortcuts', () => {
  test('should open search with Ctrl+K', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog').or(page.getByPlaceholder(/search/i))).toBeVisible();
  });

  test('should close dialogs with Escape', async ({ page }) => {
    await page.goto('/parts');
    await page.getByRole('button', { name: /add|create|new/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
