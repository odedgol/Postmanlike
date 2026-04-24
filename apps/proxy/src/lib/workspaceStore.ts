import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// What a workspace snapshot looks like on disk. Kept as an opaque JSON blob
// so the proxy doesn't have to understand the client schema; the web app is
// the source of truth for shape.
export interface WorkspaceSnapshot {
  version: number;
  updatedAt: number;
  // Arbitrary JSON shape owned by the client; the proxy only round-trips it.
  data: unknown;
}

const DATA_DIR =
  process.env.POSTMANLIKE_DATA_DIR ||
  resolve(new URL('../..', import.meta.url).pathname, '.data');

function pathFor(accountId: string): string {
  // Defensive: only allow safe characters in the account id segment.
  const safe = accountId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safe) throw new Error('invalid account id');
  return resolve(DATA_DIR, 'users', safe, 'workspace.json');
}

export function readWorkspace(accountId: string): WorkspaceSnapshot | null {
  const file = pathFor(accountId);
  if (!existsSync(file)) return null;
  try {
    const raw = readFileSync(file, 'utf-8');
    const parsed = JSON.parse(raw) as WorkspaceSnapshot;
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeWorkspace(accountId: string, snapshot: WorkspaceSnapshot): void {
  const file = pathFor(accountId);
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(snapshot), 'utf-8');
  renameSync(tmp, file);
}

// Used by tests.
export function wipeAllWorkspaces(): void {
  // Intentionally does not touch the filesystem; tests set POSTMANLIKE_DATA_DIR
  // to a temp dir and clean that up explicitly.
}
