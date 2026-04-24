import { create } from 'zustand';
import type { ConsoleEntry } from '@postmanlike/shared';

const CAP = 500;

interface State {
  entries: ConsoleEntry[];
  push: (more: ConsoleEntry[]) => void;
  clear: () => void;
}

export const useConsoleStore = create<State>((set) => ({
  entries: [],
  push: (more) =>
    set((s) => {
      const next = [...s.entries, ...more];
      return { entries: next.length > CAP ? next.slice(next.length - CAP) : next };
    }),
  clear: () => set({ entries: [] }),
}));
