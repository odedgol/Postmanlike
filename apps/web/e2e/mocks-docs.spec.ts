import { test, expect, request as pwRequest } from '@playwright/test';

const PROXY = 'http://localhost:4000';
const ECHO = `${PROXY}/__echo`;

test.describe('Phase 8 — Mocks + Docs', () => {
  test.beforeEach(async ({ page }) => {
    const api = await pwRequest.newContext();
    const list = await (await api.get(`${PROXY}/mocks`)).json();
    for (const m of list.mocks ?? []) await api.delete(`${PROXY}/mocks/${m.id}`);
    await api.dispose();
    await page.goto('/');
  });

  test('creates a mock from the current response and serves it', async ({ page }) => {
    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-status')).toContainText('200');

    await page.getByTestId('sidebar-section-mocks').click();
    await page.getByTestId('mocks-create').click();
    await expect(page.getByTestId('mock-item').first()).toBeVisible();

    // Click the mock to open a new tab with the /mock/:id/... URL, then Send.
    await page.locator('[data-testid^="mock-open-"]').first().click();
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('response-status')).toContainText('200');
    // The mock responds with the same body the real /__echo returned.
    await expect(page.getByTestId('response-body')).toContainText('"method": "GET"');
  });

  test('empty state is shown before any mock is created', async ({ page }) => {
    await page.getByTestId('sidebar-section-mocks').click();
    await expect(page.getByTestId('mocks-empty')).toBeVisible();
  });

  test('opens the collection docs modal with the saved requests', async ({ page }) => {
    await page.getByTestId('sidebar-section-collections').click();
    await page.getByTestId('new-collection-input').fill('Docs');
    await page.getByTestId('new-collection-button').click();

    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('save-button').click();
    await page.getByTestId('save-dialog-name').fill('Echo Req');
    await page.getByTestId('save-dialog-confirm').click();

    // Docs button is revealed on hover, but is present in the DOM.
    await page.locator('[data-testid^="docs-collection-"]').first().click({ force: true });
    await expect(page.getByTestId('docs-dialog')).toBeVisible();
    await expect(page.getByTestId('docs-body')).toContainText('Echo Req');
    await expect(page.getByTestId('docs-request').first()).toContainText(ECHO);
  });
});
