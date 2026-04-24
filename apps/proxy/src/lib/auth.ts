import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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

interface AuthSnapshot {
  secret: string;
  accounts: Account[];
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64url(s: string): Buffer {
  const normalized = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - (s.length % 4)) % 4);
  return Buffer.from(normalized, 'base64');
}

// Resolve relative to the current file so it works whether the proxy runs
// with tsx in dev or node from dist.
const DATA_DIR =
  process.env.POSTMANLIKE_DATA_DIR ||
  resolve(new URL('../..', import.meta.url).pathname, '.data');
const AUTH_FILE = resolve(DATA_DIR, 'auth.json');

function loadSnapshot(): AuthSnapshot {
  if (!existsSync(AUTH_FILE)) return { secret: '', accounts: [] };
  try {
    const raw = readFileSync(AUTH_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as AuthSnapshot;
    return {
      secret: typeof parsed.secret === 'string' ? parsed.secret : '',
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
    };
  } catch {
    return { secret: '', accounts: [] };
  }
}

let snapshot = loadSnapshot();

function persistSnapshot(): void {
  try {
    mkdirSync(dirname(AUTH_FILE), { recursive: true });
    const tmp = `${AUTH_FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify(snapshot, null, 2), 'utf-8');
    renameSync(tmp, AUTH_FILE);
  } catch {
    // In test environments the fs may be read-only; fall through so tests
    // still exercise in-memory behavior.
  }
}

function resolveSecret(): string {
  if (process.env.POSTMANLIKE_AUTH_SECRET) return process.env.POSTMANLIKE_AUTH_SECRET;
  if (!snapshot.secret) {
    snapshot.secret = randomBytes(32).toString('hex');
    persistSnapshot();
  }
  return snapshot.secret;
}

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
  const sig = b64url(createHmac('sha256', resolveSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(token: string, nowSec: number = Math.floor(Date.now() / 1000)): TokenPayload | null {
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', resolveSecret()).update(body).digest();
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
  private readonly persist: () => void;
  private byId = new Map<string, Account>();
  private byEmail = new Map<string, Account>();

  constructor(options: { seed?: Account[]; onChange?: () => void } = {}) {
    this.persist = options.onChange ?? (() => {});
    for (const account of options.seed ?? []) {
      this.byId.set(account.id, account);
      this.byEmail.set(account.email, account);
    }
  }

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
    this.persist();
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
    this.persist();
  }

  all(): Account[] {
    return [...this.byId.values()];
  }
}

// Singleton, hydrated from disk and wired to persist on every mutation.
export const accountStore = new AccountStore({
  seed: snapshot.accounts,
  onChange: () => {
    snapshot = { secret: snapshot.secret || resolveSecret(), accounts: accountStore.all() };
    persistSnapshot();
  },
});
