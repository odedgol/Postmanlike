import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { draftsEqual, type ProxyResponsePayload, type RequestDraft } from '@postmanlike/shared';
import { newRequestDraft } from '../lib/factories';

export type TabStatus = 'idle' | 'sending' | 'ok' | 'error';

export interface Tab {
  id: string;
  draft: RequestDraft;
  originId: string | null;
  originSnapshot: RequestDraft | null;
  status: TabStatus;
  response?: ProxyResponsePayload;
  error?: string;
  abort?: AbortController;
}

export interface TabsState {
  tabs: Tab[];
  activeId: string;
  hydrated: boolean;
  addTab: (draft?: RequestDraft, origin?: { id: string; snapshot: RequestDraft }) => string;
  closeTab: (id: string) => void;
  activate: (id: string) => void;
  updateDraft: (id: string, patch: Partial<RequestDraft>) => void;
  setStatus: (id: string, status: TabStatus, extras?: Partial<Tab>) => void;
  markSaved: (id: string, originId: string, snapshot: RequestDraft) => void;
  hydrate: (tabs: Tab[], activeId: string) => void;
}

function initial(): { tabs: Tab[]; activeId: string } {
  const first: Tab = {
    id: nanoid(6),
    draft: newRequestDraft(),
    originId: null,
    originSnapshot: null,
    status: 'idle',
  };
  return { tabs: [first], activeId: first.id };
}

export const useTabsStore = create<TabsState>((set) => ({
  ...initial(),
  hydrated: false,
  addTab: (draft, origin) => {
    const tab: Tab = {
      id: nanoid(6),
      draft: draft ?? newRequestDraft(),
      originId: origin?.id ?? null,
      originSnapshot: origin?.snapshot ?? null,
      status: 'idle',
    };
    set((s) => ({ tabs: [...s.tabs, tab], activeId: tab.id }));
    return tab.id;
  },
  closeTab: (id) =>
    set((s) => {
      const remaining = s.tabs.filter((t) => t.id !== id);
      if (remaining.length === 0) {
        const fresh: Tab = {
          id: nanoid(6),
          draft: newRequestDraft(),
          originId: null,
          originSnapshot: null,
          status: 'idle',
        };
        return { tabs: [fresh], activeId: fresh.id };
      }
      const activeId =
        s.activeId === id ? remaining[remaining.length - 1].id : s.activeId;
      return { tabs: remaining, activeId };
    }),
  activate: (id) => set({ activeId: id }),
  updateDraft: (id, patch) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, draft: { ...t.draft, ...patch } } : t)),
    })),
  setStatus: (id, status, extras = {}) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, status, ...extras } : t)),
    })),
  markSaved: (id, originId, snapshot) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, originId, originSnapshot: snapshot } : t,
      ),
    })),
  hydrate: (tabs, activeId) =>
    set({
      tabs: tabs.map((t) => ({ ...t, status: 'idle', response: undefined, error: undefined, abort: undefined })),
      activeId,
      hydrated: true,
    }),
}));

export function isTabDirty(tab: Tab): boolean {
  if (!tab.originSnapshot) return false;
  return !draftsEqual(tab.draft, tab.originSnapshot);
}
