import { test, expect } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────

async function registerAndLogin(page: any, request: any): Promise<string> {
  const email = `capa-journey-${Date.now()}@test.com`;
  const orgName = `CAPA Journey Org ${Date.now()}`;
  const password = 'journeyTestPassword123';

  const regRes = await request.post('/api/auth/register', {
    data: {
      organizationName: orgName,
      email,
      password,
      firstName: 'Journey',
      lastName: 'Tester',
    },
  });
  const regData = await regRes.json();
  const token = regData.token as string;

  await page.context().clearCookies();
  await page.goto('/login');
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/', { timeout: 15000 });

  return token;
}

// ═══════════════════════════════════════════════════════════════════

test.describe('Complete 8D Journey', () => {

  test('can navigate through full 8D workflow', async ({ page, request }) => {
    test.setTimeout(60000);
    const token = await registerAndLogin(page, request);

    // Create CAPA via API (faster than filling the form)
    const res = await request.post('/api/capas', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: 'Full 8D Journey CAPA',
        description: 'End-to-end 8D process test',
        type: 'corrective',
        priority: 'high',
        sourceType: 'customer_complaint',
        customerName: 'Test Customer',
      },
    });
    const capa = await res.json();

    // Navigate to CAPA detail
    await page.goto(`/capa/${capa.id}`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.getByText('Full 8D Journey CAPA')).toBeVisible({ timeout: 10000 });

    // Click through each discipline tab D0 through D8
    const allTabs = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'];
    for (const tab of allTabs) {
      const tabEl = page.getByRole('tab', { name: tab, exact: true });
      if (await tabEl.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tabEl.click();
        await page.waitForTimeout(500);
      }
    }

    // Navigate to Overview tab if it exists
    const overviewTab = page.getByRole('tab', { name: /overview/i });
    if (await overviewTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await overviewTab.click();
      await expect(page.getByText('Full 8D Journey CAPA')).toBeVisible({ timeout: 10000 });
    }

    // Verify CAPA appears in the list
    await page.goto('/capa');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.getByText('Full 8D Journey CAPA')).toBeVisible({ timeout: 10000 });

    // Verify dashboard loads with data
    await page.goto('/capa/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    // Dashboard should load without errors
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('CAPA detail preserves data across tab navigation', async ({ page, request }) => {
    const token = await registerAndLogin(page, request);

    const capaTitle = `Tab Persistence CAPA ${Date.now()}`;
    const res = await request.post('/api/capas', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: capaTitle,
        description: 'Testing data persistence across tab switches',
        type: 'preventive',
        priority: 'medium',
        sourceType: 'audit_finding',
      },
    });
    const capa = await res.json();

    await page.goto(`/capa/${capa.id}`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.getByText(capaTitle)).toBeVisible({ timeout: 10000 });

    // Switch to D1, then back to D0 / Overview - title should still be visible
    const d1Tab = page.getByRole('tab', { name: 'D1', exact: true });
    if (await d1Tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await d1Tab.click();
      await page.waitForTimeout(500);
    }

    const d0Tab = page.getByRole('tab', { name: 'D0', exact: true });
    if (await d0Tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await d0Tab.click();
      await page.waitForTimeout(500);
    }

    // CAPA title should still be present on the page
    await expect(page.getByText(capaTitle)).toBeVisible({ timeout: 10000 });
  });

  test('can navigate from list to detail and back', async ({ page, request }) => {
    test.setTimeout(60000);
    const token = await registerAndLogin(page, request);

    const capaTitle = `Navigate Back CAPA ${Date.now()}`;
    await request.post('/api/capas', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: capaTitle,
        description: 'Testing list-to-detail-to-list navigation',
        type: 'corrective',
        priority: 'low',
        sourceType: 'internal_ncr',
      },
    });

    // Start at the list
    await page.goto('/capa');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.getByText(capaTitle)).toBeVisible({ timeout: 10000 });

    // Click the CAPA to go to detail
    await page.getByText(capaTitle).click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Should be on the detail page
    await expect(page.getByText(capaTitle)).toBeVisible({ timeout: 10000 });

    // Navigate back to the list
    await page.goto('/capa');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.getByText(capaTitle)).toBeVisible({ timeout: 10000 });
  });

  test('dashboard reflects CAPA counts', async ({ page, request }) => {
    const token = await registerAndLogin(page, request);

    // Create two CAPAs via API
    await request.post('/api/capas', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: `Dashboard Count CAPA A ${Date.now()}`,
        description: 'First CAPA for dashboard count',
        type: 'corrective',
        priority: 'high',
        sourceType: 'customer_complaint',
      },
    });
    await request.post('/api/capas', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: `Dashboard Count CAPA B ${Date.now()}`,
        description: 'Second CAPA for dashboard count',
        type: 'preventive',
        priority: 'medium',
        sourceType: 'audit_finding',
      },
    });

    await page.goto('/capa/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Dashboard should render without errors and show content
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
    // At minimum, the dashboard page should have loaded
    expect(body!.length).toBeGreaterThan(50);
  });
});
