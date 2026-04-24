import { useEffect, useMemo, useRef, useState } from 'react';
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
import { loadRatio, ratioFromDrag, saveRatio } from './splitRatio';

interface Props {
  tabId: string;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function RequestView({ tabId }: Props) {
  const tab = useTabsStore((s) => s.tabs.find((t) => t.id === tabId));
  const { updateDraft, setStatus } = useTabsStore();

  const [splitRatio, setSplitRatio] = useState<number>(loadRatio);
  const [splitDragging, setSplitDragging] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveRatio(splitRatio);
  }, [splitRatio]);

  const beginSplitDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = splitContainerRef.current;
    if (!container) return;
    e.preventDefault();
    const startY = e.clientY;
    const startRatio = splitRatio;
    const containerHeight = container.getBoundingClientRect().height;
    setSplitDragging(true);

    const onMove = (ev: PointerEvent) => {
      setSplitRatio(
        ratioFromDrag({
          startY,
          currentY: ev.clientY,
          startRatio,
          containerHeight,
        }),
      );
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setSplitDragging(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

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
        flex split (request / response) with a draggable divider between
        them. Each half uses flex-basis: 0 + a configurable flex-grow so
        the ratio is explicit instead of content-biased; min-h-0 lets the
        inner overflow-auto scrolls actually engage.
      */}
      <div
        ref={splitContainerRef}
        data-testid="request-response-split"
        className={`flex-1 min-h-0 flex flex-col overflow-hidden ${
          splitDragging ? 'select-none' : ''
        }`}
      >
        <div
          data-testid="request-pane"
          className="min-h-0 overflow-hidden"
          style={{ flex: `${splitRatio} 1 0` }}
        >
          <RequestTabs tabId={tab.id} />
        </div>
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize request / response split"
          data-testid="split-handle"
          onPointerDown={beginSplitDrag}
          className={`h-1.5 cursor-ns-resize transition-colors ${
            splitDragging
              ? 'bg-brand'
              : 'bg-neutral-200 dark:bg-neutral-800 hover:bg-brand/60'
          }`}
        />
        <div
          data-testid="response-pane"
          className="min-h-0 overflow-hidden"
          style={{ flex: `${1 - splitRatio} 1 0` }}
        >
          <ResponseView tabId={tab.id} />
        </div>
      </div>
    </div>
  );
}
