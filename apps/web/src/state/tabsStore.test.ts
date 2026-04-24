import { describe, it, expect, beforeEach } from 'vitest';
import { useTabsStore } from './tabsStore';
import { newRequestDraft } from '../lib/factories';

function reset() {
  const draft = newRequestDraft();
  useTabsStore.setState({
    tabs: [{ id: 'seed', draft, status: 'idle' }],
    activeId: 'seed',
  });
}

describe('tabsStore', () => {
  beforeEach(reset);

  it('adds a new tab and activates it', () => {
    const id = useTabsStore.getState().addTab();
    expect(useTabsStore.getState().tabs.length).toBe(2);
    expect(useTabsStore.getState().activeId).toBe(id);
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
});
