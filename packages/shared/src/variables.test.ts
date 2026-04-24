import { describe, it, expect } from 'vitest';
import {
  collectUnresolvedFromDraft,
  DYNAMIC_VARS,
  findVariableTokens,
  resolveDraft,
  resolveTemplate,
  resolveVariableName,
} from './variables.js';
import type { RequestDraft } from './types.js';

const draft = (overrides: Partial<RequestDraft> = {}): RequestDraft => ({
  id: 'r',
  name: 'R',
  method: 'GET',
  url: 'https://x.test',
  params: [],
  headers: [],
  bodyMode: 'none',
  bodyRaw: '',
  bodyForm: [],
  ...overrides,
});

describe('findVariableTokens', () => {
  it('finds all {{var}} tokens with positions', () => {
    const tokens = findVariableTokens('{{a}}/users/{{id}}');
    expect(tokens.map((t) => t.name)).toEqual(['a', 'id']);
    expect(tokens[0].start).toBe(0);
    expect(tokens[1].end).toBe(18);
  });

  it('tolerates spaces inside the braces', () => {
    expect(findVariableTokens('{{ foo }}')[0].name).toBe('foo');
  });

  it('returns an empty array for empty or plain strings', () => {
    expect(findVariableTokens('')).toEqual([]);
    expect(findVariableTokens('no variables here')).toEqual([]);
  });
});

describe('resolveVariableName scope precedence', () => {
  const scopes = {
    local: { name: 'L' },
    data: { name: 'D', extra: 'data' },
    environment: { name: 'E', host: 'https://api.example' },
    collection: { name: 'C' },
    global: { name: 'G', footer: 'g' },
  };

  it('prefers local over data over environment over collection over global', () => {
    expect(resolveVariableName('name', scopes)).toBe('L');
    const noLocal = { ...scopes, local: {} };
    expect(resolveVariableName('name', noLocal)).toBe('D');
    const noData = { ...noLocal, data: {} };
    expect(resolveVariableName('name', noData)).toBe('E');
    const noEnv = { ...noData, environment: {} };
    expect(resolveVariableName('name', noEnv)).toBe('C');
    const onlyGlobal = { global: scopes.global };
    expect(resolveVariableName('name', onlyGlobal)).toBe('G');
  });

  it('returns undefined for a truly missing variable', () => {
    expect(resolveVariableName('missing', scopes)).toBeUndefined();
  });

  it('dispatches $dynamic variables', () => {
    const guid = resolveVariableName('$guid', {});
    expect(guid).toMatch(/^[0-9a-f-]{36}$/);
    const ts = resolveVariableName('$timestamp', {});
    expect(ts).toMatch(/^\d+$/);
  });
});

describe('resolveTemplate', () => {
  it('substitutes known variables and reports unresolved names', () => {
    const { text, unresolved } = resolveTemplate(
      '{{host}}/users/{{id}}?flag={{flag}}',
      { environment: { host: 'https://api', id: '42' } },
    );
    expect(text).toBe('https://api/users/42?flag={{flag}}');
    expect(unresolved).toEqual(['flag']);
  });

  it('leaves an empty template unchanged', () => {
    expect(resolveTemplate('', {})).toEqual({ text: '', unresolved: [] });
  });
});

describe('resolveDraft', () => {
  it('rewrites url, headers, params, bodyRaw, and form entries', () => {
    const input = draft({
      url: '{{host}}/{{path}}',
      params: [{ key: 'q', value: '{{q}}', enabled: true }],
      headers: [{ key: 'X-Id', value: '{{id}}', enabled: true }],
      bodyMode: 'raw-json',
      bodyRaw: '{"h": "{{host}}"}',
      bodyForm: [{ key: 'field', value: '{{q}}', enabled: true }],
    });
    const { draft: out, unresolved } = resolveDraft(input, {
      environment: { host: 'https://api', path: 'users', q: 'hi', id: '1' },
    });
    expect(out.url).toBe('https://api/users');
    expect(out.headers[0].value).toBe('1');
    expect(out.params[0].value).toBe('hi');
    expect(out.bodyRaw).toBe('{"h": "https://api"}');
    expect(out.bodyForm[0].value).toBe('hi');
    expect(unresolved).toEqual([]);
  });

  it('reports unresolved names across all fields', () => {
    const input = draft({
      url: '{{a}}',
      headers: [{ key: '{{b}}', value: '', enabled: true }],
      bodyRaw: '{{c}}',
    });
    const { unresolved } = resolveDraft(input, {});
    expect(unresolved.sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('collectUnresolvedFromDraft', () => {
  it('does not count dynamic variables as unresolved', () => {
    const d = draft({ url: '{{$guid}}/u/{{id}}' });
    const unresolved = collectUnresolvedFromDraft(d, {});
    expect(unresolved).toEqual(['id']);
  });
});

describe('DYNAMIC_VARS return plausible values', () => {
  it('$isoTimestamp parses as a date', () => {
    expect(Number.isFinite(Date.parse(DYNAMIC_VARS.$isoTimestamp()))).toBe(true);
  });
  it('$randomInt is a numeric string', () => {
    expect(DYNAMIC_VARS.$randomInt()).toMatch(/^\d+$/);
  });
});
