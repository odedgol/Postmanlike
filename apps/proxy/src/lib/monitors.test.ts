import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  MonitorScheduler,
  MonitorStore,
  runMonitorOnce,
  type Monitor,
} from './monitors.js';

function baseMonitor(partial: Partial<Monitor> = {}): Monitor {
  return {
    id: 'm1',
    name: 'Health',
    scheduleSec: 60,
    enabled: true,
    snapshot: {
      requests: [
        {
          id: 'r1',
          draft: {
            id: 'r1',
            name: 'Ping',
            method: 'GET',
            url: 'https://example.test/ping',
            params: [],
            headers: [],
            bodyMode: 'none',
            bodyRaw: '',
            bodyForm: [],
            testScript: 'pm.test("200", () => pm.expect(pm.response.status).toBe(200))',
          },
        },
      ],
      environment: {},
      globals: {},
    },
    lastRunAt: null,
    nextRunAt: Date.now(),
    ...partial,
  };
}

describe('MonitorStore', () => {
  let store: MonitorStore;
  beforeEach(() => {
    store = new MonitorStore();
  });

  it('upsert + list + get + delete', () => {
    const m = baseMonitor();
    store.upsert(m);
    expect(store.list()).toHaveLength(1);
    expect(store.get('m1')).toBe(m);
    expect(store.delete('m1')).toBe(true);
    expect(store.get('m1')).toBeUndefined();
  });

  it('due() surfaces only monitors with nextRunAt <= now and enabled', () => {
    store.upsert(baseMonitor({ id: 'a', nextRunAt: 1000, enabled: true }));
    store.upsert(baseMonitor({ id: 'b', nextRunAt: 5000, enabled: true }));
    store.upsert(baseMonitor({ id: 'c', nextRunAt: 500, enabled: false }));
    const due = store.due(2000);
    expect(due.map((m) => m.id)).toEqual(['a']);
  });

  it('recordRun caps history', () => {
    for (let i = 0; i < 5; i++) {
      store.recordRun(
        { id: `r${i}`, monitorId: 'm1', startedAt: i, summary: {} as never },
        3,
      );
    }
    expect(store.runsFor('m1').map((r) => r.id)).toEqual(['r4', 'r3', 'r2']);
  });
});

describe('runMonitorOnce', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () =>
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    ) as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('executes the collection and counts passed tests', async () => {
    const run = await runMonitorOnce(baseMonitor(), 1000);
    expect(run.monitorId).toBe('m1');
    expect(run.summary.total).toBe(1);
    expect(run.summary.passed).toBe(1);
  });
});

describe('MonitorScheduler.tick', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => new Response('ok', { status: 200 })) as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('runs due monitors exactly once per tick and advances nextRunAt', async () => {
    const store = new MonitorStore();
    const scheduler = new MonitorScheduler(store);
    store.upsert(baseMonitor({ id: 'x', scheduleSec: 60, nextRunAt: 1000 }));
    await scheduler.tick(2000);
    const m = store.get('x')!;
    expect(m.nextRunAt).toBe(2000 + 60_000);
    expect(m.lastRunAt).toBe(2000);
    expect(store.runsFor('x')).toHaveLength(1);
  });

  it('does not re-run monitors that are not due', async () => {
    const store = new MonitorStore();
    const scheduler = new MonitorScheduler(store);
    store.upsert(baseMonitor({ id: 'x', scheduleSec: 60, nextRunAt: 10_000 }));
    await scheduler.tick(1000);
    expect(store.runsFor('x')).toHaveLength(0);
  });
});
