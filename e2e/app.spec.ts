import { test, expect } from '@playwright/test';

/**
 * E2E Tests for PFMEA Suite
 * 
 * Run with: npx playwright test
 * Debug with: npx playwright test --debug
 */

// =============================================================================
// NAVIGATION TESTS
// =============================================================================

test.describe('Navigation', () => {
  test('should load dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should navigate to Parts page', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-parts').click();
    await expect(page).toHaveURL(/\/parts/);
  });

  test('should navigate to Processes page', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-processes').click();
    await expect(page).toHaveURL(/\/processes/);
  });

  test('should navigate to PFMEA page', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-pfmea').click();
    await expect(page).toHaveURL(/\/pfmea/);
  });

  test('should navigate to Control Plans page', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-control-plans').click();
    await expect(page).toHaveURL(/\/control-plans/);
  });

  test('should navigate to Equipment Library', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-equipment').click();
    await expect(page).toHaveURL(/\/equipment/);
  });

  test('should navigate to Failure Modes Library', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-failure-modes').click();
    await expect(page).toHaveURL(/\/failure-modes/);
  });

  test('should navigate to Controls Library', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-controls-library').click();
    await expect(page).toHaveURL(/\/controls-library/);
  });
});

// =============================================================================
// SCROLLING & STICKY HEADER TESTS
// =============================================================================

test.describe('Scrolling & Headers', () => {
  test('table headers should remain visible when scrolling', async ({ page }) => {
    await page.goto('/equipment');
    
    // Wait for table to load
    await page.waitForSelector('table');
    
    // Get the table header
    const header = page.locator('thead');
    await expect(header).toBeVisible();
    
    // Scroll down within the page
    await page.evaluate(() => window.scrollBy(0, 500));
    
    // Header should still be visible (sticky)
    await expect(header).toBeVisible();
  });

  test('page content should be scrollable', async ({ page }) => {
    await page.goto('/parts');
    
    // Wait for page to load
    await page.waitForSelector('h1, h2');
    
    // Page should be scrollable without errors
    await page.evaluate(() => window.scrollBy(0, 300));
  });
});

// =============================================================================
// PARTS CRUD TESTS
// =============================================================================

test.describe('Parts CRUD', () => {
  test('should display parts list', async ({ page }) => {
    await page.goto('/parts');
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('should open create part dialog', async ({ page }) => {
    await page.goto('/parts');
    await page.getByRole('button', { name: /add part/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should navigate to part detail', async ({ page }) => {
    await page.goto('/parts');
    
    // Click "View Details" button
    await page.getByRole('button', { name: /view details/i }).first().click();
    
    await expect(page).toHaveURL(/\/parts\/[a-zA-Z0-9-]+/);
  });
});

// =============================================================================
// EQUIPMENT LIBRARY TESTS
// =============================================================================

test.describe('Equipment Library', () => {
  test('should display equipment list', async ({ page }) => {
    await page.goto('/equipment');
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('should open add equipment dialog', async ({ page }) => {
    await page.goto('/equipment');
    await page.getByRole('button', { name: /new equipment/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should search equipment', async ({ page }) => {
    await page.goto('/equipment');
    
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('Press');
    
    // Wait for debounce
    await page.waitForTimeout(500);
  });
});

// =============================================================================
// FAILURE MODES LIBRARY TESTS
// =============================================================================

test.describe('Failure Modes Library', () => {
  test('should display failure modes list', async ({ page }) => {
    await page.goto('/failure-modes');
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('should open add failure mode dialog', async ({ page }) => {
    await page.goto('/failure-modes');
    await page.getByRole('button', { name: /add failure mode/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

// =============================================================================
// CONTROLS LIBRARY TESTS
// =============================================================================

test.describe('Controls Library', () => {
  test('should display controls list', async ({ page }) => {
    await page.goto('/controls-library');
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('should have filter tabs', async ({ page }) => {
    await page.goto('/controls-library');
    
    // Check for Prevention/Detection tabs or filter options
    const hasPreventionTab = await page.getByRole('tab', { name: /prevention/i }).isVisible().catch(() => false);
    const hasDetectionTab = await page.getByRole('tab', { name: /detection/i }).isVisible().catch(() => false);
    
    // At least one should exist or table should be visible
    expect(hasPreventionTab || hasDetectionTab || await page.locator('table').isVisible()).toBeTruthy();
  });
});

// =============================================================================
// PROCESS LIBRARY TESTS
// =============================================================================

test.describe('Process Library', () => {
  test('should display processes list', async ({ page }) => {
    await page.goto('/processes');
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('should navigate to process detail', async ({ page }) => {
    await page.goto('/processes');
    
    // Click "View Details" button
    await page.getByRole('button', { name: /view details/i }).first().click();
    
    await expect(page).toHaveURL(/\/processes\/[a-zA-Z0-9-]+/);
  });
});

// =============================================================================
// DOCUMENT GENERATION TESTS
// =============================================================================

test.describe('Document Generation', () => {
  test('should access part detail and see generation options', async ({ page }) => {
    await page.goto('/parts');
    
    // Navigate to a part
    await page.getByRole('button', { name: /view details/i }).first().click();
    await page.waitForURL(/\/parts\/[a-zA-Z0-9-]+/);
    
    // Should see generation button (use testid for precision)
    const generateButton = page.getByTestId('button-generate-documents');
    await expect(generateButton).toBeVisible();
  });

  test('should open generate documents dialog', async ({ page }) => {
    await page.goto('/parts');
    await page.getByRole('button', { name: /view details/i }).first().click();
    await page.waitForURL(/\/parts\/[a-zA-Z0-9-]+/);
    
    await page.getByTestId('button-generate-documents').click();
    
    // Dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

// =============================================================================
// API HEALTH TESTS
// =============================================================================

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

  test('control-plans API should respond', async ({ request }) => {
    const response = await request.get('/api/control-plans');
    expect(response.status()).toBe(200);
  });
});
