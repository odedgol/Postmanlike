import { test, expect } from '@playwright/test';

const ECHO = 'http://localhost:4000/__echo';

test.describe('Phase 10 — Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('sidebar-section-flows').click();
  });

  test('creates a flow with a request and an evaluate step; Run produces a context', async ({
    page,
  }) => {
    await page.getByTestId('new-flow-input').fill('Chain');
    await page.getByTestId('new-flow-button').click();

    await expect(page.getByTestId('flow-editor')).toBeVisible();
    await page.getByTestId('flow-add-request').click();
    await page.getByTestId('flow-request-url').fill(`${ECHO}?q=1`);
    await page.getByTestId('flow-request-output').fill('first');

    await page.getByTestId('flow-add-evaluate').click();
    // Two evaluate/request editors may now be present; target the last one.
    await page.getByTestId('flow-evaluate-output').last().fill('extracted');
    await page
      .getByTestId('flow-evaluate-expression')
      .last()
      .fill('first.body.query.q');

    await page.getByTestId('flow-run').click();
    await expect(page.getByTestId('flow-result').first()).toBeVisible();
    await expect(page.getByTestId('flow-context')).toContainText('"extracted": "1"');
  });

  test('empty state when no flows', async ({ page }) => {
    await expect(page.getByTestId('flows-empty')).toBeVisible();
  });

  test('delete a flow removes it from the list', async ({ page }) => {
    await page.getByTestId('new-flow-input').fill('Dead');
    await page.getByTestId('new-flow-button').click();
    // Close the editor that auto-opens.
    await page.keyboard.press('Escape'); // doesn't close by default; click Close:
    await page.locator('[data-testid="flow-editor"] button', { hasText: 'Close' }).click();

    page.once('dialog', (d) => d.accept());
    await page.locator('[data-testid^="flow-delete-"]').first().click();
    await expect(page.getByTestId('flows-empty')).toBeVisible();
  });
});
