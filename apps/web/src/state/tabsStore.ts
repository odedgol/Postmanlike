import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { ProxyResponsePayload, RequestDraft } from '@postmanlike/shared';
import { newRequestDraft } from '../lib/factories';

export type TabStatus = 'idle' | 'sending' | 'ok' | 'error';

export interface Tab {
  id: string;
  draft: RequestDraft;
  status: TabStatus;
  response?: ProxyResponsePayload;
  error?: string;
  abort?: AbortController;
}

export interface TabsState {
  tabs: Tab[];
  activeId: string;
  addTab: (draft?: RequestDraft) => string;
  closeTab: (id: string) => void;
  activate: (id: string) => void;
  updateDraft: (id: string, patch: Partial<RequestDraft>) => void;
  setStatus: (id: string, status: TabStatus, extras?: Partial<Tab>) => void;
}

function initial(): { tabs: Tab[]; activeId: string } {
  const first: Tab = { id: nanoid(6), draft: newRequestDraft(), status: 'idle' };
  return { tabs: [first], activeId: first.id };
}

export const useTabsStore = create<TabsState>((set) => ({
  ...initial(),
  addTab: (draft) => {
    const tab: Tab = { id: nanoid(6), draft: draft ?? newRequestDraft(), status: 'idle' };
    set((s) => ({ tabs: [...s.tabs, tab], activeId: tab.id }));
    return tab.id;
  },
  closeTab: (id) =>
    set((s) => {
      const remaining = s.tabs.filter((t) => t.id !== id);
      if (remaining.length === 0) {
        const fresh: Tab = { id: nanoid(6), draft: newRequestDraft(), status: 'idle' };
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
}));
