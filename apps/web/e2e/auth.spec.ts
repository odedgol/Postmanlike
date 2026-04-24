import { test, expect } from '@playwright/test';

const ECHO = 'http://localhost:4000/__echo';

test.describe('Phase 6 — Auth', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Bearer token is sent as Authorization header', async ({ page }) => {
    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('section-auth').click();
    await page.getByTestId('auth-type').selectOption('bearer');
    await page.getByTestId('auth-bearer-token').fill('abc.def');
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-body')).toContainText('"authorization": "Bearer abc.def"');
  });

  test('Basic auth base64-encodes user:password', async ({ page }) => {
    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('section-auth').click();
    await page.getByTestId('auth-type').selectOption('basic');
    await page.getByTestId('auth-basic-username').fill('alice');
    await page.getByTestId('auth-basic-password').fill('s3cret');
    await page.getByTestId('send-button').click();
    const expected = `Basic ${Buffer.from('alice:s3cret').toString('base64')}`;
    await expect(page.getByTestId('response-body')).toContainText(`"authorization": "${expected}"`);
  });

  test('API key (header) sends the named header', async ({ page }) => {
    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('section-auth').click();
    await page.getByTestId('auth-type').selectOption('api-key');
    await page.getByTestId('auth-apikey-key').fill('x-api-key');
    await page.getByTestId('auth-apikey-value').fill('k1');
    await page.getByTestId('auth-apikey-location').selectOption('header');
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-body')).toContainText('"x-api-key": "k1"');
  });

  test('API key (query) appends the param to the URL', async ({ page }) => {
    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('section-auth').click();
    await page.getByTestId('auth-type').selectOption('api-key');
    await page.getByTestId('auth-apikey-key').fill('token');
    await page.getByTestId('auth-apikey-value').fill('t-123');
    await page.getByTestId('auth-apikey-location').selectOption('query');
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-body')).toContainText('"token": "t-123"');
  });

  test('AWS SigV4 adds Authorization and X-Amz headers via the proxy', async ({ page }) => {
    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('section-auth').click();
    await page.getByTestId('auth-type').selectOption('aws-sigv4');
    await page.getByTestId('auth-aws-access-key').fill('AKIAIOSFODNN7EXAMPLE');
    await page.getByTestId('auth-aws-secret-key').fill('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    await page.getByTestId('auth-aws-region').fill('us-east-1');
    await page.getByTestId('auth-aws-service').fill('execute-api');
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-body')).toContainText('"authorization": "AWS4-HMAC-SHA256');
    await expect(page.getByTestId('response-body')).toContainText('"x-amz-date"');
    await expect(page.getByTestId('response-body')).toContainText('"x-amz-content-sha256"');
  });
});
