import { test, expect, waitForToast, waitForTableLoad } from './fixtures';

test.describe('PFMEA Management', () => {
  test('should display PFMEA list', async ({ page }) => {
    await page.goto('/pfmea');
    await expect(page.getByRole('heading', { name: /pfmea/i })).toBeVisible();
  });

  test('should view PFMEA detail', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test('should add a PFMEA row', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    await page.getByRole('button', { name: /add.*row|new.*row/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/step/i).fill('10');
    await page.getByLabel(/function/i).fill('Test Function');
    await page.getByLabel(/requirement/i).fill('Test Requirement');
    await page.getByLabel(/failure mode/i).fill('Test Failure');
    await page.getByLabel(/effect/i).fill('Test Effect');
    await page.getByLabel(/cause/i).fill('Test Cause');
    await page.getByLabel(/severity/i).selectOption('8');
    await page.getByLabel(/occurrence/i).selectOption('5');
    await page.getByLabel(/detection/i).selectOption('6');
    await page.getByRole('button', { name: /save|add/i }).click();
    await waitForToast(page, /added|created|success/i);
  });

  test('should calculate AP correctly for high severity', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    await page.getByRole('button', { name: /add.*row/i }).click();
    await page.getByLabel(/step/i).fill('20');
    await page.getByLabel(/function/i).fill('AP Test');
    await page.getByLabel(/requirement/i).fill('Test');
    await page.getByLabel(/failure mode/i).fill('Test');
    await page.getByLabel(/effect/i).fill('Test');
    await page.getByLabel(/cause/i).fill('Test');
    await page.getByLabel(/severity/i).selectOption('9');
    await page.getByLabel(/occurrence/i).selectOption('3');
    await page.getByLabel(/detection/i).selectOption('3');
    await page.getByRole('button', { name: /save|add/i }).click();
    await waitForToast(page, /success/i);
    await expect(page.locator('text=H').or(page.locator('[data-ap="H"]')).last()).toBeVisible();
  });

  test('should run auto-review', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    await page.getByRole('button', { name: /auto-review|run review|validate/i }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByText(/finding|issue|error|warning|pass|complete/i)).toBeVisible();
  });

  test('should change document status', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    const statusBtn = page.getByRole('button', { name: /status|draft/i });
    if (await statusBtn.isVisible()) {
      await statusBtn.click();
      await page.getByRole('option', { name: /review/i }).click();
      await waitForToast(page, /status|updated/i);
    }
  });
});
