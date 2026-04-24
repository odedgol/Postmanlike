import { test, expect } from '@playwright/test';

const ECHO = 'http://localhost:4000/__echo';

test.describe('Phase 4 — Scripting, Tests, Console', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('test script passing assertion shows in Tests tab', async ({ page }) => {
    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('section-tests').click();
    await page.getByTestId('test-script-editor').fill(
      'pm.test("200 OK", () => pm.expect(pm.response.status).toBe(200));',
    );

    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-status')).toContainText('200');

    await page.getByTestId('response-tab-tests').click();
    await expect(page.getByTestId('tests-passed')).toHaveText('1 passed');
    await expect(page.getByTestId('test-result-pass')).toContainText('200 OK');
  });

  test('failing assertion lands in Tests tab with a message', async ({ page }) => {
    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('section-tests').click();
    await page.getByTestId('test-script-editor').fill(
      'pm.test("wrong status", () => pm.expect(pm.response.status).toBe(404));',
    );
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-status')).toContainText('200');

    await page.getByTestId('response-tab-tests').click();
    await expect(page.getByTestId('tests-failed')).toHaveText('1 failed');
    await expect(page.getByTestId('test-result-message')).toContainText('to be 404');
  });

  test('pre-request script can set env var used by the URL', async ({ page }) => {
    await page.getByTestId('env-manage-button').click();
    await page.getByTestId('env-new-name').fill('Local');
    await page.getByTestId('env-new-button').click();
    await page.waitForTimeout(100);
    await page.getByTestId('env-close-button').click();
    await page.getByTestId('env-select').selectOption({ label: 'Local' });

    await page.getByTestId('url-input').fill('{{host}}/__echo');
    await page.getByTestId('section-pre-request').click();
    await page.getByTestId('pre-script-editor').fill(
      'pm.environment.set("host", "http://localhost:4000")',
    );
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-status')).toContainText('200');
  });

  test('console captures log from a test script', async ({ page }) => {
    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('section-tests').click();
    await page.getByTestId('test-script-editor').fill('console.log("hello from tests")');
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-status')).toContainText('200');

    await page.getByTestId('console-toggle').click();
    await expect(page.getByTestId('console-body')).toContainText('hello from tests');
    await expect(page.getByTestId('console-body')).toContainText('[test]');
  });

  test('pre-request script error surfaces as an error without sending', async ({ page }) => {
    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('section-pre-request').click();
    await page.getByTestId('pre-script-editor').fill('throw new Error("pre fail")');
    await page.getByTestId('send-button').click();

    await expect(page.getByTestId('response-error')).toContainText('pre fail');
  });
});
