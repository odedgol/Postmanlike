import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Collection } from '@postmanlike/shared';
import {
  getActiveEnvId,
  getGlobals,
  listCollections,
  listEnvironments,
  listSavedRequests,
} from '../../lib/db';

interface ProxyMonitor {
  id: string;
  name: string;
  scheduleSec: number;
  enabled: boolean;
  lastRunAt: number | null;
  nextRunAt: number;
}

interface ProxyRun {
  id: string;
  monitorId: string;
  startedAt: number;
  summary: { total: number; passed: number; failed: number; errors: number; durationMs: number };
}

const PROXY_URL =
  (import.meta.env.VITE_PROXY_URL as string | undefined) ?? 'http://localhost:4000';

export function MonitorsPanel() {
  const [monitors, setMonitors] = useState<ProxyMonitor[]>([]);
  const [runs, setRuns] = useState<Record<string, ProxyRun[]>>({});
  const [error, setError] = useState<string | null>(null);
  const collections = useLiveQuery(() => listCollections(), [], [] as Collection[]);
  const [collectionId, setCollectionId] = useState('');
  const [scheduleSec, setScheduleSec] = useState(60);
  const [name, setName] = useState('Monitor');

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${PROXY_URL}/monitors`);
      const data = (await res.json()) as { monitors: ProxyMonitor[] };
      const list = data.monitors ?? [];
      setMonitors(list);
      const runsMap: Record<string, ProxyRun[]> = {};
      await Promise.all(
        list.map(async (m) => {
          const r = await fetch(`${PROXY_URL}/monitors/${m.id}/runs`);
          const j = (await r.json()) as { runs: ProxyRun[] };
          runsMap[m.id] = j.runs ?? [];
        }),
      );
      setRuns(runsMap);
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

  useEffect(() => {
    if (!collectionId && collections && collections.length > 0) {
      setCollectionId(collections[0].id);
    }
  }, [collections, collectionId]);

  const create = async () => {
    if (!collectionId) return;
    const requests = await listSavedRequests(collectionId);
    const envs = await listEnvironments();
    const activeId = await getActiveEnvId();
    const active = activeId ? envs.find((e) => e.id === activeId) : undefined;
    const globals = await getGlobals();
    const toRec = (rows: { key: string; value: string; enabled: boolean }[]) => {
      const out: Record<string, string> = {};
      for (const r of rows) if (r.enabled && r.key.trim()) out[r.key] = r.value;
      return out;
    };
    const id = `mon-${Math.random().toString(36).slice(2, 8)}`;
    await fetch(`${PROXY_URL}/monitors/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        scheduleSec,
        snapshot: {
          requests: requests.map((r) => ({ id: r.id, draft: r.draft })),
          environment: active ? toRec(active.values) : {},
          globals: toRec(globals.values),
        },
      }),
    });
    refresh();
  };

  const runNow = async (id: string) => {
    await fetch(`${PROXY_URL}/monitors/${id}/run`, { method: 'POST' });
    refresh();
  };
  const remove = async (id: string) => {
    await fetch(`${PROXY_URL}/monitors/${id}`, { method: 'DELETE' });
    refresh();
  };

  return (
    <div className="h-full flex flex-col" data-testid="monitors-panel">
      <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-900 space-y-1">
        <div className="text-xs uppercase tracking-wide text-neutral-500">New monitor</div>
        <input
          data-testid="monitor-name"
          className="pl-input w-full text-xs"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          data-testid="monitor-collection"
          className="pl-input w-full text-xs"
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value)}
        >
          <option value="">Select collection…</option>
          {collections?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex gap-1 items-center text-xs">
          <label className="flex-1">
            Every
            <input
              type="number"
              min={5}
              data-testid="monitor-schedule"
              className="pl-input w-16 ml-1"
              value={scheduleSec}
              onChange={(e) => setScheduleSec(Math.max(5, Number(e.target.value) || 60))}
            />
            <span className="ml-1">sec</span>
          </label>
          <button
            data-testid="monitor-create"
            className="pl-btn pl-btn-primary text-xs"
            disabled={!collectionId}
            onClick={create}
          >
            Create
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="px-3 py-2 text-xs text-red-500" data-testid="monitors-error">
            {error}
          </div>
        )}
        {monitors.length === 0 ? (
          <div className="px-3 py-2 text-xs text-neutral-500" data-testid="monitors-empty">
            No monitors configured.
          </div>
        ) : (
          monitors.map((m) => {
            const latest = runs[m.id]?.[0];
            return (
              <div
                key={m.id}
                data-testid="monitor-item"
                className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-900 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-brand">{m.name}</span>
                  <span className="text-neutral-500">every {m.scheduleSec}s</span>
                  <div className="flex-1" />
                  <button
                    className="pl-btn pl-btn-ghost"
                    data-testid={`monitor-run-${m.id}`}
                    onClick={() => runNow(m.id)}
                  >
                    Run now
                  </button>
                  <button
                    className="pl-btn pl-btn-ghost text-red-500"
                    data-testid={`monitor-delete-${m.id}`}
                    onClick={() => remove(m.id)}
                  >
                    ×
                  </button>
                </div>
                {latest ? (
                  <div className="text-neutral-500 mt-1" data-testid={`monitor-latest-${m.id}`}>
                    Last: {latest.summary.passed} passed · {latest.summary.failed} failed ·{' '}
                    {latest.summary.durationMs}ms ·{' '}
                    {new Date(latest.startedAt).toLocaleTimeString()}
                  </div>
                ) : (
                  <div className="text-neutral-500 mt-1">No runs yet.</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
