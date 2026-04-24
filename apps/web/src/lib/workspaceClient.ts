import type { WorkspaceSnapshotData } from './workspaceSnapshot';

const PROXY_URL =
  (import.meta.env.VITE_PROXY_URL as string | undefined) ?? 'http://localhost:4000';

export interface ServerSnapshotEnvelope {
  version: number;
  updatedAt: number;
  data: WorkspaceSnapshotData;
}

export async function fetchWorkspace(token: string): Promise<ServerSnapshotEnvelope | null> {
  const res = await fetch(`${PROXY_URL}/workspace`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET /workspace: ${res.status}`);
  const body = (await res.json()) as { snapshot: ServerSnapshotEnvelope | null };
  return body.snapshot;
}

export async function pushWorkspace(
  token: string,
  data: WorkspaceSnapshotData,
  version: number,
): Promise<void> {
  const res = await fetch(`${PROXY_URL}/workspace`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ data, version }),
  });
  if (!res.ok) throw new Error(`PUT /workspace: ${res.status}`);
}
