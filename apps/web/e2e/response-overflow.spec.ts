import { test, expect, request as pwRequest } from '@playwright/test';

const PROXY = 'http://localhost:4000';

// Helper: POST a long JSON payload to /__echo so the response body is
// definitely taller than the viewport.
async function sendBigJson(page: import('@playwright/test').Page) {
  const big = {
    lines: Array.from({ length: 400 }, (_, i) => `line-${i}-${'x'.repeat(40)}`),
  };
  await page.getByTestId('method-select').selectOption('POST');
  await page.getByTestId('url-input').fill(`${PROXY}/__echo`);
  await page.getByTestId('section-body').click();
  await page.getByTestId('body-mode-raw-json').check();
  await page.getByTestId('body-raw').fill(JSON.stringify(big));
  await page.getByTestId('send-button').click();
  await expect(page.getByTestId('response-status')).toContainText('200');
}

test.describe('Response body layout', () => {
  test('a tall response body scrolls inside its container; does not overflow into the console', async ({
    page,
  }) => {
    await page.goto('/');
    await sendBigJson(page);

    const bodyBox = (await page.getByTestId('response-body').boundingBox())!;
    const responseContainer = page.locator('[data-testid="response-view"]');
    const containerBox = (await responseContainer.boundingBox())!;
    const consoleBox = (await page.getByTestId('console').boundingBox())!;

    // 1. The rendered <pre> for the response body starts inside the response
    //    container — if the layout bug from earlier returned, the body would
    //    grow past the container and overlap the console.
    expect(bodyBox.y).toBeGreaterThanOrEqual(containerBox.y - 1);

    // 2. The response container's bottom edge is at or above the console's
    //    top edge. No overlap.
    expect(containerBox.y + containerBox.height).toBeLessThanOrEqual(consoleBox.y + 1);

    // 3. The scrollable area inside the response has a scrollHeight larger
    //    than its clientHeight — i.e. scrolling is actually engaged rather
    //    than the <pre> overflowing the flex parent. The scroll container is
    //    the response-view's direct descendant that wraps the body tab — it
    //    carries overflow-y: auto.
    const scrollInfo = await page.evaluate(() => {
      const view = document.querySelector('[data-testid="response-view"]')!;
      const scroller = Array.from(view.children).find((c) => {
        const o = getComputedStyle(c as HTMLElement).overflowY;
        return o === 'auto' || o === 'scroll';
      }) as HTMLElement;
      return {
        scrollHeight: scroller.scrollHeight,
        clientHeight: scroller.clientHeight,
      };
    });
    expect(scrollInfo.scrollHeight).toBeGreaterThan(scrollInfo.clientHeight + 100);
  });

  test('expanding the console does not push the response body off-screen', async ({ page }) => {
    await page.goto('/');
    await sendBigJson(page);
    await page.getByTestId('console-toggle').click();

    // Drag the console handle up by 200px to make it tall.
    const handle = page.getByTestId('console-resize-handle');
    const hb = (await handle.boundingBox())!;
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 - 200, { steps: 20 });
    await page.mouse.up();

    const responseBox = (await page.locator('[data-testid="response-view"]').boundingBox())!;
    const consoleBox = (await page.getByTestId('console').boundingBox())!;
    // Response container bottom still sits above the console.
    expect(responseBox.y + responseBox.height).toBeLessThanOrEqual(consoleBox.y + 1);
    // Response container still has non-trivial height to render into.
    expect(responseBox.height).toBeGreaterThan(50);
  });
});
