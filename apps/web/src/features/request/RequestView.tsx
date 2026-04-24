import { useMemo } from 'react';
import { buildProxyPayload } from '@postmanlike/shared';
import { useTabsStore } from '../../state/tabsStore';
import { sendViaProxy } from '../../lib/proxyClient';
import { recordHistory } from '../../lib/db';
import { UrlBar } from './UrlBar';
import { RequestTabs } from './RequestTabs';
import { ResponseView } from '../response/ResponseView';
import { nanoid } from 'nanoid';

interface Props {
  tabId: string;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function RequestView({ tabId }: Props) {
  const tab = useTabsStore((s) => s.tabs.find((t) => t.id === tabId));
  const { updateDraft, setStatus } = useTabsStore();

  const payload = useMemo(() => (tab ? buildProxyPayload(tab.draft) : null), [tab]);

  if (!tab || !payload) return null;

  const onSend = async () => {
    if (tab.status === 'sending') return;
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
    <div className="h-full grid grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)] overflow-hidden">
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
      <div className="border-b border-neutral-300 dark:border-neutral-800 overflow-auto">
        <RequestTabs tabId={tab.id} />
      </div>
      <div className="overflow-auto">
        <ResponseView tabId={tab.id} />
      </div>
    </div>
  );
}
