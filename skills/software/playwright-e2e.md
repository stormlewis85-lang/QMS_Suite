---
name: playwright-e2e
domain: software
auto-load: false
used-by:
  - test-agent
  - developer-agent
description: >
  Playwright end-to-end testing patterns — selectors, fixtures, network
  stubbing, flake avoidance. Fire when writing or debugging E2E/browser tests,
  or when a task's Gate requires E2E validation. Triggers: "e2e", "playwright",
  "browser test", "end-to-end".
---

# Skill: Playwright E2E Testing

> **Skill ID:** SW-012 · Implementation knowledge — testing patterns and best practices

## Purpose

Production Playwright patterns for end-to-end testing: Page Object Model, fixture-based setup, auto-waiting locators, visual regression, cross-browser configuration, and trace debugging. This is the technical knowledge Test Agent needs to write reliable, maintainable E2E tests.

## When to Load

- Test Agent is writing or updating E2E tests
- Developer Agent is structuring frontend code for testability (reference only)
- New project setup includes E2E test infrastructure

## When NOT to Load

- Unit tests or integration tests (different patterns)
- Backend-only testing
- Non-software domains

---

## Project Setup

### Directory Structure
```
/tests/
  /e2e/
    /fixtures/         ← Custom fixtures and test setup
    /pages/            ← Page Object Model classes
    /specs/            ← Test files organized by feature
    /utils/            ← Shared test utilities
  playwright.config.ts
```

### Configuration — `playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/specs',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

**Key decisions:**
- `trace: 'on-first-retry'` — captures traces only when a test fails and retries, keeping CI fast while providing debugging data
- `retries: 2` in CI catches flaky tests without masking real failures
- `workers: 1` in CI prevents resource contention on shared runners
- Separate mobile projects catch responsive breakpoint issues

---

## Page Object Model (POM)

Every page or significant component gets a POM class. Tests never use raw selectors directly.

### POM Structure
```typescript
// tests/e2e/pages/login.page.ts
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // Prefer user-facing locators: role, label, placeholder, text
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

### POM Rules
1. **Locators are defined in the constructor** — never in test files
2. **User-facing locators first:** `getByRole` > `getByLabel` > `getByPlaceholder` > `getByText` > `getByTestId` > CSS selectors (last resort)
3. **Actions are methods** — `login()`, `addToCart()`, `submitForm()` — not raw click/fill sequences in tests
4. **Assertions can live in POM** for common expectations (`expectError`, `expectLoggedIn`)
5. **No page state in POM** — POMs are stateless. State lives in the test.
6. **One POM per page/component** — don't create god objects. A complex page gets multiple POMs (e.g., `DashboardPage`, `DashboardSidebar`, `DashboardChart`)

---

## Fixtures

Custom fixtures extend Playwright's base test with pre-configured pages, authenticated sessions, and test data.

### Authentication Fixture
```typescript
// tests/e2e/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      process.env.TEST_USER_EMAIL!,
      process.env.TEST_USER_PASSWORD!
    );
    // Wait for auth to complete
    await page.waitForURL('/dashboard');
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

### Storage State (Persistent Auth)
For tests that all need an authenticated user, use storage state to avoid logging in every test:

```typescript
// tests/e2e/fixtures/global-setup.ts
import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${config.projects[0].use.baseURL}/login`);
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: '.auth/user.json' });
  await browser.close();
}

export default globalSetup;
```

Reference in config: `use: { storageState: '.auth/user.json' }`

---

## Auto-Waiting & Locator Best Practices

Playwright auto-waits for elements to be actionable before interacting. Don't fight it.

### Do
```typescript
// Playwright waits for the button to be visible and enabled
await page.getByRole('button', { name: 'Submit' }).click();

// Wait for navigation after action
await page.waitForURL('/success');

// Wait for specific network response
await page.waitForResponse(resp =>
  resp.url().includes('/api/orders') && resp.status() === 200
);

// Assert with auto-retry (Playwright retries until timeout)
await expect(page.getByText('Order confirmed')).toBeVisible();
```

### Don't
```typescript
// DON'T: Manual waits
await page.waitForTimeout(2000); // NEVER — this is always wrong

// DON'T: Manual visibility checks before action
if (await page.getByRole('button').isVisible()) { // Playwright already waits
  await page.getByRole('button').click();
}

