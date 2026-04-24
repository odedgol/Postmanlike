import { test, expect } from '@playwright/test';

test.describe('Console resize', () => {
  test('dragging the handle up grows the body; drag down shrinks it', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.removeItem('postmanlike.console.height'));
    await page.reload();

    await page.getByTestId('console-toggle').click();
    const body = page.getByTestId('console-body');
    const handle = page.getByTestId('console-resize-handle');

    const initial = (await body.boundingBox())!;
    const hb = (await handle.boundingBox())!;

    // Drag the handle upwards by 80 pixels.
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 - 80, { steps: 8 });
    await page.mouse.up();

    const grown = (await body.boundingBox())!;
    expect(grown.height).toBeGreaterThan(initial.height + 40);

    // Drag back down by 60 pixels.
    const hb2 = (await handle.boundingBox())!;
    await page.mouse.move(hb2.x + hb2.width / 2, hb2.y + hb2.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb2.x + hb2.width / 2, hb2.y + hb2.height / 2 + 60, { steps: 6 });
    await page.mouse.up();

    const shrunk = (await body.boundingBox())!;
    expect(shrunk.height).toBeLessThan(grown.height - 20);
  });

  test('height persists across reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.removeItem('postmanlike.console.height'));
    await page.reload();

    await page.getByTestId('console-toggle').click();
    const handle = page.getByTestId('console-resize-handle');
    const hb = (await handle.boundingBox())!;

    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 - 100, { steps: 10 });
    await page.mouse.up();

    const grown = (await page.getByTestId('console-body').boundingBox())!;

    await page.reload();
    await page.getByTestId('console-toggle').click();
    const afterReload = (await page.getByTestId('console-body').boundingBox())!;
    expect(Math.round(afterReload.height)).toBe(Math.round(grown.height));
  });
});
