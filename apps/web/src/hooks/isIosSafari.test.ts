import { describe, it, expect } from 'vitest';
import { isIosSafariUA } from './isIosSafari';

describe('isIosSafariUA', () => {
  it('detects iPhone Safari', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
    expect(isIosSafariUA(ua)).toBe(true);
  });

  it('detects iPad Safari', () => {
    const ua =
      'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
    expect(isIosSafariUA(ua)).toBe(true);
  });

  it('still returns true for Chrome on iOS (CriOS) — same install flow', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.0 Mobile/15E148 Safari/604.1';
    expect(isIosSafariUA(ua)).toBe(true);
  });

  it('returns false for desktop Chrome', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
    expect(isIosSafariUA(ua)).toBe(false);
  });

  it('returns false for desktop Safari', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
    expect(isIosSafariUA(ua)).toBe(false);
  });

  it('returns false for Android Chrome', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36';
    expect(isIosSafariUA(ua)).toBe(false);
  });
});
