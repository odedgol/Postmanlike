import express from 'express';
import cors from 'cors';
import { createProxyRouter } from './routes/proxy.js';
import { createCookiesRouter } from './routes/cookies.js';
import { createMockMatcherRouter, createMocksRouter } from './routes/mocks.js';
import { createMonitorsRouter } from './routes/monitors.js';
import { monitorScheduler } from './lib/monitors.js';
import { createAuthRouter } from './routes/auth.js';
import { createWorkspaceRouter } from './routes/workspace.js';

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

  // Hermetic Set-Cookie endpoint for E2E tests of the cookie jar.
  app.get('/__setcookie', (req, res) => {
    const name = String(req.query.name ?? 'session');
    const value = String(req.query.value ?? 'ok');
    res.setHeader('Set-Cookie', `${name}=${value}; Path=/`);
    res.json({ set: { name, value } });
  });

  app.use('/proxy', createProxyRouter());
  app.use('/cookies', createCookiesRouter());
  app.use('/mocks', createMocksRouter());
  app.use('/mock', createMockMatcherRouter());
  app.use('/monitors', createMonitorsRouter());
  app.use('/auth', createAuthRouter());
  app.use('/workspace', createWorkspaceRouter());

  return app;
}

const PORT = Number(process.env.PORT) || 4000;

const isEntry = import.meta.url === `file://${process.argv[1]}`;
if (isEntry) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[postmanlike-proxy] listening on http://localhost:${PORT}`);
  });
  monitorScheduler.start();
}
