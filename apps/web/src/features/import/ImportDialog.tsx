import { useState } from 'react';
import { parseCurl, parsePostmanCollection } from '@postmanlike/shared';
import { createCollection, createFolder, saveRequest } from '../../lib/db';
import { useTabsStore } from '../../state/tabsStore';

interface Props {
  onClose: () => void;
}

type Mode = 'curl' | 'postman';

export function ImportDialog({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>('curl');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const addTab = useTabsStore((s) => s.addTab);

  const runImport = async () => {
    setError(null);
    try {
      if (mode === 'curl') {
        const draft = parseCurl(text);
        addTab(draft);
        onClose();
        return;
      }
      const json = JSON.parse(text);
      const imported = parsePostmanCollection(json);
      const col = await createCollection(imported.collection.name);
      // Map _key → real folder id.
      const folderIds = new Map<string, string>();
      for (const f of imported.folders) {
        const parent = f._parentKey ? folderIds.get(f._parentKey) ?? null : null;
        const created = await createFolder(col.id, parent, f.name);
        folderIds.set(f._key, created.id);
      }
      for (const r of imported.requests) {
        const folderId = r._folderKey ? folderIds.get(r._folderKey) ?? null : null;
        await saveRequest({
          id: `req-${crypto.randomUUID()}`,
          collectionId: col.id,
          folderId,
          order: r.order ?? 0,
          draft: { ...r.draft, id: `req-${crypto.randomUUID()}` },
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="import-dialog"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[640px] bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold">Import</div>
          <div className="flex gap-1">
            {(['curl', 'postman'] as Mode[]).map((m) => (
              <button
                key={m}
                data-testid={`import-mode-${m}`}
                onClick={() => setMode(m)}
                className={`pl-btn ${mode === m ? 'pl-btn-primary' : 'pl-btn-ghost'}`}
              >
                {m === 'curl' ? 'cURL' : 'Postman v2.1'}
              </button>
            ))}
          </div>
        </div>
        <textarea
          data-testid="import-text"
          className="pl-input w-full h-56 font-mono text-xs"
          placeholder={
            mode === 'curl'
              ? "curl -X POST https://api.example.com/x -H 'Content-Type: application/json' --data '{\"a\":1}'"
              : 'Paste a Postman v2.1 collection JSON here…'
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {error && (
          <div className="text-red-500 text-xs font-mono" data-testid="import-error">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button className="pl-btn pl-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="pl-btn pl-btn-primary"
            data-testid="import-confirm"
            onClick={runImport}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
