import { test, expect, request as pwRequest } from '@playwright/test';

const PROXY = 'http://localhost:4000';

async function registerViaApi(email: string, password = 'password1') {
  const api = await pwRequest.newContext();
  await api.post(`${PROXY}/auth/register`, { data: { email, password } }).catch(() => {
    // Already exists from a previous test run — ignore.
  });
  await api.dispose();
}

async function signInThroughUI(page: import('@playwright/test').Page, email: string, password = 'password1') {
  await page.getByTestId('signin-button').click();
  await page.getByTestId('signin-email').fill(email);
  await page.getByTestId('signin-password').fill(password);
  await page.getByTestId('signin-submit').click();
  await expect(page.getByTestId('user-chip')).toContainText(email);
}

test.describe('Per-user workspace sync', () => {
  // Each test uses its own pair of account emails so a retry doesn't collide
  // with server state from the previous run.
  test('collections saved by one user are not visible to another', async ({ page }) => {
    const alice = `alice-${Date.now()}@example.com`;
    const bob = `bob-${Date.now()}@example.com`;
    await registerViaApi(alice);
    await registerViaApi(bob);

    await page.goto('/');
    await signInThroughUI(page, alice);

    // Alice creates a collection and waits for the debounced push.
    await page.getByTestId('sidebar-section-collections').click();
    await page.getByTestId('new-collection-input').fill('Alice API');
    await page.getByTestId('new-collection-button').click();
    await expect(page.getByTestId('collections-list')).toContainText('Alice API');
    await page.waitForTimeout(800); // > PUSH_DEBOUNCE_MS

    // Alice signs out → local data wiped.
    await page.getByTestId('signout-button').click();
    await expect(page.getByTestId('collections-list')).not.toContainText('Alice API');

    // Bob signs in → sees nothing of Alice's.
    await signInThroughUI(page, bob);
    await page.getByTestId('sidebar-section-collections').click();
    await expect(page.getByTestId('collections-list')).not.toContainText('Alice API');

    // Alice signs back in → her collection comes back from the server.
    await page.getByTestId('signout-button').click();
    await signInThroughUI(page, alice);
    await page.getByTestId('sidebar-section-collections').click();
    await expect(page.getByTestId('collections-list')).toContainText('Alice API');
  });

  test('environments created by one user do not leak to another', async ({ page }) => {
    const alice = `env-alice-${Date.now()}@example.com`;
    const bob = `env-bob-${Date.now()}@example.com`;
    await registerViaApi(alice);
    await registerViaApi(bob);

    await page.goto('/');
    await signInThroughUI(page, alice);

    await page.getByTestId('env-manage-button').click();
    await page.getByTestId('env-new-name').fill('Alice Env');
    await page.getByTestId('env-new-button').click();
    await page.waitForTimeout(800);
    await page.getByTestId('env-close-button').click();
    // Env selector now lists Alice's env.
    await expect(page.getByTestId('env-select')).toContainText('Alice Env');

    // Switch user.
    await page.getByTestId('signout-button').click();
    await expect(page.getByTestId('env-select')).not.toContainText('Alice Env');
    await signInThroughUI(page, bob);
    await expect(page.getByTestId('env-select')).not.toContainText('Alice Env');
  });
});
