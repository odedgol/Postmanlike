import { Router } from 'express';
import { executeProxyRequest } from '../lib/execute.js';

export function createProxyRouter() {
  const router = Router();

  router.post('/', async (req, res) => {
    const { method, url, headers, body, timeoutMs } = req.body ?? {};
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'Missing required field: url' });
      return;
    }
    if (!method || typeof method !== 'string') {
      res.status(400).json({ error: 'Missing required field: method' });
      return;
    }

    try {
      const result = await executeProxyRequest({
        method,
        url,
        headers: headers ?? {},
        body,
        timeoutMs: typeof timeoutMs === 'number' ? timeoutMs : 30000,
      });
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes('Invalid URL') ? 400 : 502;
      res.status(status).json({ error: message });
    }
  });

  return router;
}
