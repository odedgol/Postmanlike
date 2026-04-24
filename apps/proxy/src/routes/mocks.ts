import { Router } from 'express';
import { mockRegistry, type Mock } from '../lib/mocks.js';

export function createMocksRouter() {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ mocks: mockRegistry.list() });
  });

  router.put('/:id', (req, res) => {
    const body = req.body as Partial<Mock>;
    if (!body || !Array.isArray(body.routes)) {
      res.status(400).json({ error: 'Missing routes[]' });
      return;
    }
    const mock = mockRegistry.upsert({
      id: req.params.id,
      name: body.name ?? req.params.id,
      routes: body.routes,
    });
    res.json({ mock });
  });

  router.delete('/:id', (req, res) => {
    const ok = mockRegistry.delete(req.params.id);
    res.status(ok ? 200 : 404).json({ ok });
  });

  return router;
}

export function createMockMatcherRouter() {
  const router = Router();

  router.all('/:id/*', async (req, res) => {
    const { id } = req.params;
    const tail = '/' + ((req.params as unknown as Record<string, string>)['0'] ?? '');
    const match = mockRegistry.match(id, req.method, tail);
    if (!match) {
      res.status(404).json({ error: 'No matching mock route', id, path: tail });
      return;
    }
    if (match.response.delayMs && match.response.delayMs > 0) {
      await new Promise((r) => setTimeout(r, match.response.delayMs));
    }
    res.status(match.response.status);
    for (const [k, v] of Object.entries(match.response.headers)) res.setHeader(k, v);
    res.send(match.response.body);
  });

  return router;
}
