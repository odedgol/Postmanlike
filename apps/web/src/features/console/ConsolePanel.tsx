import { useState } from 'react';
import { useConsoleStore } from '../../state/consoleStore';

export function ConsolePanel() {
  const { entries, clear } = useConsoleStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-neutral-300 dark:border-neutral-800" data-testid="console">
      <div className="flex items-center gap-2 px-3 py-1 bg-neutral-100 dark:bg-neutral-900 text-xs">
        <button
          data-testid="console-toggle"
          onClick={() => setOpen((v) => !v)}
          className="pl-btn pl-btn-ghost"
        >
          Console {open ? '▾' : '▸'}
        </button>
        <span className="text-neutral-500">{entries.length} entries</span>
        <div className="flex-1" />
        {entries.length > 0 && (
          <button
            data-testid="console-clear"
            onClick={clear}
            className="pl-btn pl-btn-ghost text-[10px]"
          >
            clear
          </button>
        )}
      </div>
      {open && (
        <div
          data-testid="console-body"
          className="h-40 overflow-auto font-mono text-[11px] px-3 py-2 bg-white dark:bg-neutral-950"
        >
          {entries.length === 0 ? (
            <div className="text-neutral-500">No console entries yet.</div>
          ) : (
            entries.map((e) => (
              <div
                key={e.id}
                data-testid={`console-entry-${e.level}`}
                className={`whitespace-pre-wrap break-all ${levelColor(e.level)}`}
              >
                <span className="text-neutral-500">[{e.phase}]</span>{' '}
                <span className="uppercase">{e.level}</span>{' '}
                {e.args.join(' ')}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function levelColor(level: string): string {
  switch (level) {
    case 'warn':
      return 'text-amber-500';
    case 'error':
      return 'text-red-500';
    case 'info':
      return 'text-sky-500';
    default:
      return '';
  }
}
