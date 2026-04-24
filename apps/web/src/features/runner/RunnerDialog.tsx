import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Collection } from '@postmanlike/shared';
import { runCollection, type RunnerSummary } from '@postmanlike/runtime';
import {
  getActiveEnvId,
  getGlobals,
  listCollections,
  listEnvironments,
  listSavedRequests,
  setGlobals,
  updateEnvironment,
} from '../../lib/db';
import { sendViaProxy } from '../../lib/proxyClient';

interface Props {
  onClose: () => void;
}

export function RunnerDialog({ onClose }: Props) {
  const collections = useLiveQuery(() => listCollections(), [], [] as Collection[]);
  const [collectionId, setCollectionId] = useState<string>('');
  const [iterations, setIterations] = useState(1);
  const [delayMs, setDelayMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<RunnerSummary | null>(null);

  useEffect(() => {
    if (!collectionId && collections && collections.length > 0) {
      setCollectionId(collections[0].id);
    }
  }, [collections, collectionId]);

  const active = useMemo(
    () => collections?.find((c) => c.id === collectionId),
    [collections, collectionId],
  );

  const start = async () => {
    if (!collectionId) return;
    setRunning(true);
    setSummary(null);
    try {
      const requests = await listSavedRequests(collectionId);
      const items = requests.map((r) => ({ id: r.id, draft: r.draft }));
      const result = await runCollection(items, {
        iterations,
        delayMs,
        send: (p) => sendViaProxy(p),
        readScopes: async () => {
          const envs = await listEnvironments();
          const activeId = await getActiveEnvId();
          const activeEnv = activeId ? envs.find((e) => e.id === activeId) : undefined;
          const globals = await getGlobals();
          const toRec = (rows: { key: string; value: string; enabled: boolean }[]) => {
            const out: Record<string, string> = {};
            for (const r of rows) if (r.enabled && r.key.trim()) out[r.key] = r.value;
            return out;
          };
          return {
            environment: activeEnv ? toRec(activeEnv.values) : {},
            globals: toRec(globals.values),
          };
        },
        writeEnvPatch: async (patch) => {
          const envs = await listEnvironments();
          const activeId = await getActiveEnvId();
          const active = activeId ? envs.find((e) => e.id === activeId) : undefined;
          if (!active) return;
          const map = new Map(active.values.map((v) => [v.key, v] as const));
          for (const [k, v] of Object.entries(patch)) {
            map.set(k, { key: k, value: v, enabled: true });
          }
          await updateEnvironment({ ...active, values: [...map.values()] });
        },
        writeGlobalsPatch: async (patch) => {
          const row = await getGlobals();
          const map = new Map(row.values.map((v) => [v.key, v] as const));
          for (const [k, v] of Object.entries(patch)) {
            map.set(k, { key: k, value: v, enabled: true });
          }
          await setGlobals([...map.values()]);
        },
      });
      setSummary(result);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="runner-dialog"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[640px] max-h-[80vh] bg-white dark:bg-neutral-900 rounded-lg shadow-xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
          <div className="font-semibold">Collection Runner</div>
          <div className="flex-1" />
          <button className="pl-btn pl-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-4 space-y-3">
          <label className="block text-sm space-y-1">
            <span className="text-neutral-500">Collection</span>
            <select
              data-testid="runner-collection"
              className="pl-input w-full"
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
            >
              {collections?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="space-y-1">
              <span className="text-neutral-500">Iterations</span>
              <input
                type="number"
                min={1}
                max={100}
                data-testid="runner-iterations"
                className="pl-input w-full"
                value={iterations}
                onChange={(e) => setIterations(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-neutral-500">Delay between (ms)</span>
              <input
                type="number"
                min={0}
                data-testid="runner-delay"
                className="pl-input w-full"
                value={delayMs}
                onChange={(e) => setDelayMs(Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
          </div>
          <button
            className="pl-btn pl-btn-primary"
            disabled={!collectionId || running}
            onClick={start}
            data-testid="runner-start"
          >
            {running ? 'Running…' : `Run ${active?.name ?? ''}`}
          </button>
        </div>
        {summary && (
          <div className="border-t border-neutral-200 dark:border-neutral-800 overflow-auto p-4 text-sm">
            <div className="font-semibold mb-2" data-testid="runner-summary">
              {summary.passed} passed · {summary.failed} failed · {summary.errors} errors ·{' '}
              {summary.durationMs}ms
            </div>
            <div className="space-y-1 font-mono text-xs">
              {summary.results.map((r, i) => (
                <div key={i} data-testid="runner-row">
                  <span
                    className={
                      r.error || r.tests.some((t) => !t.pass)
                        ? 'text-red-500'
                        : 'text-emerald-500'
                    }
                  >
                    {r.error ? '✗' : r.tests.some((t) => !t.pass) ? '✗' : '✓'}
                  </span>{' '}
                  {r.name} · {r.status ?? '—'} · {r.timingMs ?? '—'}ms
                  {r.error && <span className="ml-2 text-red-500">{r.error}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
