// Tiny Chai-style expectation subset, just enough for pm.test flows.

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

function show(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export interface Expectation {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toInclude(expected: string | unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeGreaterThan(n: number): void;
  toBeLessThan(n: number): void;
  toHaveStatus(status: number): void;
  not: Expectation;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a as object);
  const bk = Object.keys(b as object);
  if (ak.length !== bk.length) return false;
  for (const key of ak) {
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  return true;
}

export function createExpect(actual: unknown, negated = false): Expectation {
  const check = (ok: boolean, message: string) => {
    if (negated ? ok : !ok) throw new AssertionError(message);
  };

  return {
    toBe(expected) {
      check(Object.is(actual, expected), `expected ${show(actual)} ${negated ? 'not ' : ''}to be ${show(expected)}`);
    },
    toEqual(expected) {
      check(deepEqual(actual, expected), `expected ${show(actual)} ${negated ? 'not ' : ''}to equal ${show(expected)}`);
    },
    toInclude(expected) {
      if (typeof actual === 'string' && typeof expected === 'string') {
        check(actual.includes(expected), `expected ${show(actual)} ${negated ? 'not ' : ''}to include ${show(expected)}`);
      } else if (Array.isArray(actual)) {
        check(actual.includes(expected), `expected array ${negated ? 'not ' : ''}to include ${show(expected)}`);
      } else {
        throw new AssertionError('toInclude requires a string or array');
      }
    },
    toBeTruthy() {
      check(Boolean(actual), `expected ${show(actual)} ${negated ? 'not ' : ''}to be truthy`);
    },
    toBeFalsy() {
      check(!actual, `expected ${show(actual)} ${negated ? 'not ' : ''}to be falsy`);
    },
    toBeGreaterThan(n) {
      check(typeof actual === 'number' && actual > n, `expected ${show(actual)} ${negated ? 'not ' : ''}to be > ${n}`);
    },
    toBeLessThan(n) {
      check(typeof actual === 'number' && actual < n, `expected ${show(actual)} ${negated ? 'not ' : ''}to be < ${n}`);
    },
    toHaveStatus(status) {
      const a = actual as { status?: number } | null;
      check(a != null && a.status === status, `expected response ${negated ? 'not ' : ''}to have status ${status}`);
    },
    get not() {
      return createExpect(actual, !negated);
    },
  };
}
