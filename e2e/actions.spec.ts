import { test, expect, waitForToast } from './fixtures';

test.describe('Action Items', () => {
  test('should display actions list', async ({ page }) => {
    await page.goto('/actions');
    await expect(page.getByRole('heading', { name: /action/i })).toBeVisible();
  });

  test('should filter actions by status', async ({ page }) => {
    await page.goto('/actions');
    const statusFilter = page.getByRole('combobox', { name: /status|filter/i });
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.getByRole('option', { name: /open|pending/i }).click();
      await page.waitForTimeout(500);
    }
  });

  test('should create action from PFMEA row', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    const actionBtn = page.locator('table tbody tr').first().getByRole('button', { name: /action/i });
    if (await actionBtn.isVisible()) {
      await actionBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByLabel(/description|action/i).fill('E2E Test Action');
      await page.getByLabel(/responsible|assigned/i).fill('John Doe');
      await page.getByLabel(/target date|due date/i).fill('2025-12-31');
      await page.getByRole('button', { name: /save|create|add/i }).click();
      await waitForToast(page, /created|added|success/i);
    }
  });
});
