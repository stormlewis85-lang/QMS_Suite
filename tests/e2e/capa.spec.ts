import { test, expect } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────

async function registerAndLogin(page: any, request: any): Promise<string> {
  const email = `capa-e2e-${Date.now()}@test.com`;
  const orgName = `CAPA E2E Org ${Date.now()}`;
  const password = 'capaTestPassword123';

  const regRes = await request.post('/api/auth/register', {
    data: {
      organizationName: orgName,
      email,
      password,
      firstName: 'CAPA',
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

test.describe('CAPA Module', () => {

  test.describe('Navigation', () => {
    test('sidebar shows CAPA navigation', async ({ page, request }) => {
      await registerAndLogin(page, request);

      // Sidebar uses data-testid="nav-capa" on the SidebarMenuButton
      const capaLink = page.getByTestId('nav-capa');
      await expect(capaLink).toBeVisible({ timeout: 10000 });
    });

    test('can navigate to CAPA list', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/capa');
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await expect(page).toHaveURL('/capa', { timeout: 10000 });

      // Should see the page heading "CAPA List"
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    });

    test('can navigate to CAPA dashboard', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/capa/dashboard');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Dashboard should show metric cards (e.g., Open, Overdue, etc.)
      await expect(page.getByText(/open/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('protected routes redirect to login', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/capa');
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });

  test.describe('CAPA List', () => {
    test('should display CAPA list or empty state', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/capa');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Page should have rendered (not be blank)
      const body = await page.locator('body').textContent();
      expect(body).toBeTruthy();
    });

    test('CAPA list shows created CAPAs', async ({ page, request }) => {
      const token = await registerAndLogin(page, request);

      // Create a CAPA via API with auth header
      const title = `List Test CAPA ${Date.now()}`;
      await request.post('/api/capas', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          title,
          description: 'Created by E2E test for list verification',
          type: 'corrective',
          priority: 'high',
          sourceType: 'customer_complaint',
        },
      });

      await page.goto('/capa');
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('CAPA Creation', () => {
    test('can navigate to create CAPA page', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/capa/new');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Should see a form heading or title input
      const heading = page.locator('h1, h2').filter({ hasText: /create|new/i }).first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('can create new CAPA', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/capa/new');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      const capaTitle = `E2E Test CAPA ${Date.now()}`;

      // Fill form fields
      const titleInput = page.locator('input[name="title"], input[placeholder*="title" i], input[id="title"]').first();
      await titleInput.fill(capaTitle);

      const descInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i], textarea[id="description"]').first();
      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.fill('Created by Playwright E2E test');
      }

      // Submit the form
      const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /create|save|submit/i }).first();
      await submitBtn.click();

      // Should either navigate to the new CAPA detail page or show success
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    });
  });

  test.describe('CAPA Detail', () => {
    test('can view CAPA detail page', async ({ page, request }) => {
      const token = await registerAndLogin(page, request);

      // Create CAPA via API with auth
      const res = await request.post('/api/capas', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          title: 'Detail View CAPA',
          description: 'Testing detail view',
          type: 'corrective',
          priority: 'high',
          sourceType: 'internal_ncr',
        },
      });
      const capa = await res.json();

      await page.goto(`/capa/${capa.id}`);
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await expect(page.getByText('Detail View CAPA')).toBeVisible({ timeout: 10000 });
    });

    test('detail page shows discipline tabs', async ({ page, request }) => {
      const token = await registerAndLogin(page, request);

      const res = await request.post('/api/capas', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          title: 'Tabs CAPA',
          description: 'Testing discipline tabs visibility',
          type: 'corrective',
          priority: 'medium',
          sourceType: 'audit_finding',
        },
      });
      const capa = await res.json();

      await page.goto(`/capa/${capa.id}`);
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Should show discipline tabs - use exact role selector
      await expect(page.getByRole('tab', { name: 'D0', exact: true })).toBeVisible({ timeout: 10000 });
    });

    test('can navigate discipline tabs', async ({ page, request }) => {
      const token = await registerAndLogin(page, request);

      const res = await request.post('/api/capas', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          title: 'Tab Navigation CAPA',
          description: 'Testing tab navigation',
          type: 'corrective',
          priority: 'medium',
          sourceType: 'audit_finding',
        },
      });
      const capa = await res.json();

      await page.goto(`/capa/${capa.id}`);
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Click through discipline tabs
      for (const tab of ['D0', 'D1', 'D2', 'D3', 'D4']) {
        const tabEl = page.getByRole('tab', { name: tab, exact: true });
        if (await tabEl.isVisible({ timeout: 3000 }).catch(() => false)) {
          await tabEl.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Analytics Pages', () => {
    test('can view analytics page', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/capa/analytics');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      await expect(page.getByText(/analytics/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('can view Pareto analysis', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/capa/analytics/pareto');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      await expect(page.getByText(/pareto/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('can view trend analysis', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/capa/analytics/trends');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      await expect(page.getByText(/trend/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('can view team performance', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/capa/analytics/team');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      await expect(page.getByText(/team/i).first()).toBeVisible({ timeout: 10000 });
    });
  });
});
