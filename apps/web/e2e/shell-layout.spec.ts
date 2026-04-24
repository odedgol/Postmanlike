import { test, expect } from '@playwright/test';

test.describe('Shell layout', () => {
  test('main content takes the majority of the viewport; ConsolePanel is compact when closed', async ({
    page,
  }) => {
    await page.goto('/');
    // Reset any prior per-browser state that might have persisted the
    // console's open / sized state.
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    const viewport = page.viewportSize()!;
    const main = await page.locator('main').boundingBox();
    const sidebar = await page.getByTestId('sidebar').boundingBox();
    const console_ = await page.getByTestId('console').boundingBox();

    expect(main).not.toBeNull();
    expect(sidebar).not.toBeNull();
    expect(console_).not.toBeNull();

    // Closed console = just the toggle strip; generous upper bound but well
    // below the viewport height. Previously the null-returning UpdateBanner
    // made the grid assign ConsolePanel the 1fr slot and it ate ~70% of the
    // viewport.
    expect(console_!.height).toBeLessThan(80);

    // Main content area should take up >= 60% of the viewport height.
    expect(main!.height).toBeGreaterThan(viewport.height * 0.6);
    expect(sidebar!.height).toBeGreaterThan(viewport.height * 0.6);
  });
});
