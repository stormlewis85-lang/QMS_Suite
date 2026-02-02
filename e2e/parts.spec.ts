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

  test('should create a new part', async ({ page }) => {
    const uniquePartNumber = `TEST-${Date.now()}`;
    await page.getByRole('button', { name: /add|create|new/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/part number/i).fill(uniquePartNumber);
    await page.getByLabel(/part name/i).fill('E2E Created Part');
    await page.getByLabel(/customer/i).fill('Test Customer');
    await page.getByLabel(/program/i).fill('Test Program');
    await page.getByLabel(/plant/i).fill('Test Plant');
    await page.getByRole('button', { name: /save|create|submit/i }).click();
    await waitForToast(page, /created|success/i);
    await expect(page.getByText(uniquePartNumber)).toBeVisible();
  });

  test('should search parts', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('TEST');
    await page.waitForTimeout(500);
  });

  test('should navigate to part detail', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await expect(page).toHaveURL(/\/parts\/\d+/);
    }
  });
});
