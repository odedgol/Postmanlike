import { useCallback, useEffect, useState } from 'react';
import { useTabsStore } from '../../state/tabsStore';

interface ProxyMock {
  id: string;
  name: string;
  routes: Array<{
    method: string;
    path: string;
    response: { status: number; headers: Record<string, string>; body: string };
  }>;
}

const PROXY_URL =
  (import.meta.env.VITE_PROXY_URL as string | undefined) ?? 'http://localhost:4000';

export function MocksPanel() {
  const [mocks, setMocks] = useState<ProxyMock[]>([]);
  const [error, setError] = useState<string | null>(null);
  const addTab = useTabsStore((s) => s.addTab);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${PROXY_URL}/mocks`);
      const data = (await res.json()) as { mocks: ProxyMock[] };
      setMocks(data.mocks ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 3000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const createFromActive = async () => {
    const { activeId, tabs } = useTabsStore.getState();
    const tab = tabs.find((t) => t.id === activeId);
    if (!tab || !tab.response) {
      setError('Send the request first, then create a mock from its response.');
      return;
    }
    let path = '/';
    try {
      path = new URL(tab.draft.url).pathname || '/';
    } catch {
      path = '/';
    }
    const id = `mock-${Math.random().toString(36).slice(2, 8)}`;
    const mock: ProxyMock = {
      id,
      name: tab.draft.name,
      routes: [
        {
          method: tab.draft.method,
          path,
          response: {
            status: tab.response.status,
            headers: { 'content-type': tab.response.headers['content-type'] ?? 'text/plain' },
            body: tab.response.body,
          },
        },
      ],
    };
    await fetch(`${PROXY_URL}/mocks/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(mock),
    });
    refresh();
  };

  const removeMock = async (id: string) => {
    await fetch(`${PROXY_URL}/mocks/${id}`, { method: 'DELETE' });
    refresh();
  };

  const openMock = (mock: ProxyMock) => {
    const route = mock.routes[0];
    if (!route) return;
    addTab({
      id: `mock-${Math.random().toString(36).slice(2, 8)}`,
      name: `Mock · ${mock.name}`,
      method: route.method,
      url: `${PROXY_URL}/mock/${mock.id}${route.path}`,
      params: [],
      headers: [],
      bodyMode: 'none',
      bodyRaw: '',
      bodyForm: [],
    });
  };

  return (
    <div className="h-full flex flex-col" data-testid="mocks-panel">
      <div className="px-3 py-2 text-xs uppercase tracking-wide text-neutral-500 flex items-center justify-between">
        <span>Mocks</span>
        <div className="flex gap-2">
          <button
            className="pl-btn pl-btn-ghost text-[10px]"
            onClick={createFromActive}
            data-testid="mocks-create"
          >
            from current
          </button>
          <button className="pl-btn pl-btn-ghost text-[10px]" onClick={refresh}>
            refresh
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="px-3 py-2 text-xs text-red-500" data-testid="mocks-error">
            {error}
          </div>
        ) : mocks.length === 0 ? (
          <div className="px-3 py-2 text-xs text-neutral-500" data-testid="mocks-empty">
            No mocks yet. Send a request, then click &quot;from current&quot;.
          </div>
        ) : (
          mocks.map((m) => (
            <div
              key={m.id}
              data-testid="mock-item"
              className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-900 text-xs group flex items-start gap-2"
            >
              <button
                className="flex-1 text-left font-mono"
                onClick={() => openMock(m)}
                data-testid={`mock-open-${m.id}`}
              >
                <div className="font-semibold text-brand">{m.name}</div>
                {m.routes.map((r, i) => (
                  <div key={i} className="text-neutral-500">
                    {r.method} {r.path} → {r.response.status}
                  </div>
                ))}
                <div className="text-neutral-500 mt-0.5">/mock/{m.id}/…</div>
              </button>
              <button
                className="opacity-0 group-hover:opacity-100 text-red-500"
                onClick={() => removeMock(m.id)}
                data-testid={`mock-delete-${m.id}`}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
