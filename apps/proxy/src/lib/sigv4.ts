import { createHash, createHmac } from 'node:crypto';
import type { AwsSigV4Auth } from '@postmanlike/shared';

const EMPTY_BODY_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf-8').digest();
}

function sha256Hex(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function signingKey(secret: string, date: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secret}`, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

function uriEncode(str: string, encodeSlash = true): string {
  return str.replace(/[^A-Za-z0-9_.~\-]/g, (ch) => {
    if (ch === '/' && !encodeSlash) return ch;
    return (
      '%' +
      Array.from(Buffer.from(ch, 'utf-8'))
        .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
        .join('%')
    );
  });
}

function canonicalQuery(url: URL): string {
  const entries = [...url.searchParams.entries()];
  entries.sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)));
  return entries.map(([k, v]) => `${uriEncode(k)}=${uriEncode(v)}`).join('&');
}

export interface SignResult {
  headers: Record<string, string>;
}

export function signRequest(
  input: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  },
  auth: AwsSigV4Auth,
  now: Date = new Date(),
): SignResult {
  const parsed = new URL(input.url);
  const amzDate = now
    .toISOString()
    .replace(/[:-]|\.\d{3}/g, '')
    .replace(/Z$/, 'Z');
  const date = amzDate.slice(0, 8);

  const outHeaders: Record<string, string> = { ...input.headers };
  outHeaders['Host'] = parsed.host;
  outHeaders['X-Amz-Date'] = amzDate;
  if (auth.sessionToken) outHeaders['X-Amz-Security-Token'] = auth.sessionToken;

  const bodyHash = input.body ? sha256Hex(input.body) : EMPTY_BODY_HASH;
  outHeaders['X-Amz-Content-Sha256'] = bodyHash;

  const canonicalHeaderEntries = Object.entries(outHeaders)
    .map(([k, v]) => [k.toLowerCase(), v.trim()] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b));
  const canonicalHeaders =
    canonicalHeaderEntries.map(([k, v]) => `${k}:${v}\n`).join('');
  const signedHeaders = canonicalHeaderEntries.map(([k]) => k).join(';');

  const canonicalRequest = [
    input.method.toUpperCase(),
    uriEncode(parsed.pathname || '/', false),
    canonicalQuery(parsed),
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join('\n');

  const credentialScope = `${date}/${auth.region}/${auth.service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const key = signingKey(auth.secretAccessKey, date, auth.region, auth.service);
  const signature = createHmac('sha256', key).update(stringToSign, 'utf-8').digest('hex');

  outHeaders['Authorization'] =
    `AWS4-HMAC-SHA256 Credential=${auth.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { headers: outHeaders };
}
