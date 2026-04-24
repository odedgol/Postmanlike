import { test, expect } from '@playwright/test';

test.describe('Phase 11 — Accounts', () => {
  test('sign up, see chip, sign out', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('signin-button').click();
    await expect(page.getByTestId('signin-dialog')).toBeVisible();
    await page.getByTestId('signin-toggle-mode').click();

    const email = `user-${Date.now()}@example.com`;
    await page.getByTestId('signin-email').fill(email);
    await page.getByTestId('signin-password').fill('password1');
    await page.getByTestId('signin-submit').click();

    await expect(page.getByTestId('user-chip')).toContainText(email);
    await page.getByTestId('signout-button').click();
    await expect(page.getByTestId('signin-button')).toBeVisible();
  });

  test('login error surfaces a message for unknown credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('signin-button').click();
    await page.getByTestId('signin-email').fill('nobody@example.com');
    await page.getByTestId('signin-password').fill('password1');
    await page.getByTestId('signin-submit').click();
    await expect(page.getByTestId('signin-error')).toContainText('invalid credentials');
  });
});
