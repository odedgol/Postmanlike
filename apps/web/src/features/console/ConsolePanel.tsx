import { useEffect, useState } from 'react';
import { useConsoleStore } from '../../state/consoleStore';

const MIN_HEIGHT = 80;
const MAX_HEIGHT_MARGIN = 160; // leave at least this many px of the app above the console
const DEFAULT_HEIGHT = 180;
const HEIGHT_STORAGE_KEY = 'postmanlike.console.height';

function loadInitialHeight(): number {
  if (typeof window === 'undefined') return DEFAULT_HEIGHT;
  const raw = window.localStorage.getItem(HEIGHT_STORAGE_KEY);
  if (raw == null) return DEFAULT_HEIGHT;
  const saved = Number(raw);
  if (!Number.isFinite(saved) || saved <= 0) return DEFAULT_HEIGHT;
  return Math.max(MIN_HEIGHT, saved);
}

export function clampHeight(next: number, viewportHeight?: number): number {
  const cap =
    viewportHeight == null
      ? typeof window === 'undefined'
        ? Number.POSITIVE_INFINITY
        : Math.max(MIN_HEIGHT, window.innerHeight - MAX_HEIGHT_MARGIN)
      : Math.max(MIN_HEIGHT, viewportHeight - MAX_HEIGHT_MARGIN);
  return Math.min(cap, Math.max(MIN_HEIGHT, next));
}

// Pure drag math. Exported so the unit tests can exercise the exact same
// logic the pointermove handler uses, without fighting jsdom's event loop.
export function heightFromDrag(params: {
  startY: number;
  currentY: number;
  startHeight: number;
  viewportHeight?: number;
}): number {
  // Drag up (smaller clientY than start) → bigger height.
  const delta = params.startY - params.currentY;
  return clampHeight(params.startHeight + delta, params.viewportHeight);
}

export const CONSOLE_MIN_HEIGHT = MIN_HEIGHT;
export const CONSOLE_DEFAULT_HEIGHT = DEFAULT_HEIGHT;
export const CONSOLE_HEIGHT_STORAGE_KEY = HEIGHT_STORAGE_KEY;
export { loadInitialHeight as loadConsoleHeight };

export function ConsolePanel() {
  const { entries, clear } = useConsoleStore();
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState<number>(loadInitialHeight);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(HEIGHT_STORAGE_KEY, String(height));
  }, [height]);

  const beginDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!open) return;
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height;
    setDragging(true);

    const onMove = (ev: PointerEvent) => {
      setHeight(
        heightFromDrag({ startY, currentY: ev.clientY, startHeight }),
      );
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setDragging(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <div
      className={`border-t border-neutral-300 dark:border-neutral-800 ${
        dragging ? 'select-none' : ''
      }`}
      data-testid="console"
    >
      {open && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize console"
          data-testid="console-resize-handle"
          onPointerDown={beginDrag}
          className={`h-1.5 cursor-ns-resize transition-colors ${
            dragging
              ? 'bg-brand'
              : 'bg-neutral-200 dark:bg-neutral-800 hover:bg-brand/60'
          }`}
        />
      )}
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
          style={{ height }}
          className="overflow-auto font-mono text-[11px] px-3 py-2 bg-white dark:bg-neutral-950"
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
