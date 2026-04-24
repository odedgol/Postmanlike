import { useLiveQuery } from 'dexie-react-hooks';
import { formatMs, formatBytes } from '@postmanlike/shared';
import { listHistory, clearHistory } from '../../lib/db';
import { useTabsStore } from '../../state/tabsStore';

export function HistoryPanel() {
  const history = useLiveQuery(() => listHistory(), [], []);
  const addTab = useTabsStore((s) => s.addTab);

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 text-xs uppercase tracking-wide text-neutral-500 flex items-center justify-between">
        <span>Recent</span>
        {history && history.length > 0 && (
          <button
            className="pl-btn pl-btn-ghost text-[10px]"
            onClick={() => clearHistory()}
            data-testid="clear-history"
          >
            clear
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto" data-testid="history-list">
        {!history || history.length === 0 ? (
          <div className="px-3 py-2 text-xs text-neutral-500">
            No history yet. Send a request.
          </div>
        ) : (
          history.map((entry) => (
            <button
              key={entry.id}
              data-testid="history-item"
              onClick={() => addTab({ ...entry.requestSnapshot })}
              className="block w-full text-left px-3 py-2 border-b border-neutral-100 dark:border-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono text-brand">{entry.requestSnapshot.method}</span>
                <span
                  className={`${
                    entry.status < 300
                      ? 'text-emerald-500'
                      : entry.status < 400
                        ? 'text-amber-500'
                        : 'text-red-500'
                  } font-mono`}
                >
                  {entry.status}
                </span>
              </div>
              <div className="text-sm truncate">{entry.requestSnapshot.url}</div>
              <div className="text-[10px] text-neutral-500 flex gap-2 mt-0.5">
                <span>{formatMs(entry.timingMs)}</span>
                <span>·</span>
                <span>{formatBytes(entry.sizeBytes)}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
