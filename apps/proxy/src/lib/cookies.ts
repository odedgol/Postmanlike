export interface CookieRecord {
  domain: string;
  name: string;
  value: string;
  path: string;
  expires: number | null;
}

function trim(s: string): string {
  return s.replace(/^\s+|\s+$/g, '');
}

const ATTRIBUTE_NAMES = new Set([
  'domain',
  'path',
  'expires',
  'max-age',
  'secure',
  'httponly',
  'samesite',
]);

export function parseSetCookie(header: string, defaultDomain: string): CookieRecord | null {
  // A leading ';' means there is no cookie pair before the attributes.
  if (trim(header).startsWith(';')) return null;
  const parts = header.split(';').map(trim).filter(Boolean);
  if (parts.length === 0) return null;
  const [pair, ...rest] = parts;
  const eq = pair.indexOf('=');
  if (eq < 0) return null;
  const firstName = pair.slice(0, eq).trim().toLowerCase();
  if (ATTRIBUTE_NAMES.has(firstName)) return null;
  const rec: CookieRecord = {
    domain: defaultDomain.toLowerCase(),
    name: trim(pair.slice(0, eq)),
    value: trim(pair.slice(eq + 1)),
    path: '/',
    expires: null,
  };
  for (const attr of rest) {
    const idx = attr.indexOf('=');
    const key = (idx < 0 ? attr : attr.slice(0, idx)).toLowerCase();
    const val = idx < 0 ? '' : trim(attr.slice(idx + 1));
    if (key === 'domain' && val) rec.domain = val.replace(/^\./, '').toLowerCase();
    else if (key === 'path' && val) rec.path = val;
    else if (key === 'expires' && val) {
      const t = Date.parse(val);
      if (!Number.isNaN(t)) rec.expires = t;
    } else if (key === 'max-age' && val) {
      const secs = Number(val);
      if (!Number.isNaN(secs)) rec.expires = Date.now() + secs * 1000;
    }
  }
  return rec;
}

export function extractCookiesFromSetCookieHeader(
  header: string | string[] | undefined,
  defaultDomain: string,
): CookieRecord[] {
  if (!header) return [];
  const list = Array.isArray(header) ? header : splitSetCookie(header);
  const out: CookieRecord[] = [];
  for (const h of list) {
    const rec = parseSetCookie(h, defaultDomain);
    if (rec) out.push(rec);
  }
  return out;
}

// `set-cookie` when flattened into a single string from fetch's Headers is
// joined with commas. We split on comma but preserve Expires= which itself
// contains a comma before the weekday abbreviation.
const WEEKDAY_RE = /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i;

export function splitSetCookie(combined: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < combined.length; i++) {
    if (combined[i] !== ',') continue;
    // If the text directly before this comma is a weekday abbreviation
    // (e.g. `Expires=Wed, 21 Oct 2099 ...`), this comma is part of the
    // Expires value, not a cookie separator.
    const before = combined.slice(start, i);
    if (WEEKDAY_RE.test(before)) continue;
    out.push(combined.slice(start, i).trim());
    start = i + 1;
  }
  if (start < combined.length) out.push(combined.slice(start).trim());
  return out.filter(Boolean);
}

export function matches(record: CookieRecord, url: URL): boolean {
  const host = url.hostname.toLowerCase();
  const domainMatches =
    host === record.domain || host.endsWith(`.${record.domain}`);
  if (!domainMatches) return false;
  return url.pathname.startsWith(record.path);
}

export function now(): number {
  return Date.now();
}

export class CookieJar {
  private records: CookieRecord[] = [];

  upsertAll(list: CookieRecord[]) {
    for (const rec of list) this.upsert(rec);
  }

  upsert(rec: CookieRecord) {
    const idx = this.records.findIndex(
      (r) => r.domain === rec.domain && r.name === rec.name && r.path === rec.path,
    );
    if (idx >= 0) this.records[idx] = rec;
    else this.records.push(rec);
  }

  prune(nowMs: number = now()) {
    this.records = this.records.filter((r) => r.expires == null || r.expires > nowMs);
  }

  list(): CookieRecord[] {
    this.prune();
    return [...this.records];
  }

  clear() {
    this.records = [];
  }

  cookieHeaderFor(url: URL): string | null {
    this.prune();
    const applicable = this.records.filter((r) => matches(r, url));
    if (applicable.length === 0) return null;
    return applicable.map((r) => `${r.name}=${r.value}`).join('; ');
  }
}

export const cookieJar = new CookieJar();
