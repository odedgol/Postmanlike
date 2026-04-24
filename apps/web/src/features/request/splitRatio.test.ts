import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_RATIO,
  MAX_RATIO,
  MIN_RATIO,
  SPLIT_RATIO_STORAGE_KEY,
  clampRatio,
  loadRatio,
  ratioFromDrag,
  saveRatio,
} from './splitRatio';

describe('clampRatio', () => {
  it('clamps to the MIN / MAX bounds', () => {
    expect(clampRatio(0)).toBe(MIN_RATIO);
    expect(clampRatio(-1)).toBe(MIN_RATIO);
    expect(clampRatio(1)).toBe(MAX_RATIO);
    expect(clampRatio(10)).toBe(MAX_RATIO);
  });

  it('passes through values inside the range', () => {
    expect(clampRatio(0.5)).toBe(0.5);
    expect(clampRatio(MIN_RATIO + 0.01)).toBe(MIN_RATIO + 0.01);
  });

  it('returns the default for non-finite inputs', () => {
    expect(clampRatio(Number.NaN)).toBe(DEFAULT_RATIO);
    expect(clampRatio(Number.POSITIVE_INFINITY)).toBe(DEFAULT_RATIO);
  });
});

describe('ratioFromDrag', () => {
  it('dragging down (positive delta) grows the request half', () => {
    expect(
      ratioFromDrag({ startY: 200, currentY: 300, startRatio: 0.5, containerHeight: 500 }),
    ).toBe(0.7);
  });

  it('dragging up (negative delta) shrinks the request half', () => {
    expect(
      ratioFromDrag({ startY: 300, currentY: 200, startRatio: 0.5, containerHeight: 500 }),
    ).toBe(0.3);
  });

  it('clamps at the MAX ratio', () => {
    expect(
      ratioFromDrag({ startY: 0, currentY: 10_000, startRatio: 0.5, containerHeight: 500 }),
    ).toBe(MAX_RATIO);
  });

  it('clamps at the MIN ratio', () => {
    expect(
      ratioFromDrag({ startY: 10_000, currentY: 0, startRatio: 0.5, containerHeight: 500 }),
    ).toBe(MIN_RATIO);
  });

  it('returns the clamped startRatio when containerHeight is 0 (defensive)', () => {
    expect(
      ratioFromDrag({ startY: 100, currentY: 200, startRatio: 0.5, containerHeight: 0 }),
    ).toBe(0.5);
  });
});

describe('loadRatio / saveRatio', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loadRatio returns the default when nothing is stored', () => {
    expect(loadRatio()).toBe(DEFAULT_RATIO);
  });

  it('round-trips a stored value, clamped', () => {
    saveRatio(0.7);
    expect(loadRatio()).toBe(0.7);

    saveRatio(5);
    expect(loadRatio()).toBe(MAX_RATIO);
  });

  it('returns the default on garbage', () => {
    window.localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, 'abc');
    expect(loadRatio()).toBe(DEFAULT_RATIO);
  });
});
