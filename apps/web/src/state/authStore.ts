import { create } from 'zustand';

export interface AuthAccount {
  id: string;
  email: string;
}

interface State {
  token: string | null;
  account: AuthAccount | null;
  setSession: (token: string, account: AuthAccount) => void;
  clear: () => void;
  hydrate: () => void;
}

const STORAGE_KEY = 'postmanlike.auth';

function read(): { token: string; account: AuthAccount } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const useAuthStore = create<State>((set) => ({
  token: null,
  account: null,
  setSession: (token, account) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, account }));
    set({ token, account });
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, account: null });
  },
  hydrate: () => {
    const persisted = read();
    if (persisted) set({ token: persisted.token, account: persisted.account });
  },
}));
