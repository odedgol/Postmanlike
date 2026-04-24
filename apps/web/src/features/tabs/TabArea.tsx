import { useTabsStore } from '../../state/tabsStore';
import { RequestView } from '../request/RequestView';

export function TabArea() {
  const { tabs, activeId, addTab, closeTab, activate } = useTabsStore();
  const active = tabs.find((t) => t.id === activeId);

  return (
    <div className="h-full grid grid-rows-[auto_1fr] overflow-hidden">
      <div
        role="tablist"
        data-testid="tab-strip"
        className="flex items-stretch bg-neutral-200/60 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 overflow-x-auto"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === activeId}
            onClick={() => activate(t.id)}
            data-testid={`tab-${t.id}`}
            className={`flex items-center gap-2 px-3 py-2 text-sm border-r border-neutral-300 dark:border-neutral-800 whitespace-nowrap ${
              t.id === activeId
                ? 'bg-white dark:bg-neutral-950'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <span className={`pl-chip ${methodColor(t.draft.method)}`}>{t.draft.method}</span>
            <span className="max-w-[200px] truncate">{t.draft.name}</span>
            <span
              role="button"
              aria-label={`Close ${t.draft.name}`}
              className="ml-1 text-neutral-500 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(t.id);
              }}
            >
              ×
            </span>
          </button>
        ))}
        <button
          className="px-3 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          onClick={() => addTab()}
          aria-label="New tab"
          data-testid="new-tab"
        >
          +
        </button>
      </div>
      <div className="overflow-hidden">{active && <RequestView tabId={active.id} />}</div>
    </div>
  );
}

function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'text-emerald-500';
    case 'POST':
      return 'text-amber-500';
    case 'PUT':
      return 'text-sky-500';
    case 'DELETE':
      return 'text-red-500';
    case 'PATCH':
      return 'text-violet-500';
    default:
      return 'text-neutral-500';
  }
}
