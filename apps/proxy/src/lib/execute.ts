export interface ProxyRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodyEncoding: 'utf-8' | 'base64';
  timingMs: number;
  sizeBytes: number;
  url: string;
}

const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);

export async function executeProxyRequest(req: ProxyRequest): Promise<ProxyResponse> {
  // Throws if invalid — caller translates to HTTP 400.
  let parsed: URL;
  try {
    parsed = new URL(req.url);
  } catch {
    throw new Error(`Invalid URL: ${req.url}`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Unsupported protocol: ${parsed.protocol}`);
  }

  const method = req.method.toUpperCase();
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers ?? {})) {
    if (typeof v === 'string' && v.length > 0) headers.set(k, v);
  }

  const init: RequestInit = { method, headers };
  if (!METHODS_WITHOUT_BODY.has(method) && req.body != null && req.body !== '') {
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), req.timeoutMs ?? 30000);
  init.signal = ctrl.signal;

  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(parsed.toString(), init);
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === 'AbortError') {
      throw new Error(`Request timed out after ${req.timeoutMs ?? 30000}ms`);
    }
    throw err;
  }
  clearTimeout(timer);

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? '';
  const looksText = /^(text\/|application\/(json|xml|javascript|graphql|x-www-form-urlencoded))/i.test(contentType)
    || contentType === '';
  const bodyEncoding = looksText ? 'utf-8' : 'base64';
  const body = looksText ? buffer.toString('utf-8') : buffer.toString('base64');

  const outHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    outHeaders[key] = value;
  });

  return {
    status: response.status,
    statusText: response.statusText,
    headers: outHeaders,
    body,
    bodyEncoding,
    timingMs: Date.now() - started,
    sizeBytes: buffer.byteLength,
    url: response.url,
  };
}
