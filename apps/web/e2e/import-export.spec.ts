import { test, expect } from '@playwright/test';

const ECHO = 'http://localhost:4000/__echo';

test.describe('Phase 5 — Import / Export / Codegen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('imports a cURL command into a new tab', async ({ page }) => {
    await page.getByTestId('import-button').click();
    await page.getByTestId('import-mode-curl').click();
    await page
      .getByTestId('import-text')
      .fill(`curl -X POST '${ECHO}?q=abc' -H 'X-From: test' --data '{"a":1}'`);
    await page.getByTestId('import-confirm').click();

    await expect(page.getByTestId('import-dialog')).toHaveCount(0);
    await expect(page.getByTestId('url-input')).toHaveValue(`${ECHO}`);
    await expect(page.getByTestId('method-select')).toHaveValue('POST');

    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-status')).toContainText('200');
    await expect(page.getByTestId('response-body')).toContainText('"x-from": "test"');
    await expect(page.getByTestId('response-body')).toContainText('"q": "abc"');
  });

  test('imports a Postman v2.1 collection into the sidebar', async ({ page }) => {
    const collection = {
      info: { name: 'Imported', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
      item: [
        {
          name: 'Echo',
          request: { method: 'GET', url: ECHO, header: [] },
        },
      ],
    };
    await page.getByTestId('import-button').click();
    await page.getByTestId('import-mode-postman').click();
    await page.getByTestId('import-text').fill(JSON.stringify(collection));
    await page.getByTestId('import-confirm').click();

    await page.getByTestId('sidebar-section-collections').click();
    await expect(page.getByTestId('collections-list')).toContainText('Imported');
    await expect(page.getByTestId('collections-list')).toContainText('Echo');

    await page.getByTestId('collections-list').getByText('Echo').click();
    await expect(page.getByTestId('url-input')).toHaveValue(ECHO);
  });

  test('shows a cURL snippet in the codegen panel and switches languages', async ({ page }) => {
    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('codegen-button').click();

    await expect(page.getByTestId('codegen-output')).toContainText(`curl -X GET '${ECHO}'`);

    await page.getByTestId('codegen-language').selectOption('fetch');
    await expect(page.getByTestId('codegen-output')).toContainText('await fetch(');

    await page.getByTestId('codegen-language').selectOption('python');
    await expect(page.getByTestId('codegen-output')).toContainText('import requests');
  });

  test('import error surfaces a message', async ({ page }) => {
    await page.getByTestId('import-button').click();
    await page.getByTestId('import-mode-curl').click();
    await page.getByTestId('import-text').fill('curl -X GET');
    await page.getByTestId('import-confirm').click();
    await expect(page.getByTestId('import-error')).toContainText('URL');
  });
});
