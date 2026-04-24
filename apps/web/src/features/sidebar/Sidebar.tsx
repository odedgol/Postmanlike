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
        className="flex gap-1 px-1 pt-1 border-b border-neutral-300 dark:border-neutral-800 text-xs overflow-x-auto whitespace-nowrap"
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
              className={`px-2.5 py-1.5 rounded-t border-b-2 transition-colors ${
                active
                  ? 'text-brand border-brand'
                  : 'text-neutral-500 border-transparent hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900'
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
