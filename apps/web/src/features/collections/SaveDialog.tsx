import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Collection, Folder } from '@postmanlike/shared';
import {
  createCollection,
  listCollections,
  listFolders,
  saveRequest,
} from '../../lib/db';
import { useTabsStore } from '../../state/tabsStore';

interface Props {
  tabId: string;
  onClose: () => void;
}

export function SaveDialog({ tabId, onClose }: Props) {
  const tab = useTabsStore((s) => s.tabs.find((t) => t.id === tabId));
  const markSaved = useTabsStore((s) => s.markSaved);
  const updateDraft = useTabsStore((s) => s.updateDraft);

  const collections = useLiveQuery(() => listCollections(), [], [] as Collection[]);
  const [collectionId, setCollectionId] = useState<string>('');
  const [folderId, setFolderId] = useState<string>('');
  const [name, setName] = useState(tab?.draft.name ?? '');
  const [newCollectionName, setNewCollectionName] = useState('');
  const folders = useLiveQuery(
    () => (collectionId ? listFolders(collectionId) : Promise.resolve<Folder[]>([])),
    [collectionId],
    [] as Folder[],
  );

  useEffect(() => {
    if (collections && collections.length > 0 && !collectionId) {
      setCollectionId(collections[0].id);
    }
  }, [collections, collectionId]);

  if (!tab) return null;

  const save = async () => {
    let targetCollectionId = collectionId;
    if (!targetCollectionId) {
      const trimmed = newCollectionName.trim() || 'New Collection';
      const col = await createCollection(trimmed);
      targetCollectionId = col.id;
    }
    const requestId = tab.originId ?? `req-${crypto.randomUUID()}`;
    const finalName = name.trim() || 'Untitled Request';
    const snapshot = { ...tab.draft, name: finalName };
    await saveRequest({
      id: requestId,
      collectionId: targetCollectionId,
      folderId: folderId || null,
      order: Date.now(),
      draft: snapshot,
    });
    // Keep the tab's live draft in sync with the snapshot so isTabDirty is false.
    updateDraft(tab.id, { name: finalName });
    markSaved(tab.id, requestId, snapshot);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="save-dialog"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[480px] bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-5 space-y-4">
        <div className="text-base font-semibold">Save Request</div>

        <label className="block text-sm space-y-1">
          <span className="text-neutral-500">Request name</span>
          <input
            data-testid="save-dialog-name"
            className="pl-input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        {collections && collections.length > 0 ? (
          <label className="block text-sm space-y-1">
            <span className="text-neutral-500">Collection</span>
            <select
              data-testid="save-dialog-collection"
              className="pl-input w-full"
              value={collectionId}
              onChange={(e) => {
                setCollectionId(e.target.value);
                setFolderId('');
              }}
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block text-sm space-y-1">
            <span className="text-neutral-500">New collection name</span>
            <input
              data-testid="save-dialog-new-collection"
              className="pl-input w-full"
              placeholder="New Collection"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
            />
          </label>
        )}

        {folders && folders.length > 0 && (
          <label className="block text-sm space-y-1">
            <span className="text-neutral-500">Folder (optional)</span>
            <select
              data-testid="save-dialog-folder"
              className="pl-input w-full"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
            >
              <option value="">Root of collection</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            data-testid="save-dialog-cancel"
            className="pl-btn pl-btn-ghost"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            data-testid="save-dialog-confirm"
            className="pl-btn pl-btn-primary"
            onClick={save}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
