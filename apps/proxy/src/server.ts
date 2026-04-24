import express from 'express';
import cors from 'cors';
import { createProxyRouter } from './routes/proxy.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '25mb' }));
  app.use(express.text({ limit: '25mb', type: ['text/*', 'application/xml', 'application/graphql'] }));
  app.use(express.raw({ limit: '25mb', type: 'application/octet-stream' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'postmanlike-proxy', version: '0.1.0' });
  });

  // Hermetic echo endpoint used by E2E tests. Mirrors request info back
  // so tests don't depend on an external host like httpbin.
  app.all('/__echo', (req, res) => {
    res.json({
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      query: req.query,
      body: req.body,
    });
  });

  app.use('/proxy', createProxyRouter());

  return app;
}

const PORT = Number(process.env.PORT) || 4000;

const isEntry = import.meta.url === `file://${process.argv[1]}`;
if (isEntry) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[postmanlike-proxy] listening on http://localhost:${PORT}`);
  });
}
