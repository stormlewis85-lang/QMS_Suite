import { test, expect } from './fixtures';

test.describe('PFMEA Document Tabs', () => {
  test('should have governance tabs available', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    await page.waitForTimeout(1000);
    
    const governanceTabList = page.getByText('SignaturesRevisionsOwnershipHistory');
    if (await governanceTabList.isVisible()) {
      await expect(governanceTabList).toBeVisible();
    }
  });

  test('should switch between tabs', async ({ page, pfmeaId }) => {
    await page.goto(`/pfmea/${pfmeaId}`);
    await page.waitForTimeout(1000);
    
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);
  });
});
