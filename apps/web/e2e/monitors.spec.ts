import { test, expect, request as pwRequest } from '@playwright/test';

const PROXY = 'http://localhost:4000';
const ECHO = `${PROXY}/__echo`;

test.describe('Phase 9 — Monitors', () => {
  test.beforeEach(async ({ page }) => {
    const api = await pwRequest.newContext();
    const list = await (await api.get(`${PROXY}/monitors`)).json();
    for (const m of list.monitors ?? []) await api.delete(`${PROXY}/monitors/${m.id}`);
    await api.dispose();
    await page.goto('/');
  });

  test('creates a monitor, runs it on demand, shows the run summary', async ({ page }) => {
    // Build a 1-request collection with a passing test.
    await page.getByTestId('sidebar-section-collections').click();
    await page.getByTestId('new-collection-input').fill('M');
    await page.getByTestId('new-collection-button').click();

    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('section-tests').click();
    await page
      .getByTestId('test-script-editor')
      .fill('pm.test("ok", () => pm.expect(pm.response.status).toBe(200))');
    await page.getByTestId('save-button').click();
    await page.getByTestId('save-dialog-name').fill('Echo');
    await page.getByTestId('save-dialog-confirm').click();

    // Switch to Monitors panel and create a monitor for that collection.
    await page.getByTestId('sidebar-section-monitors').click();
    await page.getByTestId('monitor-name').fill('Every 60s');
    await page.getByTestId('monitor-collection').selectOption({ label: 'M' });
    await page.getByTestId('monitor-schedule').fill('60');
    await page.getByTestId('monitor-create').click();

    await expect(page.getByTestId('monitor-item').first()).toBeVisible();

    // Trigger an immediate run and wait for the summary to land.
    await page.locator('[data-testid^="monitor-run-"]').first().click();
    await expect(page.locator('[data-testid^="monitor-latest-"]').first()).toContainText(
      '1 passed',
    );
  });

  test('empty state when no monitors', async ({ page }) => {
    await page.getByTestId('sidebar-section-monitors').click();
    await expect(page.getByTestId('monitors-empty')).toBeVisible();
  });

  test('delete a monitor', async ({ page }) => {
    // Create a dummy collection + monitor directly via the API to keep the
    // test focused on the delete interaction.
    const api = await pwRequest.newContext();
    await api.put(`${PROXY}/monitors/dead`, {
      data: {
        name: 'Doomed',
        scheduleSec: 60,
        snapshot: { requests: [], environment: {}, globals: {} },
      },
    });
    await api.dispose();

    await page.goto('/');
    await page.getByTestId('sidebar-section-monitors').click();
    await expect(page.getByTestId('monitor-item').first()).toBeVisible();
    await page.getByTestId('monitor-delete-dead').click();
    await expect(page.getByTestId('monitors-empty')).toBeVisible();
  });
});
