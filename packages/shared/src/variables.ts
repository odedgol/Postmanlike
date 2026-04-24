import type { KeyValue, RequestDraft } from './types.js';

export interface VariableScopes {
  /** Highest precedence — e.g. values set by a script during a run. */
  local?: Record<string, string>;
  /** Iteration data row (CSV/JSON). */
  data?: Record<string, string>;
  /** Active environment values. */
  environment?: Record<string, string>;
  /** Collection-level values. */
  collection?: Record<string, string>;
  /** Global values. Lowest precedence. */
  global?: Record<string, string>;
}

export type DynamicVariableFn = () => string;

// Token syntax: {{name}} — names may contain letters, digits, underscore, dash, dot, colon, slash.
const VAR_RE = /\{\{\s*([A-Za-z0-9_\-.:/$]+)\s*\}\}/g;

export interface VariableToken {
  name: string;
  start: number;
  end: number;
}

export function findVariableTokens(template: string): VariableToken[] {
  const out: VariableToken[] = [];
  if (!template) return out;
  for (const match of template.matchAll(VAR_RE)) {
    const start = match.index ?? 0;
    out.push({ name: match[1], start, end: start + match[0].length });
  }
  return out;
}

export const DYNAMIC_VARS: Record<string, DynamicVariableFn> = {
  $guid: () => crypto.randomUUID(),
  $randomUUID: () => crypto.randomUUID(),
  $timestamp: () => String(Math.floor(Date.now() / 1000)),
  $isoTimestamp: () => new Date().toISOString(),
  $randomInt: () => String(Math.floor(Math.random() * 1000)),
};

export function resolveVariableName(
  name: string,
  scopes: VariableScopes,
  dynamic: Record<string, DynamicVariableFn> = DYNAMIC_VARS,
): string | undefined {
  if (name.startsWith('$')) {
    const fn = dynamic[name];
    return fn ? fn() : undefined;
  }
  const order: Array<keyof VariableScopes> = [
    'local',
    'data',
    'environment',
    'collection',
    'global',
  ];
  for (const key of order) {
    const scope = scopes[key];
    if (scope && Object.prototype.hasOwnProperty.call(scope, name)) {
      return scope[name];
    }
  }
  return undefined;
}

export interface ResolveResult {
  text: string;
  unresolved: string[];
}

export function resolveTemplate(
  template: string,
  scopes: VariableScopes,
  dynamic?: Record<string, DynamicVariableFn>,
): ResolveResult {
  if (!template) return { text: template ?? '', unresolved: [] };
  const unresolved = new Set<string>();
  const text = template.replace(VAR_RE, (_match, name: string) => {
    const value = resolveVariableName(name, scopes, dynamic);
    if (value == null) {
      unresolved.add(name);
      return `{{${name}}}`;
    }
    return value;
  });
  return { text, unresolved: [...unresolved] };
}

function resolveKeyValueList(
  rows: KeyValue[],
  scopes: VariableScopes,
  dynamic: Record<string, DynamicVariableFn> | undefined,
  unresolved: Set<string>,
): KeyValue[] {
  return rows.map((row) => {
    const key = resolveTemplate(row.key, scopes, dynamic);
    const value = resolveTemplate(row.value, scopes, dynamic);
    key.unresolved.forEach((n) => unresolved.add(n));
    value.unresolved.forEach((n) => unresolved.add(n));
    return { ...row, key: key.text, value: value.text };
  });
}

export interface ResolvedDraft {
  draft: RequestDraft;
  unresolved: string[];
}

export function resolveDraft(
  draft: RequestDraft,
  scopes: VariableScopes,
  dynamic?: Record<string, DynamicVariableFn>,
): ResolvedDraft {
  const unresolved = new Set<string>();
  const url = resolveTemplate(draft.url, scopes, dynamic);
  url.unresolved.forEach((n) => unresolved.add(n));
  const bodyRaw = resolveTemplate(draft.bodyRaw, scopes, dynamic);
  bodyRaw.unresolved.forEach((n) => unresolved.add(n));
  return {
    draft: {
      ...draft,
      url: url.text,
      bodyRaw: bodyRaw.text,
      params: resolveKeyValueList(draft.params, scopes, dynamic, unresolved),
      headers: resolveKeyValueList(draft.headers, scopes, dynamic, unresolved),
      bodyForm: resolveKeyValueList(draft.bodyForm, scopes, dynamic, unresolved),
    },
    unresolved: [...unresolved],
  };
}

export function collectUnresolvedFromDraft(
  draft: RequestDraft,
  scopes: VariableScopes,
): string[] {
  // Uses a no-op dynamic table so $guid etc. aren't counted as unresolved.
  const noopDynamic: Record<string, DynamicVariableFn> = Object.fromEntries(
    Object.keys(DYNAMIC_VARS).map((name) => [name, () => '']),
  );
  return resolveDraft(draft, scopes, noopDynamic).unresolved;
}
