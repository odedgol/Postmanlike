import { Router } from 'express';
import { accountStore, signToken, verifyToken } from '../lib/auth.js';

function validateEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export function createAuthRouter() {
  const router = Router();

  router.post('/register', (req, res) => {
    const { email, password } = req.body ?? {};
    if (!validateEmail(email)) {
      res.status(400).json({ error: 'invalid email' });
      return;
    }
    if (typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'password must be at least 6 characters' });
      return;
    }
    try {
      const account = accountStore.register(email, password);
      const token = signToken({ sub: account.id, email: account.email });
      res.json({ token, account: { id: account.id, email: account.email } });
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.post('/login', (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'email and password required' });
      return;
    }
    const account = accountStore.login(email, password);
    if (!account) {
      res.status(401).json({ error: 'invalid credentials' });
      return;
    }
    const token = signToken({ sub: account.id, email: account.email });
    res.json({ token, account: { id: account.id, email: account.email } });
  });

  router.get('/me', (req, res) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'missing token' });
      return;
    }
    const payload = verifyToken(header.slice('Bearer '.length));
    if (!payload) {
      res.status(401).json({ error: 'invalid or expired token' });
      return;
    }
    res.json({ account: { id: payload.sub, email: payload.email } });
  });

  return router;
}
