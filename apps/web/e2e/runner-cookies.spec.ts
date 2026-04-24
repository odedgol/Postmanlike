import { test, expect, request as pwRequest } from '@playwright/test';

const PROXY = 'http://localhost:4000';
const ECHO = `${PROXY}/__echo`;
const SETCOOKIE = `${PROXY}/__setcookie`;

test.describe('Phase 7 — Collection Runner + Cookies', () => {
  test.beforeEach(async ({ page }) => {
    // Clear the shared proxy cookie jar between runs.
    const api = await pwRequest.newContext();
    await api.delete(`${PROXY}/cookies`);
    await api.dispose();
    await page.goto('/');
  });

  test('runs a saved collection and reports pass/fail summary', async ({ page }) => {
    await page.getByTestId('sidebar-section-collections').click();
    await page.getByTestId('new-collection-input').fill('R');
    await page.getByTestId('new-collection-button').click();

    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('section-tests').click();
    await page
      .getByTestId('test-script-editor')
      .fill('pm.test("200", () => pm.expect(pm.response.status).toBe(200))');
    await page.getByTestId('save-button').click();
    await page.getByTestId('save-dialog-name').fill('Echo');
    await page.getByTestId('save-dialog-confirm').click();

    await page.getByTestId('runner-button').click();
    await page.getByTestId('runner-start').click();
    await expect(page.getByTestId('runner-summary')).toContainText('1 passed');
  });

  test('cookies set by a response land in the sidebar cookie jar', async ({ page }) => {
    await page.getByTestId('url-input').fill(`${SETCOOKIE}?name=sid&value=abc`);
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-status')).toContainText('200');

    await page.getByTestId('sidebar-section-cookies').click();
    await expect(page.getByTestId('cookies-panel')).toBeVisible();
    await expect(page.getByTestId('cookie-item').first()).toContainText('sid=');
    await expect(page.getByTestId('cookie-item').first()).toContainText('abc');
  });

  test('a stored cookie is attached to a subsequent request to the same domain', async ({
    page,
  }) => {
    await page.getByTestId('url-input').fill(`${SETCOOKIE}?name=sid&value=xyz`);
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-status')).toContainText('200');

    // New request to /__echo on localhost should carry sid=xyz in the Cookie header.
    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-body')).toContainText('"cookie": "sid=xyz"');
  });

  test('clear cookies wipes the jar', async ({ page }) => {
    await page.getByTestId('url-input').fill(`${SETCOOKIE}?name=t&value=1`);
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-status')).toContainText('200');

    await page.getByTestId('sidebar-section-cookies').click();
    await expect(page.getByTestId('cookie-item').first()).toBeVisible();
    await page.getByTestId('cookies-clear').click();
    await expect(page.getByTestId('cookies-empty')).toBeVisible();
  });
});
