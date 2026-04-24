import { test, expect } from '@playwright/test';

const ECHO = 'http://localhost:4000/__echo';

test.describe('Phase 3 — Environments & Variables', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('opens env manager, creates an env with a variable, activates it', async ({ page }) => {
    await page.getByTestId('env-manage-button').click();
    await expect(page.getByTestId('env-manager')).toBeVisible();

    await page.getByTestId('env-new-name').fill('Local');
    await page.getByTestId('env-new-button').click();

    await page.getByTestId('env-vars-key-0').fill('host');
    await page.getByTestId('env-vars-value-0').fill('http://localhost:4000');
    // Wait for the update to round-trip through Dexie.
    await page.waitForTimeout(100);

    await page.getByTestId('env-close-button').click();

    // The new env appears in the selector; activate it.
    await page.getByTestId('env-select').selectOption({ label: 'Local' });
  });

  test('unresolved badge shows when url uses an undefined variable', async ({ page }) => {
    await page.getByTestId('url-input').fill('{{host}}/things');
    await expect(page.getByTestId('unresolved-badge')).toBeVisible();
    await expect(page.getByTestId('unresolved-names')).toHaveText('host');
  });

  test('sending a request resolves {{host}} from the active environment', async ({ page }) => {
    // Create env with host pointing at the proxy's echo endpoint.
    await page.getByTestId('env-manage-button').click();
    await page.getByTestId('env-new-name').fill('Local');
    await page.getByTestId('env-new-button').click();
    await page.getByTestId('env-vars-key-0').fill('host');
    await page.getByTestId('env-vars-value-0').fill('http://localhost:4000');
    await page.waitForTimeout(100);
    await page.getByTestId('env-close-button').click();

    await page.getByTestId('env-select').selectOption({ label: 'Local' });

    await page.getByTestId('url-input').fill('{{host}}/__echo?via={{host}}');
    // Badge should be gone once the env supplies the variable.
    await expect(page.getByTestId('unresolved-badge')).toHaveCount(0);

    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-status')).toContainText('200');
    await expect(page.getByTestId('response-body')).toContainText('"via": "http://localhost:4000"');
  });

  test('globals are available to all requests (no active env required)', async ({ page }) => {
    await page.getByTestId('env-manage-button').click();
    await page.getByTestId('env-globals-button').click();
    await page.getByTestId('globals-vars-key-0').fill('root');
    await page.getByTestId('globals-vars-value-0').fill('http://localhost:4000');
    await page.waitForTimeout(100);
    await page.getByTestId('env-close-button').click();

    await page.getByTestId('url-input').fill('{{root}}/__echo');
    await expect(page.getByTestId('unresolved-badge')).toHaveCount(0);
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-status')).toContainText('200');
  });

  test('environment variable takes precedence over a same-name global', async ({ page }) => {
    await page.getByTestId('env-manage-button').click();
    await page.getByTestId('env-globals-button').click();
    await page.getByTestId('globals-vars-key-0').fill('host');
    await page.getByTestId('globals-vars-value-0').fill('http://global.invalid');
    await page.waitForTimeout(100);

    await page.getByTestId('env-new-name').fill('Real');
    await page.getByTestId('env-new-button').click();
    await page.getByTestId('env-vars-key-0').fill('host');
    await page.getByTestId('env-vars-value-0').fill('http://localhost:4000');
    await page.waitForTimeout(100);
    await page.getByTestId('env-close-button').click();

    await page.getByTestId('env-select').selectOption({ label: 'Real' });
    await page.getByTestId('url-input').fill('{{host}}/__echo');
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-status')).toContainText('200');
  });
});
