import { test, expect } from '@playwright/test';

test.describe('Request / response split resize', () => {
  test('dragging the divider down grows the request pane, up grows the response', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() =>
      window.localStorage.removeItem('postmanlike.requestResponseSplit'),
    );
    await page.reload();

    const req = page.getByTestId('request-pane');
    const res = page.getByTestId('response-pane');
    const handle = page.getByTestId('split-handle');

    const r0 = (await req.boundingBox())!;
    const s0 = (await res.boundingBox())!;

    // Drag the handle down 100px → request grows, response shrinks.
    const hb = (await handle.boundingBox())!;
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + 100, { steps: 10 });
    await page.mouse.up();

    const r1 = (await req.boundingBox())!;
    const s1 = (await res.boundingBox())!;
    expect(r1.height).toBeGreaterThan(r0.height + 50);
    expect(s1.height).toBeLessThan(s0.height - 50);

    // Drag back up 150px → response grows past its original size.
    const hb2 = (await handle.boundingBox())!;
    await page.mouse.move(hb2.x + hb2.width / 2, hb2.y + hb2.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb2.x + hb2.width / 2, hb2.y + hb2.height / 2 - 150, { steps: 15 });
    await page.mouse.up();

    const r2 = (await req.boundingBox())!;
    const s2 = (await res.boundingBox())!;
    expect(s2.height).toBeGreaterThan(s0.height);
    expect(r2.height).toBeLessThan(r1.height);
  });

  test('split ratio persists across reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() =>
      window.localStorage.removeItem('postmanlike.requestResponseSplit'),
    );
    await page.reload();

    const handle = page.getByTestId('split-handle');
    const hb = (await handle.boundingBox())!;
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + 120, { steps: 12 });
    await page.mouse.up();

    const beforeReload = (await page.getByTestId('request-pane').boundingBox())!;

    await page.reload();
    const afterReload = (await page.getByTestId('request-pane').boundingBox())!;
    expect(Math.abs(afterReload.height - beforeReload.height)).toBeLessThan(3);
  });
});
