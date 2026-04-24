import type { KeyValue, RequestAuth, RequestDraft } from './types.js';

// Base64 that works in both Node and browsers.
function b64(input: string): string {
  if (typeof btoa === 'function') return btoa(input);
  // Node fallback
  return Buffer.from(input, 'utf-8').toString('base64');
}

export interface AppliedAuth {
  headers: Record<string, string>;
  queryParams: KeyValue[];
  // If set, the proxy performs server-side signing with this auth instead.
  serverAuth?: RequestAuth;
}

export function applyAuth(auth: RequestAuth | undefined): AppliedAuth {
  const headers: Record<string, string> = {};
  const queryParams: KeyValue[] = [];
  if (!auth || auth.type === 'none') return { headers, queryParams };

  switch (auth.type) {
    case 'bearer':
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      return { headers, queryParams };
    case 'basic': {
      if (auth.username || auth.password) {
        headers['Authorization'] = `Basic ${b64(`${auth.username}:${auth.password}`)}`;
      }
      return { headers, queryParams };
    }
    case 'api-key': {
      if (!auth.key) return { headers, queryParams };
      if (auth.location === 'query') {
        queryParams.push({ key: auth.key, value: auth.value, enabled: true });
      } else {
        headers[auth.key] = auth.value;
      }
      return { headers, queryParams };
    }
    case 'aws-sigv4':
      return { headers, queryParams, serverAuth: auth };
  }
}

export function appliesClientSide(auth: RequestAuth | undefined): boolean {
  return !!auth && auth.type !== 'aws-sigv4' && auth.type !== 'none';
}

export function authNeedsServerSigning(auth: RequestAuth | undefined): boolean {
  return !!auth && auth.type === 'aws-sigv4';
}

export function emptyAuth(): RequestAuth {
  return { type: 'none' };
}

// Used by UI to create default config bags for each type.
export function defaultAuthFor(type: RequestAuth['type']): RequestAuth {
  switch (type) {
    case 'none':
      return { type: 'none' };
    case 'api-key':
      return { type: 'api-key', key: '', value: '', location: 'header' };
    case 'bearer':
      return { type: 'bearer', token: '' };
    case 'basic':
      return { type: 'basic', username: '', password: '' };
    case 'aws-sigv4':
      return {
        type: 'aws-sigv4',
        accessKeyId: '',
        secretAccessKey: '',
        region: 'us-east-1',
        service: 's3',
      };
  }
}

export function mergeDraftAuthHeaders(draft: RequestDraft): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of draft.headers) {
    if (h.enabled && h.key.trim().length > 0) out[h.key] = h.value;
  }
  const applied = applyAuth(draft.auth);
  for (const [k, v] of Object.entries(applied.headers)) out[k] = v;
  return out;
}
