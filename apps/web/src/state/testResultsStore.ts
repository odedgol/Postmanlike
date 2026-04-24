import { create } from 'zustand';
import type { TestResult } from '@postmanlike/shared';

interface State {
  byTab: Record<string, { tests: TestResult[]; error?: string }>;
  setForTab: (tabId: string, tests: TestResult[], error?: string) => void;
  clearForTab: (tabId: string) => void;
}

export const useTestResultsStore = create<State>((set) => ({
  byTab: {},
  setForTab: (tabId, tests, error) =>
    set((s) => ({ byTab: { ...s.byTab, [tabId]: { tests, error } } })),
  clearForTab: (tabId) =>
    set((s) => {
      const next = { ...s.byTab };
      delete next[tabId];
      return { byTab: next };
    }),
}));
