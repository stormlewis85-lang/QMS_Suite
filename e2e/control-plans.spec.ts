import { test, expect, waitForToast, waitForTableLoad } from './fixtures';

test.describe('Control Plans', () => {
  test('should display control plans list', async ({ page }) => {
    await page.goto('/control-plans');
    await expect(page.getByRole('heading', { name: /control plan/i })).toBeVisible();
  });

  test('should view control plan detail', async ({ page, controlPlanId }) => {
    await page.goto(`/control-plans/${controlPlanId}`);
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test('should add a control plan row', async ({ page, controlPlanId }) => {
    await page.goto(`/control-plans/${controlPlanId}`);
    await page.getByRole('button', { name: /add.*row|add.*characteristic/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/characteristic/i).fill('Test Dimension');
    await page.getByLabel(/specification|target/i).fill('10.0 ± 0.5');
    await page.getByLabel(/sample size/i).fill('5');
    await page.getByLabel(/frequency/i).fill('1/hour');
    await page.getByLabel(/control method/i).fill('X-bar R Chart');
    await page.getByLabel(/reaction plan/i).fill('Stop and notify supervisor');
    await page.getByRole('button', { name: /save|add/i }).click();
    await waitForToast(page, /added|created|success/i);
  });
});
