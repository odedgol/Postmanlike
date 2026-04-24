import { test, expect } from '@playwright/test';

test.describe('Phase 12 — PWA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('HTML declares the manifest, theme color, and apple-touch-icon', async ({ page }) => {
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ff6c37');
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      /apple-touch-icon/,
    );
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
      'content',
      'yes',
    );
  });

  test('manifest is served with name and the icon set', async ({ request }) => {
    const res = await request.get('http://localhost:5173/manifest.webmanifest');
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.name).toBe('Postmanlike');
    expect(body.display).toBe('standalone');
    const sizes = (body.icons as Array<{ sizes?: string }>).map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(
      (body.icons as Array<{ purpose?: string }>).some((i) => i.purpose === 'maskable'),
    ).toBe(true);
  });

  test('install button is hidden by default, appears when beforeinstallprompt fires', async ({
    page,
  }) => {
    await expect(page.getByTestId('install-button')).toHaveCount(0);

    // Synthesize a beforeinstallprompt event and record a `prompt()` call.
    await page.evaluate(() => {
      const e = new Event('beforeinstallprompt') as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
      };
      let resolved = false;
      e.prompt = () => {
        (window as unknown as { __promptCalled?: boolean }).__promptCalled = true;
        resolved = true;
        return Promise.resolve();
      };
      e.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
      // Stash the event on window so the hook can read it (the listener in the
      // hook runs on window events too).
      window.dispatchEvent(e);
      // Touch `resolved` so TS doesn't complain about the unused var.
      void resolved;
    });

    await expect(page.getByTestId('install-button')).toBeVisible();
    await page.getByTestId('install-button').click();
    await expect.poll(() =>
      page.evaluate(
        () => (window as unknown as { __promptCalled?: boolean }).__promptCalled === true,
      ),
    ).toBe(true);
    // After install() resolves the button unmounts.
    await expect(page.getByTestId('install-button')).toHaveCount(0);
  });
});
