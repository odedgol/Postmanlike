import { useCallback, useEffect, useState } from 'react';

interface CookieRecord {
  domain: string;
  name: string;
  value: string;
  path: string;
  expires: number | null;
}

const PROXY_URL =
  (import.meta.env.VITE_PROXY_URL as string | undefined) ?? 'http://localhost:4000';

export function CookiesPanel() {
  const [cookies, setCookies] = useState<CookieRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${PROXY_URL}/cookies`);
      const data = (await res.json()) as { cookies: CookieRecord[] };
      setCookies(data.cookies ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 2000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const clearAll = async () => {
    await fetch(`${PROXY_URL}/cookies`, { method: 'DELETE' });
    refresh();
  };

  return (
    <div className="h-full flex flex-col" data-testid="cookies-panel">
      <div className="px-3 py-2 text-xs uppercase tracking-wide text-neutral-500 flex items-center justify-between">
        <span>Cookie Jar</span>
        <div className="flex gap-2">
          <button className="pl-btn pl-btn-ghost text-[10px]" onClick={refresh}>
            refresh
          </button>
          {cookies.length > 0 && (
            <button
              data-testid="cookies-clear"
              className="pl-btn pl-btn-ghost text-[10px]"
              onClick={clearAll}
            >
              clear
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="px-3 py-2 text-xs text-red-500">{error}</div>
        ) : cookies.length === 0 ? (
          <div className="px-3 py-2 text-xs text-neutral-500" data-testid="cookies-empty">
            No cookies stored yet.
          </div>
        ) : (
          cookies.map((c, i) => (
            <div
              key={i}
              data-testid="cookie-item"
              className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-900 text-xs"
            >
              <div className="font-mono">
                <span className="text-brand">{c.domain}</span>
                <span className="text-neutral-500">{c.path}</span>
              </div>
              <div className="font-mono">
                {c.name}=<span className="text-neutral-500 break-all">{c.value}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
