import { Router } from 'express';
import { readWorkspace, writeWorkspace } from '../lib/workspaceStore.js';
import { requireAuth, type AuthenticatedRequest } from '../lib/authMiddleware.js';

export function createWorkspaceRouter() {
  const router = Router();

  router.get('/', requireAuth, (req: AuthenticatedRequest, res) => {
    const snapshot = readWorkspace(req.accountId!);
    res.json({ snapshot });
  });

  router.put('/', requireAuth, (req: AuthenticatedRequest, res) => {
    const body = req.body ?? {};
    const data = body.data;
    if (data === undefined) {
      res.status(400).json({ error: 'missing data' });
      return;
    }
    writeWorkspace(req.accountId!, {
      version: Number(body.version) || 1,
      updatedAt: Date.now(),
      data,
    });
    res.json({ ok: true });
  });

  return router;
}
