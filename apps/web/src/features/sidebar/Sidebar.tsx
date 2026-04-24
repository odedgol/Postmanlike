import { useState } from 'react';
import { CollectionsPanel } from '../collections/CollectionsPanel';
import { HistoryPanel } from './HistoryPanel';
import { CookiesPanel } from '../cookies/CookiesPanel';
import { MocksPanel } from '../mocks/MocksPanel';
import { MonitorsPanel } from '../monitors/MonitorsPanel';
import { FlowsPanel } from '../flows/FlowsPanel';

const SECTIONS = ['Collections', 'History', 'Cookies', 'Mocks', 'Monitors', 'Flows'] as const;
type Section = (typeof SECTIONS)[number];

export function Sidebar() {
  const [section, setSection] = useState<Section>('Collections');

  return (
    <div className="h-full flex flex-col">
      <div
        role="tablist"
        data-testid="sidebar-tablist"
        className="grid grid-cols-3 gap-px p-px border-b border-neutral-300 dark:border-neutral-800 text-[11px] bg-neutral-200 dark:bg-neutral-800"
      >
        {SECTIONS.map((s) => {
          const active = section === s;
          return (
            <button
              key={s}
              role="tab"
              aria-selected={active}
              data-testid={`sidebar-section-${s.toLowerCase()}`}
              onClick={() => setSection(s)}
              className={`py-2 px-1 text-center transition-colors truncate ${
                active
                  ? 'bg-white dark:bg-neutral-950 text-brand font-semibold'
                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-hidden">
        {section === 'Collections' && <CollectionsPanel />}
        {section === 'History' && <HistoryPanel />}
        {section === 'Cookies' && <CookiesPanel />}
        {section === 'Mocks' && <MocksPanel />}
        {section === 'Monitors' && <MonitorsPanel />}
        {section === 'Flows' && <FlowsPanel />}
      </div>
    </div>
  );
}
