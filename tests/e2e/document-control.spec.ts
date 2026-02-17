import { test, expect } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────

async function registerAndLogin(page: any, request: any) {
  const email = `dc-e2e-${Date.now()}@test.com`;
  const orgName = `DC E2E Org ${Date.now()}`;
  const password = 'dcTestPassword123';

  await request.post('/api/auth/register', {
    data: {
      organizationName: orgName,
      email,
      password,
      firstName: 'DC',
      lastName: 'Tester',
    },
  });

  await page.context().clearCookies();
  await page.goto('/login');
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/', { timeout: 15000 });
}

// ═══════════════════════════════════════════════════════════════════

test.describe('Document Control E2E', () => {

  test.describe('Documents Page', () => {
    test('should navigate to documents page', async ({ page, request }) => {
      await registerAndLogin(page, request);

      await page.goto('/documents');
      await expect(page).toHaveURL('/documents', { timeout: 10000 });

      // Should see the page heading or content
      await expect(page.locator('h1, h2, [data-testid="documents-heading"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display document list or empty state', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/documents');

      // Wait for content to load - either a table/list or an empty state
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Page should have rendered (not be blank)
      const body = await page.locator('body').textContent();
      expect(body).toBeTruthy();
    });

    test('should have create document button', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/documents');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Look for a create/new document button
      const createBtn = page.locator('button, a').filter({ hasText: /new|create|add/i }).first();
      await expect(createBtn).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Document Creation', () => {
    test('should open create document dialog/form', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/documents');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Click create button
      const createBtn = page.locator('button, a').filter({ hasText: /new|create|add/i }).first();
      await createBtn.click();

      // Should see a form/dialog with title input
      const titleInput = page.locator('input[name="title"], input[placeholder*="title" i], input[id="title"]').first();
      await expect(titleInput).toBeVisible({ timeout: 10000 });
    });

    test('should create a new document', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/documents');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Click create
      const createBtn = page.locator('button, a').filter({ hasText: /new|create|add/i }).first();
      await createBtn.click();

      // Fill in required fields
      const titleInput = page.locator('input[name="title"], input[placeholder*="title" i], input[id="title"]').first();
      await titleInput.fill(`E2E Test Doc ${Date.now()}`);

      // Fill doc number if present
      const docNumInput = page.locator('input[name="docNumber"], input[placeholder*="number" i], input[id="docNumber"]').first();
      if (await docNumInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await docNumInput.fill(`E2E-${Date.now()}`);
      }

      // Select document type if present
      const typeSelect = page.locator('select[name="type"], [data-testid="doc-type-select"]').first();
      if (await typeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await typeSelect.selectOption('work_instruction');
      }

      // Submit the form
      const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /create|save|submit/i }).first();
      await submitBtn.click();

      // Should either navigate to detail or show success
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    });
  });

  test.describe('Approvals Page', () => {
    test('should navigate to approvals page', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/approvals');
      await expect(page).toHaveURL('/approvals', { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      const body = await page.locator('body').textContent();
      expect(body).toBeTruthy();
    });
  });

  test.describe('Document Reviews Page', () => {
    test('should navigate to document reviews page', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/document-reviews');
      await expect(page).toHaveURL('/document-reviews', { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      const body = await page.locator('body').textContent();
      expect(body).toBeTruthy();
    });
  });

  test.describe('External Documents Page', () => {
    test('should navigate to external documents page', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/external-documents');
      await expect(page).toHaveURL('/external-documents', { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      const body = await page.locator('body').textContent();
      expect(body).toBeTruthy();
    });
  });

  test.describe('Admin Pages', () => {
    test('should navigate to workflow builder', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/admin/workflows');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Should load without error
      const body = await page.locator('body').textContent();
      expect(body).toBeTruthy();
    });

    test('should navigate to document templates', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/admin/document-templates');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      const body = await page.locator('body').textContent();
      expect(body).toBeTruthy();
    });

    test('should navigate to distribution lists', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/admin/distribution-lists');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      const body = await page.locator('body').textContent();
      expect(body).toBeTruthy();
    });

    test('should navigate to audit log', async ({ page, request }) => {
      await registerAndLogin(page, request);
      await page.goto('/admin/audit-log');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      const body = await page.locator('body').textContent();
      expect(body).toBeTruthy();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between document control pages via sidebar', async ({ page, request }) => {
      await registerAndLogin(page, request);

      // Navigate to documents via sidebar
      await page.goto('/');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Click Documents in sidebar
      const docsLink = page.locator('a[href="/documents"], nav a').filter({ hasText: /documents/i }).first();
      if (await docsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await docsLink.click();
        await expect(page).toHaveURL('/documents', { timeout: 10000 });
      }

      // Click My Approvals in sidebar
      const approvalsLink = page.locator('a[href="/approvals"], nav a').filter({ hasText: /approval/i }).first();
      if (await approvalsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await approvalsLink.click();
        await expect(page).toHaveURL('/approvals', { timeout: 10000 });
      }
    });
  });

  test.describe('Unauthenticated Access', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/documents');
      await expect(page).toHaveURL('/login', { timeout: 10000 });
    });

    test('should redirect to login for admin pages', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/admin/workflows');
      await expect(page).toHaveURL('/login', { timeout: 10000 });
    });
  });
});
