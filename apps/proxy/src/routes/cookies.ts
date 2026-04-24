import { Router } from 'express';
import { cookieJar } from '../lib/cookies.js';

export function createCookiesRouter() {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ cookies: cookieJar.list() });
  });

  router.delete('/', (_req, res) => {
    cookieJar.clear();
    res.json({ ok: true });
  });

  return router;
}
