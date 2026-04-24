export interface MockResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  delayMs?: number;
}

export interface MockRoute {
  method: string;
  path: string;
  response: MockResponse;
}

export interface Mock {
  id: string;
  name: string;
  routes: MockRoute[];
}

function normalizeMethod(m: string) {
  return m.toUpperCase();
}

function normalizePath(p: string): string {
  let path = p;
  if (!path.startsWith('/')) path = `/${path}`;
  // Strip any trailing slash (other than root) so '/foo/' matches '/foo'.
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path;
}

export class MockRegistry {
  private mocks = new Map<string, Mock>();

  upsert(mock: Mock): Mock {
    const normalized: Mock = {
      ...mock,
      routes: mock.routes.map((r) => ({
        ...r,
        method: normalizeMethod(r.method),
        path: normalizePath(r.path),
      })),
    };
    this.mocks.set(mock.id, normalized);
    return normalized;
  }

  delete(id: string): boolean {
    return this.mocks.delete(id);
  }

  list(): Mock[] {
    return [...this.mocks.values()];
  }

  get(id: string): Mock | undefined {
    return this.mocks.get(id);
  }

  match(id: string, method: string, path: string): MockRoute | undefined {
    const mock = this.mocks.get(id);
    if (!mock) return undefined;
    const m = normalizeMethod(method);
    const p = normalizePath(path);
    return mock.routes.find((r) => r.method === m && r.path === p);
  }
}

export const mockRegistry = new MockRegistry();
