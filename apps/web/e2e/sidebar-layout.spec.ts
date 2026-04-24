import { test, expect } from '@playwright/test';

const SECTIONS = ['collections', 'history', 'cookies', 'mocks', 'monitors', 'flows'];

test.describe('Sidebar tab strip', () => {
  test('all six section tabs are visible within the sidebar', async ({ page }) => {
    await page.goto('/');

    const sidebarBox = await page.getByTestId('sidebar').boundingBox();
    expect(sidebarBox).not.toBeNull();

    for (const s of SECTIONS) {
      const tab = page.getByTestId(`sidebar-section-${s}`);
      await expect(tab).toBeVisible();
      const box = await tab.boundingBox();
      expect(box, `tab ${s} is laid out`).not.toBeNull();
      // Tab sits inside the sidebar both horizontally and vertically — so
      // none of them are scrolled out of view.
      expect(box!.x).toBeGreaterThanOrEqual(sidebarBox!.x - 1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(sidebarBox!.x + sidebarBox!.width + 1);
      expect(box!.y).toBeGreaterThanOrEqual(sidebarBox!.y - 1);
      // Each tab has a non-trivial hit target.
      expect(box!.width).toBeGreaterThan(30);
      expect(box!.height).toBeGreaterThan(16);
    }
  });

  test('tabs do not overlap each other', async ({ page }) => {
    await page.goto('/');
    const boxes = await Promise.all(
      SECTIONS.map(async (s) =>
        (await page.getByTestId(`sidebar-section-${s}`).boundingBox())!,
      ),
    );
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const disjoint =
          a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
        expect(disjoint, `${SECTIONS[i]} and ${SECTIONS[j]} overlap`).toBe(true);
      }
    }
  });

  test('clicking each tab activates it and renders the matching panel', async ({ page }) => {
    await page.goto('/');
    const expectations: Array<[string, string]> = [
      ['history', 'history-list'],
      ['cookies', 'cookies-panel'],
      ['mocks', 'mocks-panel'],
      ['monitors', 'monitors-panel'],
      ['flows', 'flows-panel'],
      ['collections', 'collections-panel'],
    ];
    for (const [section, panelTestId] of expectations) {
      await page.getByTestId(`sidebar-section-${section}`).click();
      await expect(page.getByTestId(panelTestId)).toBeVisible();
      await expect(page.getByTestId(`sidebar-section-${section}`)).toHaveAttribute(
        'aria-selected',
        'true',
      );
    }
  });
});
