import { test, expect } from '@playwright/test';

const ECHO = 'http://localhost:4000/__echo';

test.describe('Phase 1 — Request/Response MVP', () => {
  test('sends a GET and renders the response body, status, time, size', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('method-select').selectOption('GET');
    await page.getByTestId('url-input').fill(`${ECHO}?hello=world`);
    await page.getByTestId('send-button').click();

    await expect(page.getByTestId('response-status')).toContainText('200');
    await expect(page.getByTestId('response-time')).toBeVisible();
    await expect(page.getByTestId('response-size')).toBeVisible();
    await expect(page.getByTestId('response-body')).toContainText('"method": "GET"');
    await expect(page.getByTestId('response-body')).toContainText('"hello": "world"');
  });

  test('sends a POST with JSON body and echoes it back', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('method-select').selectOption('POST');
    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('section-body').click();
    await page.getByTestId('body-mode-raw-json').check();
    await page.getByTestId('body-raw').fill('{"answer":42}');
    await page.getByTestId('send-button').click();

    await expect(page.getByTestId('response-status')).toContainText('200');
    await expect(page.getByTestId('response-body')).toContainText('"answer": 42');
  });

  test('records history and restores a request from it', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('url-input').fill(`${ECHO}?from=history`);
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-status')).toContainText('200');

    await expect(page.getByTestId('history-item').first()).toBeVisible();
    // Click the most recent history item → opens a new tab with the same URL.
    await page.getByTestId('history-item').first().click();
    await expect(page.getByTestId('url-input')).toHaveValue(`${ECHO}?from=history`);
  });

  test('response error path surfaces the proxy error', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('url-input').fill('not-a-valid-url');
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-error')).toBeVisible();
  });

  test('header changes show in the echoed request', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('url-input').fill(ECHO);

    await page.getByTestId('section-headers').click();
    await page.getByTestId('headers-table-key-0').fill('x-custom');
    await page.getByTestId('headers-table-value-0').fill('abc123');

    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-body')).toContainText('"x-custom": "abc123"');
  });
});
