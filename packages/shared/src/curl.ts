import type { KeyValue, RequestDraft } from './types.js';

// Minimal shell tokenizer sufficient for real cURL commands. Honours single
// and double quotes, backslash line-continuations, and backslash escapes.
export function tokenizeCurl(input: string): string[] {
  const source = input.replace(/\\\r?\n/g, ' ');
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\' && quote === '"' && i + 1 < source.length) {
        current += source[++i];
        continue;
      }
      if (ch === quote) {
        quote = null;
        continue;
      }
      current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '\\' && i + 1 < source.length) {
      current += source[++i];
      continue;
    }
    if (/\s/.test(ch)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

export interface CurlParseResult {
  draft: Partial<RequestDraft>;
}

const toKV = (raw: string, sep = ':'): KeyValue | null => {
  const idx = raw.indexOf(sep);
  if (idx < 0) return null;
  const key = raw.slice(0, idx).trim();
  const value = raw.slice(idx + 1).trim();
  if (!key) return null;
  return { key, value, enabled: true };
};

export function parseCurl(command: string): RequestDraft {
  const tokens = tokenizeCurl(command);
  let i = 0;
  if (tokens[i] === 'curl') i++;

  let method: string | null = null;
  let url = '';
  const headers: KeyValue[] = [];
  const dataChunks: string[] = [];
  let explicitData = false;

  const takeValue = (flag: string): string => {
    const next = tokens[++i];
    if (next == null) throw new Error(`Missing value for ${flag}`);
    return next;
  };

  while (i < tokens.length) {
    const t = tokens[i];
    switch (true) {
      case t === '-X' || t === '--request':
        method = takeValue(t).toUpperCase();
        break;
      case t === '-H' || t === '--header': {
        const kv = toKV(takeValue(t));
        if (kv) headers.push(kv);
        break;
      }
      case t === '--url':
        url = takeValue(t);
        break;
      case t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary':
        explicitData = true;
        dataChunks.push(takeValue(t));
        break;
      case t === '--data-urlencode': {
        explicitData = true;
        dataChunks.push(takeValue(t));
        break;
      }
      case t === '-u' || t === '--user': {
        const userPass = takeValue(t);
        const encoded =
          typeof btoa === 'function'
            ? btoa(userPass)
            : Buffer.from(userPass, 'utf-8').toString('base64');
        headers.push({ key: 'Authorization', value: `Basic ${encoded}`, enabled: true });
        break;
      }
      case t.startsWith('-'):
        // Unknown flag: skip it and, if its next token looks like a value, skip that too.
        if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) i++;
        break;
      default:
        if (!url) url = t;
        break;
    }
    i++;
  }

  if (!url) throw new Error('cURL command is missing a URL');

  if (!method) method = dataChunks.length > 0 ? 'POST' : 'GET';

  const body = dataChunks.join('&');
  let bodyMode: RequestDraft['bodyMode'] = 'none';
  let bodyRaw = '';
  if (explicitData && body.length > 0) {
    const maybeJson = body.trimStart().startsWith('{') || body.trimStart().startsWith('[');
    bodyMode = maybeJson ? 'raw-json' : 'raw-text';
    bodyRaw = body;
  }

  // Extract query params from the URL so the request builder shows them in the table.
  const { base, params } = splitUrl(url);

  return {
    id: 'imported',
    name: 'Imported from cURL',
    method,
    url: base,
    params,
    headers,
    bodyMode,
    bodyRaw,
    bodyForm: [],
  };
}

function splitUrl(url: string): { base: string; params: KeyValue[] } {
  const qIdx = url.indexOf('?');
  if (qIdx < 0) return { base: url, params: [] };
  const hashIdx = url.indexOf('#', qIdx);
  const qs = hashIdx >= 0 ? url.slice(qIdx + 1, hashIdx) : url.slice(qIdx + 1);
  const base = url.slice(0, qIdx) + (hashIdx >= 0 ? url.slice(hashIdx) : '');
  const params: KeyValue[] = qs
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf('=');
      return eq >= 0
        ? { key: decode(pair.slice(0, eq)), value: decode(pair.slice(eq + 1)), enabled: true }
        : { key: decode(pair), value: '', enabled: true };
    });
  return { base, params };
}

function decode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
