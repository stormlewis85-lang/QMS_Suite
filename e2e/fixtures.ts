import { test as base, expect, Page } from '@playwright/test';

export const test = base.extend<{
  partId: number;
  pfmeaId: number;
  controlPlanId: number;
}>({
  partId: async ({ request }, use) => {
    const response = await request.post('/api/parts', {
      data: {
        partNumber: `E2E-PART-${Date.now()}`,
        partName: 'E2E Test Part',
        customer: 'E2E Customer',
        program: 'E2E Program',
        plant: 'E2E Plant',
      },
    });
    const part = await response.json();
    await use(part.id);
    await request.delete(`/api/parts/${part.id}`).catch(() => {});
  },
  pfmeaId: async ({ request, partId }, use) => {
    const response = await request.post('/api/pfmeas', {
      data: { partId, title: 'E2E Test PFMEA', rev: '1.0', status: 'draft' },
    });
    const pfmea = await response.json();
    await use(pfmea.id);
    await request.delete(`/api/pfmeas/${pfmea.id}`).catch(() => {});
  },
  controlPlanId: async ({ request, partId }, use) => {
    const response = await request.post('/api/control-plans', {
      data: { partId, title: 'E2E Test Control Plan', rev: '1.0', status: 'draft' },
    });
    const cp = await response.json();
    await use(cp.id);
    await request.delete(`/api/control-plans/${cp.id}`).catch(() => {});
  },
});

export { expect };

export async function waitForToast(page: Page, text: string | RegExp) {
  await expect(page.locator('[role="status"], [data-sonner-toast], .toast').filter({ hasText: text })).toBeVisible({ timeout: 5000 });
}

export async function waitForTableLoad(page: Page) {
  await page.waitForSelector('table tbody tr', { state: 'visible', timeout: 10000 }).catch(() => {});
}

export async function closeDialog(page: Page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}
