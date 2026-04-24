import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export interface Account {
  id: string;
  email: string;
  // salt:hash, both base64
  passwordHash: string;
  createdAt: number;
}

export interface TokenPayload {
  sub: string; // account id
  email: string;
  iat: number;
  exp: number;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64url(s: string): Buffer {
  const normalized = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - (s.length % 4)) % 4);
  return Buffer.from(normalized, 'base64');
}

const SECRET =
  process.env.POSTMANLIKE_AUTH_SECRET ||
  // Dev fallback; regenerated per process restart. Real deployments must
  // supply a stable secret via env var.
  randomBytes(32).toString('hex');

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `${salt.toString('base64')}:${derived.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltB64, hashB64] = stored.split(':');
  if (!saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');
  const derived = scryptSync(password, salt, expected.length);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, ttlSec = 7 * 24 * 3600): string {
  const now = Math.floor(Date.now() / 1000);
  const full: TokenPayload = { ...payload, iat: now, exp: now + ttlSec };
  const body = b64url(Buffer.from(JSON.stringify(full), 'utf-8'));
  const sig = b64url(createHmac('sha256', SECRET).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(token: string, nowSec: number = Math.floor(Date.now() / 1000)): TokenPayload | null {
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', SECRET).update(body).digest();
  let actual: Buffer;
  try {
    actual = fromB64url(sig);
  } catch {
    return null;
  }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  let payload: TokenPayload;
  try {
    payload = JSON.parse(fromB64url(body).toString('utf-8')) as TokenPayload;
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp < nowSec) return null;
  return payload;
}

export class AccountStore {
  private byId = new Map<string, Account>();
  private byEmail = new Map<string, Account>();

  register(email: string, password: string): Account {
    const normalized = email.trim().toLowerCase();
    if (this.byEmail.has(normalized)) throw new Error('email already registered');
    const id = `acct-${randomBytes(6).toString('hex')}`;
    const account: Account = {
      id,
      email: normalized,
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
    };
    this.byId.set(id, account);
    this.byEmail.set(normalized, account);
    return account;
  }

  login(email: string, password: string): Account | null {
    const account = this.byEmail.get(email.trim().toLowerCase());
    if (!account) return null;
    if (!verifyPassword(password, account.passwordHash)) return null;
    return account;
  }

  get(id: string): Account | undefined {
    return this.byId.get(id);
  }

  clear() {
    this.byId.clear();
    this.byEmail.clear();
  }
}

export const accountStore = new AccountStore();
