import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from './auth.js';

export interface AuthenticatedRequest extends Request {
  accountId?: string;
  accountEmail?: string;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
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
  req.accountId = payload.sub;
  req.accountEmail = payload.email;
  next();
}
