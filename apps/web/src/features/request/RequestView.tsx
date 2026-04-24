import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  buildProxyPayload,
  collectUnresolvedFromDraft,
  resolveDraft,
  type VariableScopes,
} from '@postmanlike/shared';
import { runPreRequest, runTests } from '@postmanlike/runtime';
import { useTabsStore } from '../../state/tabsStore';
import { sendViaProxy } from '../../lib/proxyClient';
import { recordHistory } from '../../lib/db';
import { buildScopes } from '../../lib/scopes';
import {
  getActiveEnvId,
  getGlobals,
  listEnvironments,
  setGlobals,
  updateEnvironment,
} from '../../lib/db';
import { useConsoleStore } from '../../state/consoleStore';
import { useTestResultsStore } from '../../state/testResultsStore';
import { UrlBar } from './UrlBar';
import { RequestTabs } from './RequestTabs';
import { UnresolvedBadge } from '../env/UnresolvedBadge';
import { ResponseView } from '../response/ResponseView';
import { nanoid } from 'nanoid';

interface Props {
  tabId: string;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function RequestView({ tabId }: Props) {
  const tab = useTabsStore((s) => s.tabs.find((t) => t.id === tabId));
  const { updateDraft, setStatus } = useTabsStore();

  // Reactive scopes for the unresolved badge. Reruns on env / globals / active env change.
  const scopes = useLiveQuery(
    async (): Promise<VariableScopes> => {
      const [envs, globals, activeId] = await Promise.all([
        listEnvironments(),
        getGlobals(),
        getActiveEnvId(),
      ]);
      const active = activeId ? envs.find((e) => e.id === activeId) : undefined;
      const toRecord = (rows: { key: string; value: string; enabled: boolean }[]) => {
        const out: Record<string, string> = {};
        for (const r of rows) if (r.enabled && r.key.trim().length > 0) out[r.key] = r.value;
        return out;
      };
      return {
        environment: active ? toRecord(active.values) : {},
        global: toRecord(globals.values),
      };
    },
    [],
    {} as VariableScopes,
  );

  const unresolved = useMemo(() => {
    if (!tab) return [];
    return collectUnresolvedFromDraft(tab.draft, scopes ?? {});
  }, [tab, scopes]);

  if (!tab) return null;

  const onSend = async () => {
    if (tab.status === 'sending') return;

    // Pre-request script runs first, potentially mutating env/globals.
    let liveScopes = await buildScopes();
    const preOutcome = runPreRequest(tab.draft, {
      environment: liveScopes.environment ?? {},
      globals: liveScopes.global ?? {},
    });
    useConsoleStore.getState().push(preOutcome.consoleEntries);
    await applyPatches(preOutcome.envPatch, preOutcome.globalsPatch);
    if (preOutcome.error) {
      setStatus(tab.id, 'error', {
        error: `Pre-request script error: ${preOutcome.error.message}`,
        abort: undefined,
      });
      return;
    }
    liveScopes = await buildScopes();

    const { draft: resolved } = resolveDraft(tab.draft, liveScopes);
    const payload = buildProxyPayload(resolved);

    const ctrl = new AbortController();
    setStatus(tab.id, 'sending', { abort: ctrl, response: undefined, error: undefined });
    try {
      const response = await sendViaProxy(payload, { signal: ctrl.signal });
      setStatus(tab.id, 'ok', { response, abort: undefined });
      await recordHistory({
        id: nanoid(10),
        timestamp: Date.now(),
        requestSnapshot: tab.draft,
        status: response.status,
        timingMs: response.timingMs,
        sizeBytes: response.sizeBytes,
      });
      // Post-response / test script.
      const testOutcome = runTests(tab.draft, response, {
        environment: liveScopes.environment ?? {},
        globals: liveScopes.global ?? {},
      });
      useConsoleStore.getState().push(testOutcome.consoleEntries);
      useTestResultsStore
        .getState()
        .setForTab(tab.id, testOutcome.tests, testOutcome.error?.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const cancelled = err instanceof DOMException && err.name === 'AbortError';
      setStatus(tab.id, cancelled ? 'idle' : 'error', {
        error: cancelled ? undefined : message,
        abort: undefined,
      });
    }
  };

  async function applyPatches(
    envPatch: Record<string, string>,
    globalsPatch: Record<string, string>,
  ) {
    if (Object.keys(envPatch).length > 0) {
      const envs = await listEnvironments();
      const activeId = await getActiveEnvId();
      const active = activeId ? envs.find((e) => e.id === activeId) : undefined;
      if (active) {
        const map = new Map(active.values.map((v) => [v.key, v] as const));
        for (const [k, v] of Object.entries(envPatch)) {
          map.set(k, { key: k, value: v, enabled: true });
        }
        await updateEnvironment({ ...active, values: [...map.values()] });
      }
    }
    if (Object.keys(globalsPatch).length > 0) {
      const row = await getGlobals();
      const map = new Map(row.values.map((v) => [v.key, v] as const));
      for (const [k, v] of Object.entries(globalsPatch)) {
        map.set(k, { key: k, value: v, enabled: true });
      }
      await setGlobals([...map.values()]);
    }
  }

  const onCancel = () => {
    tab.abort?.abort();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <UrlBar
        methods={METHODS}
        method={tab.draft.method}
        url={tab.draft.url}
        sending={tab.status === 'sending'}
        onMethodChange={(method) => updateDraft(tab.id, { method })}
        onUrlChange={(url) => updateDraft(tab.id, { url })}
        onSend={onSend}
        onCancel={onCancel}
      />
      <UnresolvedBadge names={unresolved} />
      {/*
        flex split (request / response) with flex-1 + min-h-0 on each half
        so they share the remaining space equally even when the children's
        intrinsic content (e.g. the body textarea) would otherwise bias
        grid's track sizing.
      */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 border-b border-neutral-300 dark:border-neutral-800 overflow-hidden">
          <RequestTabs tabId={tab.id} />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <ResponseView tabId={tab.id} />
        </div>
      </div>
    </div>
  );
}
