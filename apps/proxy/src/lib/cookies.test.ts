import { describe, it, expect, beforeEach } from 'vitest';
import {
  CookieJar,
  cookieJar,
  extractCookiesFromSetCookieHeader,
  parseSetCookie,
  splitSetCookie,
} from './cookies.js';

describe('parseSetCookie', () => {
  it('reads name, value, domain, path, max-age', () => {
    const rec = parseSetCookie('sid=abc; Path=/; Max-Age=60; Domain=example.com', 'other.test');
    expect(rec?.name).toBe('sid');
    expect(rec?.value).toBe('abc');
    expect(rec?.domain).toBe('example.com');
    expect(rec?.path).toBe('/');
    expect(rec?.expires).not.toBeNull();
    expect(rec!.expires! - Date.now()).toBeLessThanOrEqual(61_000);
  });

  it('returns null when no name=value pair is present', () => {
    expect(parseSetCookie('; Domain=example', 'x.test')).toBeNull();
  });
});

describe('splitSetCookie', () => {
  it('splits multiple cookies but preserves Expires=..., Mon, ...', () => {
    const list = splitSetCookie(
      'a=1; Expires=Wed, 21 Oct 2099 07:28:00 GMT, b=2; Path=/',
    );
    expect(list).toEqual(['a=1; Expires=Wed, 21 Oct 2099 07:28:00 GMT', 'b=2; Path=/']);
  });
});

describe('CookieJar', () => {
  let jar: CookieJar;
  beforeEach(() => {
    jar = new CookieJar();
  });

  it('upsert replaces by (domain, name, path)', () => {
    jar.upsertAll(extractCookiesFromSetCookieHeader('sid=1; Path=/', 'example.com'));
    jar.upsertAll(extractCookiesFromSetCookieHeader('sid=2; Path=/', 'example.com'));
    const list = jar.list();
    expect(list).toHaveLength(1);
    expect(list[0].value).toBe('2');
  });

  it('cookieHeaderFor joins matching cookies', () => {
    jar.upsertAll([
      { domain: 'example.com', name: 'a', value: '1', path: '/', expires: null },
      { domain: 'example.com', name: 'b', value: '2', path: '/', expires: null },
      { domain: 'other.com', name: 'c', value: '3', path: '/', expires: null },
    ]);
    const header = jar.cookieHeaderFor(new URL('https://example.com/x'));
    expect(header).toBe('a=1; b=2');
  });

  it('prunes expired cookies from list and cookieHeaderFor', () => {
    jar.upsertAll([
      { domain: 'example.com', name: 'x', value: '1', path: '/', expires: Date.now() - 1000 },
    ]);
    expect(jar.list()).toEqual([]);
    expect(jar.cookieHeaderFor(new URL('https://example.com/x'))).toBeNull();
  });

  it('matches subdomains', () => {
    jar.upsertAll([
      { domain: 'example.com', name: 'a', value: '1', path: '/', expires: null },
    ]);
    expect(jar.cookieHeaderFor(new URL('https://api.example.com/'))).toBe('a=1');
  });
});

describe('singleton cookieJar', () => {
  it('exposes clear for the /cookies DELETE endpoint', () => {
    cookieJar.clear();
    cookieJar.upsert({
      domain: 'example.com',
      name: 'x',
      value: '1',
      path: '/',
      expires: null,
    });
    expect(cookieJar.list()).toHaveLength(1);
    cookieJar.clear();
    expect(cookieJar.list()).toEqual([]);
  });
});
