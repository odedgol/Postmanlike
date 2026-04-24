import { describe, it, expect, beforeEach } from 'vitest';
import { isTabDirty, useTabsStore } from './tabsStore';
import { newRequestDraft } from '../lib/factories';

function reset() {
  const draft = newRequestDraft();
  useTabsStore.setState({
    tabs: [
      {
        id: 'seed',
        draft,
        originId: null,
        originSnapshot: null,
        status: 'idle',
      },
    ],
    activeId: 'seed',
    hydrated: false,
  });
}

describe('tabsStore', () => {
  beforeEach(reset);

  it('adds a new tab and activates it', () => {
    const id = useTabsStore.getState().addTab();
    expect(useTabsStore.getState().tabs.length).toBe(2);
    expect(useTabsStore.getState().activeId).toBe(id);
  });

  it('adds a tab with an origin snapshot (for opening saved requests)', () => {
    const snap = newRequestDraft({ url: 'https://s.test' });
    useTabsStore.getState().addTab(snap, { id: 'sr-1', snapshot: snap });
    const active = useTabsStore.getState().tabs.find(
      (t) => t.id === useTabsStore.getState().activeId,
    )!;
    expect(active.originId).toBe('sr-1');
    expect(active.originSnapshot).toEqual(snap);
  });

  it('closes the active tab and activates the previous', () => {
    const a = useTabsStore.getState().addTab();
    const b = useTabsStore.getState().addTab();
    expect(useTabsStore.getState().activeId).toBe(b);
    useTabsStore.getState().closeTab(b);
    expect(useTabsStore.getState().activeId).toBe(a);
  });

  it('when the last tab is closed, creates a fresh one', () => {
    useTabsStore.getState().closeTab('seed');
    const s = useTabsStore.getState();
    expect(s.tabs.length).toBe(1);
    expect(s.tabs[0].id).not.toBe('seed');
  });

  it('updateDraft merges into the draft of the correct tab', () => {
    useTabsStore.getState().updateDraft('seed', { method: 'POST', url: 'https://x' });
    const tab = useTabsStore.getState().tabs.find((t) => t.id === 'seed')!;
    expect(tab.draft.method).toBe('POST');
    expect(tab.draft.url).toBe('https://x');
  });

  it('setStatus updates status and extras on the tab', () => {
    useTabsStore.getState().setStatus('seed', 'sending', { error: undefined });
    expect(useTabsStore.getState().tabs[0].status).toBe('sending');
  });

  it('markSaved sets origin and makes the tab clean', () => {
    useTabsStore.getState().updateDraft('seed', { url: 'https://a' });
    const current = useTabsStore.getState().tabs[0].draft;
    useTabsStore.getState().markSaved('seed', 'sr-1', current);
    const tab = useTabsStore.getState().tabs[0];
    expect(tab.originId).toBe('sr-1');
    expect(isTabDirty(tab)).toBe(false);
  });

  it('editing a saved tab marks it dirty; reverting makes it clean again', () => {
    const snap = newRequestDraft({ url: 'https://a' });
    useTabsStore.setState({
      tabs: [
        {
          id: 'seed',
          draft: snap,
          originId: 'sr-1',
          originSnapshot: snap,
          status: 'idle',
        },
      ],
      activeId: 'seed',
      hydrated: true,
    });
    expect(isTabDirty(useTabsStore.getState().tabs[0])).toBe(false);
    useTabsStore.getState().updateDraft('seed', { url: 'https://b' });
    expect(isTabDirty(useTabsStore.getState().tabs[0])).toBe(true);
    useTabsStore.getState().updateDraft('seed', { url: 'https://a' });
    expect(isTabDirty(useTabsStore.getState().tabs[0])).toBe(false);
  });

  it('hydrate replaces tabs and activeId and clears transient fields', () => {
    useTabsStore.getState().hydrate(
      [
        {
          id: 'x',
          draft: newRequestDraft({ url: 'https://y' }),
          originId: null,
          originSnapshot: null,
          status: 'idle',
        },
      ],
      'x',
    );
    const s = useTabsStore.getState();
    expect(s.tabs.length).toBe(1);
    expect(s.tabs[0].id).toBe('x');
    expect(s.activeId).toBe('x');
    expect(s.hydrated).toBe(true);
  });
});
