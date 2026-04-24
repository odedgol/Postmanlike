import type { RequestDraft } from '@postmanlike/shared';
import { runCollection, type RunnerSummary } from '@postmanlike/runtime';
import { executeProxyRequest } from './execute.js';

export interface MonitorSnapshot {
  requests: Array<{ id: string; draft: RequestDraft }>;
  environment: Record<string, string>;
  globals: Record<string, string>;
}

export interface Monitor {
  id: string;
  name: string;
  scheduleSec: number;
  enabled: boolean;
  snapshot: MonitorSnapshot;
  lastRunAt: number | null;
  nextRunAt: number;
}

export interface MonitorRun {
  id: string;
  monitorId: string;
  startedAt: number;
  summary: RunnerSummary;
}

export class MonitorStore {
  private monitors = new Map<string, Monitor>();
  private runs: MonitorRun[] = [];

  list(): Monitor[] {
    return [...this.monitors.values()];
  }

  get(id: string): Monitor | undefined {
    return this.monitors.get(id);
  }

  upsert(m: Monitor): Monitor {
    this.monitors.set(m.id, m);
    return m;
  }

  delete(id: string): boolean {
    const existed = this.monitors.delete(id);
    this.runs = this.runs.filter((r) => r.monitorId !== id);
    return existed;
  }

  due(nowMs: number): Monitor[] {
    return this.list().filter((m) => m.enabled && m.nextRunAt <= nowMs);
  }

  recordRun(run: MonitorRun, cap = 100) {
    this.runs.push(run);
    if (this.runs.length > cap) this.runs.splice(0, this.runs.length - cap);
  }

  runsFor(monitorId: string): MonitorRun[] {
    return this.runs
      .filter((r) => r.monitorId === monitorId)
      .sort((a, b) => b.startedAt - a.startedAt);
  }
}

export const monitorStore = new MonitorStore();

export async function runMonitorOnce(
  monitor: Monitor,
  nowMs: number = Date.now(),
): Promise<MonitorRun> {
  // Snapshots at creation time; pre-request patches mutate a local scope
  // copy only so monitor runs are deterministic across restarts.
  const env = { ...monitor.snapshot.environment };
  const globals = { ...monitor.snapshot.globals };

  const summary = await runCollection(
    monitor.snapshot.requests.map((r) => ({ id: r.id, draft: r.draft })),
    {
      send: async (payload) =>
        executeProxyRequest({
          method: payload.method,
          url: payload.url,
          headers: payload.headers,
          body: payload.body,
          auth: payload.auth,
        }),
      readScopes: async () => ({ environment: { ...env }, globals: { ...globals } }),
      writeEnvPatch: async (patch) => {
        Object.assign(env, patch);
      },
      writeGlobalsPatch: async (patch) => {
        Object.assign(globals, patch);
      },
    },
  );

  return {
    id: `run-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
    monitorId: monitor.id,
    startedAt: nowMs,
    summary,
  };
}

export class MonitorScheduler {
  private timer: NodeJS.Timeout | null = null;

  constructor(private store: MonitorStore) {}

  start(intervalMs = 1000) {
    this.stop();
    this.timer = setInterval(() => this.tick(), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(nowMs: number = Date.now()) {
    const due = this.store.due(nowMs);
    for (const monitor of due) {
      // Guard against re-entrancy by advancing nextRunAt before awaiting.
      monitor.nextRunAt = nowMs + monitor.scheduleSec * 1000;
      monitor.lastRunAt = nowMs;
      this.store.upsert(monitor);
      try {
        const run = await runMonitorOnce(monitor, nowMs);
        this.store.recordRun(run);
      } catch {
        // Failures are recorded in the summary already; scheduler swallows
        // the error so one bad monitor doesn't kill the process.
      }
    }
  }
}

export const monitorScheduler = new MonitorScheduler(monitorStore);
