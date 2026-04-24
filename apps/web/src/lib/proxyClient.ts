import type { ProxyRequestPayload, ProxyResponsePayload } from '@postmanlike/shared';

const DEFAULT_PROXY_URL =
  (import.meta.env.VITE_PROXY_URL as string | undefined) ?? 'http://localhost:4000';

export interface SendOptions {
  signal?: AbortSignal;
  proxyUrl?: string;
}

export async function sendViaProxy(
  payload: ProxyRequestPayload,
  opts: SendOptions = {},
): Promise<ProxyResponsePayload> {
  const base = opts.proxyUrl ?? DEFAULT_PROXY_URL;
  const res = await fetch(`${base}/proxy`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: opts.signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Proxy error (${res.status})`;
    throw new Error(message);
  }
  return data as ProxyResponsePayload;
}
