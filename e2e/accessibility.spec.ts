import { test, expect } from './fixtures';

test.describe('Accessibility', () => {
  test('should be navigable by keyboard', async ({ page }) => {
    await page.goto('/');
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('forms should have proper labels', async ({ page }) => {
    await page.goto('/parts');
    await page.getByRole('button', { name: /add|create/i }).click();
    const inputs = page.locator('input:visible:not([type="hidden"])');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).isVisible() : false;
      expect(hasLabel || ariaLabel || ariaLabelledBy || placeholder).toBeTruthy();
    }
  });
});
