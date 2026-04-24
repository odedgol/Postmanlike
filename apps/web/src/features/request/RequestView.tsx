import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  buildProxyPayload,
  collectUnresolvedFromDraft,
  resolveDraft,
  type VariableScopes,
} from '@postmanlike/shared';
import { useTabsStore } from '../../state/tabsStore';
import { sendViaProxy } from '../../lib/proxyClient';
import { recordHistory } from '../../lib/db';
import { buildScopes } from '../../lib/scopes';
import { getActiveEnvId, getGlobals, listEnvironments } from '../../lib/db';
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
    const liveScopes = await buildScopes();
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const cancelled = err instanceof DOMException && err.name === 'AbortError';
      setStatus(tab.id, cancelled ? 'idle' : 'error', {
        error: cancelled ? undefined : message,
        abort: undefined,
      });
    }
  };

  const onCancel = () => {
    tab.abort?.abort();
  };

  return (
    <div className="h-full grid grid-rows-[auto_auto_minmax(0,1fr)_minmax(0,1fr)] overflow-hidden">
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
      <div className="border-b border-neutral-300 dark:border-neutral-800 overflow-auto">
        <RequestTabs tabId={tab.id} />
      </div>
      <div className="overflow-auto">
        <ResponseView tabId={tab.id} />
      </div>
    </div>
  );
}
