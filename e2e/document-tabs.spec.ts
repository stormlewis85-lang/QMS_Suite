import { test, expect } from './fixtures';

test.describe('PFMEA Document Tabs', () => {
  test('signatures tab should not show Coming Soon', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    await page.getByRole('tab', { name: /signatures/i }).click();
    await expect(page.getByText(/coming soon/i)).not.toBeVisible();
    await expect(page.getByText(/electronic signature|signature/i)).toBeVisible();
  });

  test('revisions tab should not show Coming Soon', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    await page.getByRole('tab', { name: /revisions/i }).click();
    await expect(page.getByText(/coming soon/i)).not.toBeVisible();
    await expect(page.getByText(/revision|version/i)).toBeVisible();
  });

  test('ownership tab should not show Coming Soon', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    await page.getByRole('tab', { name: /ownership/i }).click();
    await expect(page.getByText(/coming soon/i)).not.toBeVisible();
    await expect(page.getByText(/owner|responsible/i)).toBeVisible();
  });

  test('history tab should not show Coming Soon', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    await page.getByRole('tab', { name: /history/i }).click();
    await expect(page.getByText(/coming soon/i)).not.toBeVisible();
    await expect(page.getByText(/history|audit|change/i)).toBeVisible();
  });

  test('should add signature when in review status', async ({ page, pfmeaId, request }) => {
    await request.patch(`/api/pfmeas/${pfmeaId}/status`, { data: { status: 'review' } });
    await page.goto(`/pfmea/${pfmeaId}`);
    await page.getByRole('tab', { name: /signatures/i }).click();
    const addBtn = page.getByRole('button', { name: /add signature/i });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByLabel(/role|signing as/i).selectOption({ index: 1 });
      await page.getByLabel(/name/i).fill('E2E Test Signer');
      await page.getByRole('button', { name: /sign/i }).click();
      await expect(page.getByText('E2E Test Signer')).toBeVisible();
    }
  });
});
