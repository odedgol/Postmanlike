import { useState } from 'react';
import { useAuthStore } from '../../state/authStore';

interface Props {
  onClose: () => void;
}

const PROXY_URL =
  (import.meta.env.VITE_PROXY_URL as string | undefined) ?? 'http://localhost:4000';

type Mode = 'login' | 'register';

export function SignInDialog({ onClose }: Props) {
  const setSession = useAuthStore((s) => s.setSession);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${PROXY_URL}/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        token?: string;
        account?: { id: string; email: string };
        error?: string;
      };
      if (!res.ok || !data.token || !data.account) {
        setError(data.error ?? 'request failed');
        return;
      }
      setSession(data.token, data.account);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="signin-dialog"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[420px] bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="text-base font-semibold">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </div>
          <div className="flex-1" />
          <button
            className="pl-btn pl-btn-ghost text-xs"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            data-testid="signin-toggle-mode"
          >
            {mode === 'login' ? 'Need an account?' : 'Have an account?'}
          </button>
        </div>
        <label className="block text-sm space-y-1">
          <span className="text-neutral-500">Email</span>
          <input
            data-testid="signin-email"
            type="email"
            className="pl-input w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="block text-sm space-y-1">
          <span className="text-neutral-500">Password</span>
          <input
            data-testid="signin-password"
            type="password"
            className="pl-input w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && (
          <div className="text-xs text-red-500" data-testid="signin-error">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button className="pl-btn pl-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            data-testid="signin-submit"
            className="pl-btn pl-btn-primary"
            disabled={busy || !email || !password}
            onClick={submit}
          >
            {mode === 'login' ? 'Sign in' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
