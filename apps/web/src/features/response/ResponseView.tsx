import { useState, useMemo } from 'react';
import { formatBytes, formatMs } from '@postmanlike/shared';
import { useTabsStore } from '../../state/tabsStore';
import { useTestResultsStore } from '../../state/testResultsStore';

const TABS = ['Body', 'Headers', 'Cookies', 'Tests'] as const;
type RespTab = (typeof TABS)[number];

interface Props {
  tabId: string;
}

export function ResponseView({ tabId }: Props) {
  const tab = useTabsStore((s) => s.tabs.find((t) => t.id === tabId));
  const [view, setView] = useState<RespTab>('Body');
  const [pretty, setPretty] = useState(true);

  if (!tab) return null;

  if (tab.status === 'idle' && !tab.response) {
    return (
      <div data-testid="response-empty" className="p-6 text-neutral-500 text-sm">
        Send a request to see the response here.
      </div>
    );
  }

  if (tab.status === 'sending') {
    return (
      <div data-testid="response-loading" className="p-6 text-neutral-500 text-sm">
        Sending…
      </div>
    );
  }

  if (tab.status === 'error') {
    return (
      <div data-testid="response-error" className="p-6 text-red-500 text-sm font-mono">
        {tab.error ?? 'Request failed'}
      </div>
    );
  }

  const response = tab.response!;
  const statusColor = response.status < 300 ? 'text-emerald-500' : response.status < 400 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="h-full flex flex-col" data-testid="response-view">
      <div className="flex items-center gap-4 px-3 py-2 text-sm border-b border-neutral-200 dark:border-neutral-800">
        <span className={`${statusColor} font-semibold`} data-testid="response-status">
          {response.status} {response.statusText}
        </span>
        <span className="text-neutral-500" data-testid="response-time">
          {formatMs(response.timingMs)}
        </span>
        <span className="text-neutral-500" data-testid="response-size">
          {formatBytes(response.sizeBytes)}
        </span>
        <div className="flex-1" />
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              data-testid={`response-tab-${t.toLowerCase()}`}
              onClick={() => setView(t)}
              className={`px-3 py-1 rounded ${
                view === t ? 'bg-neutral-200 dark:bg-neutral-800' : 'text-neutral-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {/*
        min-h-0 is required on a flex child with overflow-auto in a
        flex column: without it the child's min-height is `auto`, the
        flex item grows to fit its content, and the scroll never
        engages — causing the body to spill past the container.
      */}
      <div className="flex-1 min-h-0 overflow-auto font-mono text-xs">
        {view === 'Body' && (
          <BodyTab
            body={response.body}
            encoding={response.bodyEncoding}
            contentType={response.headers['content-type'] ?? ''}
            pretty={pretty}
            onTogglePretty={() => setPretty((v) => !v)}
          />
        )}
        {view === 'Headers' && <HeadersTab headers={response.headers} />}
        {view === 'Cookies' && <CookiesTab headers={response.headers} />}
        {view === 'Tests' && <TestsTab tabId={tabId} />}
      </div>
    </div>
  );
}

function TestsTab({ tabId }: { tabId: string }) {
  const result = useTestResultsStore((s) => s.byTab[tabId]);
  if (!result || (result.tests.length === 0 && !result.error)) {
    return (
      <div data-testid="tests-empty" className="p-3 text-neutral-500 text-sm">
        No tests ran. Add assertions in the Tests tab of the request.
      </div>
    );
  }
  const passed = result.tests.filter((t) => t.pass).length;
  const failed = result.tests.length - passed;
  return (
    <div className="p-3 space-y-1" data-testid="tests-panel">
      <div className="text-sm">
        <span className="text-emerald-500 font-semibold" data-testid="tests-passed">
          {passed} passed
        </span>
        {failed > 0 && (
          <>
            {' · '}
            <span className="text-red-500 font-semibold" data-testid="tests-failed">
              {failed} failed
            </span>
          </>
        )}
      </div>
      {result.tests.map((t, i) => (
        <div
          key={i}
          data-testid={`test-result-${t.pass ? 'pass' : 'fail'}`}
          className={t.pass ? 'text-emerald-500' : 'text-red-500'}
        >
          {t.pass ? '✓' : '✗'} {t.name}
          {!t.pass && t.message && (
            <div className="ml-4 text-xs text-red-400" data-testid="test-result-message">
              {t.message}
            </div>
          )}
        </div>
      ))}
      {result.error && (
        <div data-testid="test-script-error" className="text-red-500 text-xs mt-2">
          Script error: {result.error}
        </div>
      )}
    </div>
  );
}

function BodyTab({
  body,
  encoding,
  contentType,
  pretty,
  onTogglePretty,
}: {
  body: string;
  encoding: 'utf-8' | 'base64';
  contentType: string;
  pretty: boolean;
  onTogglePretty: () => void;
}) {
  const display = useMemo(() => {
    if (encoding === 'base64') return `[binary · ${body.length} base64 chars]`;
    if (!pretty) return body;
    if (contentType.includes('application/json')) {
      try {
        return JSON.stringify(JSON.parse(body), null, 2);
      } catch {
        return body;
      }
    }
    return body;
  }, [body, encoding, contentType, pretty]);

  return (
    <div>
      <div className="sticky top-0 bg-white dark:bg-neutral-950 px-3 py-1 flex gap-2 text-xs border-b border-neutral-200 dark:border-neutral-800">
        <button
          className="pl-btn pl-btn-ghost"
          onClick={onTogglePretty}
          data-testid="body-toggle-pretty"
        >
          {pretty ? 'Raw' : 'Pretty'}
        </button>
      </div>
      <pre data-testid="response-body" className="p-3 whitespace-pre-wrap break-all">
        {display}
      </pre>
    </div>
  );
}

function HeadersTab({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers);
  return (
    <table className="w-full text-left" data-testid="response-headers">
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k} className="border-b border-neutral-100 dark:border-neutral-900">
            <td className="px-3 py-1 font-semibold align-top w-1/3">{k}</td>
            <td className="px-3 py-1 break-all">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CookiesTab({ headers }: { headers: Record<string, string> }) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) {
    return <div className="p-3 text-neutral-500">No cookies set by the response.</div>;
  }
  return (
    <pre data-testid="response-cookies" className="p-3 whitespace-pre-wrap break-all">
      {setCookie}
    </pre>
  );
}
