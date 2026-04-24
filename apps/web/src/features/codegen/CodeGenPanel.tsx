import { useState } from 'react';
import { LANGUAGES } from '@postmanlike/codegen';
import { useTabsStore } from '../../state/tabsStore';

export function CodeGenPanel({ tabId, onClose }: { tabId: string; onClose: () => void }) {
  const tab = useTabsStore((s) => s.tabs.find((t) => t.id === tabId));
  const [langId, setLangId] = useState(LANGUAGES[0].id);
  if (!tab) return null;
  const lang = LANGUAGES.find((l) => l.id === langId) ?? LANGUAGES[0];
  const code = lang.render(tab.draft);

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="codegen-dialog"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[720px] h-[520px] bg-white dark:bg-neutral-900 rounded-lg shadow-xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
          <div className="font-semibold">Code snippet</div>
          <select
            data-testid="codegen-language"
            className="pl-input text-xs"
            value={langId}
            onChange={(e) => setLangId(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <div className="flex-1" />
          <button
            data-testid="codegen-copy"
            className="pl-btn pl-btn-ghost text-xs"
            onClick={() => navigator.clipboard?.writeText(code)}
          >
            Copy
          </button>
          <button className="pl-btn pl-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <pre
          data-testid="codegen-output"
          className="flex-1 overflow-auto font-mono text-xs p-4 whitespace-pre-wrap break-all"
        >
          {code}
        </pre>
      </div>
    </div>
  );
}
