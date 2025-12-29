import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should navigate to Parts page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /parts/i }).first().click();
    await expect(page).toHaveURL(/\/parts/);
  });

  test('should navigate to Processes page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /processes/i }).first().click();
    await expect(page).toHaveURL(/\/processes/);
  });

  test('should navigate to PFMEA page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /pfmea/i }).first().click();
    await expect(page).toHaveURL(/\/pfmea/);
  });

  test('should navigate to Control Plans page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /control plans/i }).first().click();
    await expect(page).toHaveURL(/\/control-plans/);
  });

  test('should navigate to Equipment Library', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /equipment/i }).first().click();
    await expect(page).toHaveURL(/\/equipment/);
  });

  test('should navigate to Failure Modes Library', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /failure modes/i }).first().click();
    await expect(page).toHaveURL(/\/failure-modes/);
  });

  test('should navigate to Controls Library', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /controls library/i }).first().click();
    await expect(page).toHaveURL(/\/controls-library/);
  });
});

test.describe('Scrolling & Headers', () => {
  test('table headers should remain visible when scrolling', async ({ page }) => {
    await page.goto('/equipment');
    await page.waitForSelector('table');
    const header = page.locator('thead');
    await page.evaluate(() => {
      const scrollContainer = document.querySelector('.overflow-auto') || window;
      if (scrollContainer instanceof Window) {
        window.scrollBy(0, 500);
      } else {
        (scrollContainer as HTMLElement).scrollTop = 500;
      }
    });
    await expect(header).toBeVisible();
  });

  test('page header should remain visible when scrolling long lists', async ({ page }) => {
    await page.goto('/parts');
    await page.waitForSelector('h1, h2');
    await page.evaluate(() => window.scrollBy(0, 500));
    const headerArea = page.locator('header, [class*="sticky"]').first();
    await expect(headerArea).toBeVisible();
  });
});

test.describe('Parts CRUD', () => {
  test('should display parts list', async ({ page }) => {
    await page.goto('/parts');
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('should open create part dialog', async ({ page }) => {
    await page.goto('/parts');
    await page.getByRole('button', { name: /add|create|new/i }).first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should navigate to part detail', async ({ page }) => {
    await page.goto('/parts');
    await page.locator('table tbody tr').first().click();
    await expect(page).toHaveURL(/\/parts\/[a-zA-Z0-9-]+/);
  });
});

test.describe('Equipment Library', () => {
  test('should display equipment list', async ({ page }) => {
    await page.goto('/equipment');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should open add equipment dialog', async ({ page }) => {
    await page.goto('/equipment');
    await page.getByRole('button', { name: /add|create|new/i }).first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should search equipment', async ({ page }) => {
    await page.goto('/equipment');
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Press');
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Failure Modes Library', () => {
  test('should display failure modes list', async ({ page }) => {
    await page.goto('/failure-modes');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should open add failure mode dialog', async ({ page }) => {
    await page.goto('/failure-modes');
    await page.getByRole('button', { name: /add|create|new/i }).first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });
});

test.describe('Controls Library', () => {
  test('should display controls list', async ({ page }) => {
    await page.goto('/controls-library');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should filter by control type', async ({ page }) => {
    await page.goto('/controls-library');
    const preventionTab = page.getByRole('button', { name: /prevention/i }).first();
    if (await preventionTab.isVisible()) {
      await preventionTab.click();
    }
  });
});

test.describe('Process Library', () => {
  test('should display processes list', async ({ page }) => {
    await page.goto('/processes');
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('should navigate to process detail', async ({ page }) => {
    await page.goto('/processes');
    await page.locator('table tbody tr').first().click();
    await expect(page).toHaveURL(/\/processes\/[a-zA-Z0-9-]+/);
  });
});

test.describe('Document Generation', () => {
  test('should access part detail and see tabs', async ({ page }) => {
    await page.goto('/parts');
    await page.locator('table tbody tr').first().click();
    await page.waitForURL(/\/parts\/[a-zA-Z0-9-]+/);
    await expect(page.locator('[role="tablist"]').first()).toBeVisible();
  });
});

test.describe('API Health', () => {
  test('parts API should respond', async ({ request }) => {
    const response = await request.get('/api/parts');
    expect(response.status()).toBe(200);
  });

  test('processes API should respond', async ({ request }) => {
    const response = await request.get('/api/processes');
    expect(response.status()).toBe(200);
  });

  test('equipment API should respond', async ({ request }) => {
    const response = await request.get('/api/equipment');
    expect(response.status()).toBe(200);
  });

  test('failure-modes API should respond', async ({ request }) => {
    const response = await request.get('/api/failure-modes');
    expect(response.status()).toBe(200);
  });

  test('controls-library API should respond', async ({ request }) => {
    const response = await request.get('/api/controls-library');
    expect(response.status()).toBe(200);
  });

  test('pfmeas API should respond', async ({ request }) => {
    const response = await request.get('/api/pfmeas');
    expect(response.status()).toBe(200);
  });
});
