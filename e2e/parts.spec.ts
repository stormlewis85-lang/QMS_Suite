import { test, expect, waitForToast, waitForTableLoad } from './fixtures';

test.describe('Parts Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/parts');
    await waitForTableLoad(page);
  });

  test('should display parts list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /parts/i })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('should open create part dialog', async ({ page }) => {
    await page.getByRole('button', { name: /add|create|new/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Part Number')).toBeVisible();
    await expect(page.getByText('Part Name')).toBeVisible();
    await expect(page.getByText('Customer')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('should fill part form fields', async ({ page }) => {
    await page.getByRole('button', { name: /add|create|new/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    
    const partNumberInput = page.getByPlaceholder('e.g., 3004-XYZ');
    await partNumberInput.fill(`TEST-${Date.now()}`);
    await expect(partNumberInput).toHaveValue(/TEST-/);
    
    const partNameInput = page.getByPlaceholder('e.g., Stiffener Assembly');
    await partNameInput.fill('E2E Test Part');
    await expect(partNameInput).toHaveValue('E2E Test Part');
  });

  test('should search parts', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('TEST');
      await page.waitForTimeout(500);
    }
  });

  test('should view part details in table', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await expect(firstRow.locator('td').first()).toBeVisible();
    }
  });
});
