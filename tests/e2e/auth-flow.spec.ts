import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.describe('Registration', () => {
    test('should register a new organization', async ({ page }) => {
      const uniqueEmail = `e2e-${Date.now()}@test.com`;
      const uniqueOrg = `E2E Test Org ${Date.now()}`;

      await page.goto('/register');

      await page.fill('input[name="organizationName"]', uniqueOrg);
      await page.fill('input[name="firstName"]', 'E2E');
      await page.fill('input[name="lastName"]', 'Tester');
      await page.fill('input[name="email"]', uniqueEmail);
      await page.fill('input[name="password"]', 'testPassword123');
      await page.fill('input[name="confirmPassword"]', 'testPassword123');

      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/', { timeout: 10000 });
    });

    test('should show error for mismatched passwords', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[name="organizationName"]', 'Mismatch Org');
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', 'mismatch@test.com');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="confirmPassword"]', 'different123');
      await page.click('button[type="submit"]');

      await expect(page.getByText('Passwords do not match')).toBeVisible();
    });
  });

  test.describe('Login', () => {
    test('should login with valid credentials', async ({ page, request }) => {
      const uniqueEmail = `login-e2e-${Date.now()}@test.com`;
      const uniqueOrg = `Login Test Org ${Date.now()}`;

      // Ensure user exists via API
      await request.post('/api/auth/register', {
        data: {
          organizationName: uniqueOrg,
          email: uniqueEmail,
          password: 'loginTest123',
          firstName: 'Login',
          lastName: 'Test',
        },
      });

      // Clear cookies so we're logged out
      await page.context().clearCookies();

      await page.goto('/login');
      await page.fill('input[id="email"]', uniqueEmail);
      await page.fill('input[id="password"]', 'loginTest123');
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL('/', { timeout: 10000 });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/login');
      await page.fill('input[id="email"]', 'wrong@test.com');
      await page.fill('input[id="password"]', 'wrongPassword');
      await page.click('button[type="submit"]');

      await expect(page.getByText('Invalid credentials')).toBeVisible({ timeout: 10000 });
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/parts');
      await expect(page).toHaveURL('/login', { timeout: 10000 });
    });
  });

  test.describe('Logout', () => {
    test('should logout and redirect to login', async ({ page, request }) => {
      const uniqueEmail = `logout-e2e-${Date.now()}@test.com`;
      const uniqueOrg = `Logout Test Org ${Date.now()}`;

      // Register via API
      await request.post('/api/auth/register', {
        data: {
          organizationName: uniqueOrg,
          email: uniqueEmail,
          password: 'logoutTest123',
          firstName: 'Logout',
          lastName: 'Test',
        },
      });

      // Clear cookies and login via UI
      await page.context().clearCookies();
      await page.goto('/login');
      await page.fill('input[id="email"]', uniqueEmail);
      await page.fill('input[id="password"]', 'logoutTest123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/', { timeout: 10000 });

      // Open the user dropdown menu in the sidebar footer
      await page.locator('button:has(.h-8.w-8)').first().click();
      // Click "Sign out" in the dropdown
      await page.getByText('Sign out').click();
      await expect(page).toHaveURL('/login', { timeout: 10000 });
    });
  });
});
