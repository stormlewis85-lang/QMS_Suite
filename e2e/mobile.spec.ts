import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test.use({ ...devices['iPhone 13'] });

  test('should show mobile menu button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /menu/i }).or(page.locator('[data-mobile-menu]'))).toBeVisible();
  });

  test('should open mobile navigation', async ({ page }) => {
    await page.goto('/');
    const menuBtn = page.getByRole('button', { name: /menu/i }).or(page.locator('[data-mobile-menu]'));
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await expect(page.getByRole('navigation')).toBeVisible();
    }
  });

  test('dialogs should be mobile-friendly', async ({ page }) => {
    await page.goto('/parts');
    await page.getByRole('button', { name: /add|create/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    if (dialogBox) {
      expect(dialogBox.width).toBeGreaterThan(300);
    }
  });
});