// DON'T: Raw CSS selectors when user-facing locators exist
await page.locator('.btn-primary-submit-v2').click(); // Fragile
```

### Activity-Based Waiting Pattern
For pages with complex loading sequences (lazy data, multiple API calls), wait for the page to be "settled" rather than waiting for a specific element:

```typescript
// Wait for network to be idle (no requests for 500ms)
await page.waitForLoadState('networkidle');

// Or better — wait for a specific "ready" indicator
await expect(page.getByTestId('dashboard-loaded')).toBeVisible();
```

---

## Visual Regression Testing

Catch unintended visual changes with screenshot comparison.

### Setup
```typescript
// In test file
test('homepage renders correctly', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixelRatio: 0.01, // Allow 1% pixel difference
    animations: 'disabled',  // Freeze animations for consistency
  });
});

// Component-level screenshot
test('pricing card renders correctly', async ({ page }) => {
  await page.goto('/pricing');
  const card = page.getByTestId('pro-plan-card');
  await expect(card).toHaveScreenshot('pro-plan-card.png');
});
```

### Visual Regression Rules
1. **Update baselines intentionally** — `npx playwright test --update-snapshots` only when visual changes are expected
2. **Disable animations** in screenshots — CSS animations cause false positives
3. **Use component screenshots** over full-page when testing specific UI elements
4. **Store baselines in git** — they're part of the test contract
5. **Separate baseline directories per browser/platform** (Playwright does this by default)

---

## Trace Debugging

When tests fail, traces are the fastest path to diagnosis.

### Viewing Traces
```bash
# Open trace viewer for a failed test
npx playwright show-trace test-results/test-name/trace.zip
```

### What Traces Capture
- Every action with before/after screenshots
- Network requests and responses
- Console logs
- DOM snapshots at each step

### Force Trace on Specific Tests (Debugging)
```typescript
test('complex checkout flow', async ({ page, context }) => {
  await context.tracing.start({ screenshots: true, snapshots: true });

  // ... test steps ...

  await context.tracing.stop({ path: 'traces/checkout-debug.zip' });
});
```

---

## Test Organization & Naming

### File Naming
```
tests/e2e/specs/
  auth/
    login.spec.ts
    signup.spec.ts
    password-reset.spec.ts
  dashboard/
    overview.spec.ts
    settings.spec.ts
  checkout/
    cart.spec.ts
    payment.spec.ts
```

### Test Naming Convention
```typescript
test.describe('Login Page', () => {
  test('allows user to login with valid credentials', async ({ page }) => { });
  test('shows error for invalid email format', async ({ page }) => { });
  test('locks account after 5 failed attempts', async ({ page }) => { });
  test('redirects to original page after login', async ({ page }) => { });
});
```

**Pattern:** `[verb] [subject] [condition/context]` — descriptive enough to understand the test from its name alone.

---

## CI Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Common Patterns

### Testing Modals
```typescript
test('confirmation modal blocks destructive action', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete account' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await expect(modal.getByText('Are you sure?')).toBeVisible();
  await modal.getByRole('button', { name: 'Cancel' }).click();
  await expect(modal).not.toBeVisible();
});
```

### Testing Toast/Notification Dismissal
```typescript
test('success toast appears and auto-dismisses', async ({ page }) => {
  await page.getByRole('button', { name: 'Save' }).click();
  const toast = page.getByRole('status');
  await expect(toast).toContainText('Saved successfully');
  await expect(toast).not.toBeVisible({ timeout: 6000 }); // wait for auto-dismiss
});
```

### Testing File Upload
```typescript
test('allows CSV file upload', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/e2e/fixtures/data/sample.csv');
  await expect(page.getByText('sample.csv uploaded')).toBeVisible();
});
```

---

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Do Instead |
|-------------|---------------|-----------|
| `waitForTimeout()` | Arbitrary delays are flaky and slow | Wait for specific conditions: elements, URLs, responses |
| Raw CSS selectors | Break on refactors | Use `getByRole`, `getByLabel`, `getByText` |
| Testing implementation details | Tests break when code changes, not when behavior changes | Test user-visible behavior |
| One giant test file | Slow, hard to debug, blocks parallelism | One feature = one spec file |
| Shared mutable state between tests | Order-dependent failures | Each test sets up its own state via fixtures |
| Screenshot tests for everything | Noisy, slow, hard to maintain | Visual regression for stable UI only; behavior tests for everything else |
| Asserting on element count | Brittle when content changes | Assert on specific content presence |
