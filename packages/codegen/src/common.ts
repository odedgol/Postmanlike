import { appendQueryParams, kvToRecord, type RequestDraft } from '@postmanlike/shared';

export interface Normalized {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
}

const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);

export function normalizeDraft(draft: RequestDraft): Normalized {
  const method = draft.method.toUpperCase();
  const url = appendQueryParams(draft.url, draft.params);
  const headers = { ...kvToRecord(draft.headers) };

  let body: string | null = null;
  if (!METHODS_WITHOUT_BODY.has(method)) {
    if (draft.bodyMode === 'raw-json') {
      body = draft.bodyRaw;
      if (!hasHeader(headers, 'content-type')) headers['Content-Type'] = 'application/json';
    } else if (draft.bodyMode === 'raw-text') {
      body = draft.bodyRaw;
      if (!hasHeader(headers, 'content-type')) headers['Content-Type'] = 'text/plain';
    } else if (draft.bodyMode === 'form-url') {
      const params = new URLSearchParams();
      for (const kv of draft.bodyForm) {
        if (kv.enabled && kv.key.trim().length > 0) params.append(kv.key, kv.value);
      }
      body = params.toString();
      if (!hasHeader(headers, 'content-type')) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }
  }

  return { method, url, headers, body };
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((k) => k.toLowerCase() === name.toLowerCase());
}

export function jsString(value: string): string {
  return JSON.stringify(value);
}

export function pyString(value: string): string {
  return JSON.stringify(value);
}
