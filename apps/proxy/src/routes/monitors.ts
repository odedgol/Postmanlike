import { Router } from 'express';
import {
  monitorStore,
  runMonitorOnce,
  type Monitor,
  type MonitorSnapshot,
} from '../lib/monitors.js';

function validateSnapshot(input: unknown): MonitorSnapshot | null {
  const s = input as Partial<MonitorSnapshot> | null | undefined;
  if (!s || !Array.isArray(s.requests)) return null;
  return {
    requests: s.requests,
    environment: s.environment ?? {},
    globals: s.globals ?? {},
  };
}

export function createMonitorsRouter() {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ monitors: monitorStore.list() });
  });

  router.get('/:id/runs', (req, res) => {
    res.json({ runs: monitorStore.runsFor(req.params.id) });
  });

  router.put('/:id', (req, res) => {
    const body = req.body as Partial<Monitor>;
    const snapshot = validateSnapshot(body?.snapshot);
    if (!snapshot) {
      res.status(400).json({ error: 'Invalid snapshot (requests[] required)' });
      return;
    }
    const scheduleSec = Math.max(5, Number(body.scheduleSec) || 60);
    const now = Date.now();
    const monitor: Monitor = {
      id: req.params.id,
      name: body.name ?? req.params.id,
      scheduleSec,
      enabled: body.enabled !== false,
      snapshot,
      lastRunAt: null,
      nextRunAt: now + scheduleSec * 1000,
    };
    monitorStore.upsert(monitor);
    res.json({ monitor });
  });

  router.post('/:id/run', async (req, res) => {
    const monitor = monitorStore.get(req.params.id);
    if (!monitor) {
      res.status(404).json({ error: 'monitor not found' });
      return;
    }
    const run = await runMonitorOnce(monitor);
    monitorStore.recordRun(run);
    res.json({ run });
  });

  router.delete('/:id', (req, res) => {
    const ok = monitorStore.delete(req.params.id);
    res.status(ok ? 200 : 404).json({ ok });
  });

  return router;
}
