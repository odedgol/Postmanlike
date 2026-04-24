import { test, expect } from '@playwright/test';

const ECHO = 'http://localhost:4000/__echo';

test.describe('Phase 2 — Collections, Save, Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Each Playwright test gets a fresh browser context, so IndexedDB is
    // empty. Just load the app.
    await page.goto('/');
  });

  test('creates a collection from the sidebar', async ({ page }) => {
    await page.getByTestId('sidebar-section-collections').click();
    await page.getByTestId('new-collection-input').fill('My API');
    await page.getByTestId('new-collection-button').click();
    await expect(page.getByTestId('collections-list')).toContainText('My API');
  });

  test('saves a request into a collection and opens it from the sidebar', async ({ page }) => {
    await page.getByTestId('sidebar-section-collections').click();
    await page.getByTestId('new-collection-input').fill('Echo');
    await page.getByTestId('new-collection-button').click();

    await page.getByTestId('url-input').fill(`${ECHO}?saved=yes`);
    await page.getByTestId('save-button').click();

    await expect(page.getByTestId('save-dialog')).toBeVisible();
    await page.getByTestId('save-dialog-name').fill('Echo Saved');
    await page.getByTestId('save-dialog-confirm').click();

    // Dialog closes, sidebar shows the saved request.
    await expect(page.getByTestId('save-dialog')).toHaveCount(0);
    await expect(page.getByTestId('collections-list')).toContainText('Echo Saved');

    // Open a fresh tab from the saved request and confirm the URL restored.
    await page
      .getByTestId('collections-list')
      .getByText('Echo Saved')
      .click();
    await expect(page.getByTestId('url-input')).toHaveValue(`${ECHO}?saved=yes`);
  });

  test('tab becomes dirty when edited after save; save again clears the dot', async ({ page }) => {
    await page.getByTestId('sidebar-section-collections').click();
    await page.getByTestId('new-collection-input').fill('Dirty');
    await page.getByTestId('new-collection-button').click();

    await page.getByTestId('url-input').fill(`${ECHO}?v=1`);
    await page.getByTestId('save-button').click();
    await page.getByTestId('save-dialog-name').fill('V1');
    await page.getByTestId('save-dialog-confirm').click();

    await expect(page.getByTestId('dirty-dot')).toHaveCount(0);

    await page.getByTestId('url-input').fill(`${ECHO}?v=2`);
    await expect(page.getByTestId('dirty-dot')).toBeVisible();

    await page.getByTestId('save-button').click();
    await page.getByTestId('save-dialog-confirm').click();
    await expect(page.getByTestId('dirty-dot')).toHaveCount(0);
  });

  test('open tabs survive a page reload', async ({ page }) => {
    await page.getByTestId('url-input').fill(`${ECHO}?persist=1`);
    // Wait past the 250ms debounce on tab persistence.
    await page.waitForTimeout(500);

    await page.reload();

    await expect(page.getByTestId('url-input')).toHaveValue(`${ECHO}?persist=1`);
  });

  test('Ctrl+S opens the save dialog', async ({ page }) => {
    await page.getByTestId('url-input').fill(`${ECHO}?shortcut=1`);
    await page.keyboard.press('Control+s');
    await expect(page.getByTestId('save-dialog')).toBeVisible();
  });

  test('deleting a collection removes its saved requests', async ({ page }) => {
    await page.getByTestId('sidebar-section-collections').click();
    await page.getByTestId('new-collection-input').fill('Trash');
    await page.getByTestId('new-collection-button').click();

    await page.getByTestId('url-input').fill(ECHO);
    await page.getByTestId('save-button').click();
    await page.getByTestId('save-dialog-name').fill('Gone Soon');
    await page.getByTestId('save-dialog-confirm').click();

    await expect(page.getByTestId('collections-list')).toContainText('Gone Soon');

    page.once('dialog', (d) => d.accept());
    await page
      .locator('[data-testid^="delete-collection-"]')
      .first()
      .click({ force: true });

    await expect(page.getByTestId('collections-list')).not.toContainText('Gone Soon');
  });
});
