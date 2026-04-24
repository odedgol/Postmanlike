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
      <div className="flex border-b border-neutral-300 dark:border-neutral-800 text-xs">
        {SECTIONS.map((s) => (
          <button
            key={s}
            data-testid={`sidebar-section-${s.toLowerCase()}`}
            onClick={() => setSection(s)}
            className={`flex-1 py-2 ${
              section === s
                ? 'text-brand border-b-2 border-brand'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            {s}
          </button>
        ))}
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
