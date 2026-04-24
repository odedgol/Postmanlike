import { applyAuth } from './auth.js';
import type { KeyValue, ProxyRequestPayload, RequestDraft } from './types.js';

export function kvToRecord(items: KeyValue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of items) {
    if (item.enabled && item.key.trim().length > 0) {
      out[item.key] = item.value;
    }
  }
  return out;
}

export function appendQueryParams(url: string, params: KeyValue[]): string {
  const active = params.filter((p) => p.enabled && p.key.trim().length > 0);
  if (active.length === 0) return url;
  const hashIdx = url.indexOf('#');
  const hash = hashIdx >= 0 ? url.slice(hashIdx) : '';
  const withoutHash = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const sep = withoutHash.includes('?') ? '&' : '?';
  const encoded = active
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join('&');
  return `${withoutHash}${sep}${encoded}${hash}`;
}

export function buildProxyPayload(draft: RequestDraft): ProxyRequestPayload {
  const applied = applyAuth(draft.auth);
  const headers = kvToRecord(draft.headers);
  for (const [k, v] of Object.entries(applied.headers)) headers[k] = v;
  const url = appendQueryParams(
    draft.url,
    [...draft.params, ...applied.queryParams],
  );

  let body: string | undefined;
  switch (draft.bodyMode) {
    case 'none':
      body = undefined;
      break;
    case 'raw-json': {
      body = draft.bodyRaw;
      if (body && !headerHas(headers, 'content-type')) {
        headers['Content-Type'] = 'application/json';
      }
      break;
    }
    case 'raw-text': {
      body = draft.bodyRaw;
      if (body && !headerHas(headers, 'content-type')) {
        headers['Content-Type'] = 'text/plain';
      }
      break;
    }
    case 'form-url': {
      const params = new URLSearchParams();
      for (const kv of draft.bodyForm) {
        if (kv.enabled && kv.key.trim().length > 0) params.append(kv.key, kv.value);
      }
      body = params.toString();
      if (!headerHas(headers, 'content-type')) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
      break;
    }
  }

  return {
    method: draft.method,
    url,
    headers,
    body,
    ...(applied.serverAuth ? { auth: applied.serverAuth } : {}),
  };
}

function headerHas(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase();
  return Object.keys(headers).some((k) => k.toLowerCase() === lower);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
