import type { EnvironmentVariable, VariableScopes } from '@postmanlike/shared';
import { getActiveEnvId, getGlobals, listEnvironments } from './db';

function toRecord(values: EnvironmentVariable[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of values) {
    if (v.enabled && v.key.trim().length > 0) out[v.key] = v.value;
  }
  return out;
}

export async function buildScopes(): Promise<VariableScopes> {
  const [envs, globals, activeEnvId] = await Promise.all([
    listEnvironments(),
    getGlobals(),
    getActiveEnvId(),
  ]);
  const active = activeEnvId ? envs.find((e) => e.id === activeEnvId) : undefined;
  return {
    environment: active ? toRecord(active.values) : {},
    global: toRecord(globals.values),
  };
}
