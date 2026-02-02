import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'] });

test.describe('Mobile Responsiveness', () => {
  test('should show mobile menu button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /menu/i }).or(page.locator('[data-mobile-menu]')).or(page.locator('[data-testid="button-sidebar-toggle"]'))).toBeVisible();
  });

  test('should open mobile navigation', async ({ page }) => {
    await page.goto('/');
    const menuBtn = page.getByRole('button', { name: /menu/i }).or(page.locator('[data-mobile-menu]')).or(page.locator('[data-testid="button-sidebar-toggle"]'));
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(300);
      await expect(page.getByRole('navigation').or(page.locator('[data-sidebar]'))).toBeVisible();
    }
  });

  test('dialogs should be mobile-friendly', async ({ page }) => {
    await page.goto('/parts');
    const addBtn = page.getByRole('button', { name: /add|create/i });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const dialogBox = await dialog.boundingBox();
      if (dialogBox) {
        expect(dialogBox.width).toBeGreaterThan(300);
      }
    }
  });
});
