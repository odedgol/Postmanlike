import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Collection, Folder, SavedRequest } from '@postmanlike/shared';
import {
  createCollection,
  createFolder,
  deleteCollection,
  deleteFolder,
  deleteSavedRequest,
  listCollections,
  listFolders,
  listSavedRequests,
  renameCollection,
  renameFolder,
} from '../../lib/db';
import { useTabsStore } from '../../state/tabsStore';

export function CollectionsPanel() {
  const collections = useLiveQuery(() => listCollections(), [], [] as Collection[]);
  const [newName, setNewName] = useState('');

  return (
    <div className="h-full flex flex-col" data-testid="collections-panel">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-900">
        <input
          data-testid="new-collection-input"
          className="pl-input flex-1"
          placeholder="New collection"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName.trim()) {
              createCollection(newName.trim());
              setNewName('');
            }
          }}
        />
        <button
          data-testid="new-collection-button"
          className="pl-btn pl-btn-primary"
          disabled={!newName.trim()}
          onClick={() => {
            if (!newName.trim()) return;
            createCollection(newName.trim());
            setNewName('');
          }}
        >
          +
        </button>
      </div>
      <div className="flex-1 overflow-auto" data-testid="collections-list">
        {!collections || collections.length === 0 ? (
          <div className="px-3 py-2 text-xs text-neutral-500">
            No collections yet. Create one above.
          </div>
        ) : (
          collections.map((col) => <CollectionNode key={col.id} collection={col} />)
        )}
      </div>
    </div>
  );
}

function CollectionNode({ collection }: { collection: Collection }) {
  const [open, setOpen] = useState(true);
  const folders = useLiveQuery(() => listFolders(collection.id), [collection.id], [] as Folder[]);
  const requests = useLiveQuery(
    () => listSavedRequests(collection.id),
    [collection.id],
    [] as SavedRequest[],
  );

  return (
    <div className="border-b border-neutral-100 dark:border-neutral-900" data-testid={`collection-${collection.id}`}>
      <div className="flex items-center group px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-5 text-left text-neutral-500"
          aria-label={`Toggle ${collection.name}`}
        >
          {open ? '▾' : '▸'}
        </button>
        <div
          className="flex-1 text-sm cursor-text"
          onDoubleClick={() => {
            const next = prompt('Rename collection', collection.name);
            if (next != null) renameCollection(collection.id, next);
          }}
          data-testid={`collection-name-${collection.id}`}
        >
          <span className="font-semibold">{collection.name}</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 text-xs">
          <button
            className="pl-btn pl-btn-ghost"
            onClick={() => {
              const name = prompt('Folder name', 'New Folder');
              if (name) createFolder(collection.id, null, name);
            }}
            data-testid={`new-folder-${collection.id}`}
            title="New folder"
          >
            ＋
          </button>
          <button
            className="pl-btn pl-btn-ghost text-red-500"
            onClick={() => {
              if (confirm(`Delete collection "${collection.name}"?`)) {
                deleteCollection(collection.id);
              }
            }}
            data-testid={`delete-collection-${collection.id}`}
            title="Delete"
          >
            ×
          </button>
        </div>
      </div>
      {open && (
        <div className="pl-4">
          {folders?.filter((f) => f.parentId === null).map((f) => (
            <FolderNode key={f.id} folder={f} allFolders={folders ?? []} allRequests={requests ?? []} />
          ))}
          {requests?.filter((r) => r.folderId === null).map((r) => (
            <RequestLeaf key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderNode({
  folder,
  allFolders,
  allRequests,
}: {
  folder: Folder;
  allFolders: Folder[];
  allRequests: SavedRequest[];
}) {
  const [open, setOpen] = useState(true);
  const children = allFolders.filter((f) => f.parentId === folder.id);
  const leafRequests = allRequests.filter((r) => r.folderId === folder.id);

  return (
    <div data-testid={`folder-${folder.id}`}>
      <div className="flex items-center group px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-5 text-left text-neutral-500"
          aria-label={`Toggle ${folder.name}`}
        >
          {open ? '▾' : '▸'}
        </button>
        <span
          className="flex-1 text-sm"
          onDoubleClick={() => {
            const next = prompt('Rename folder', folder.name);
            if (next != null) renameFolder(folder.id, next);
          }}
        >
          {folder.name}
        </span>
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 text-xs">
          <button
            className="pl-btn pl-btn-ghost"
            onClick={() => {
              const name = prompt('Subfolder name', 'New Folder');
              if (name) createFolder(folder.collectionId, folder.id, name);
            }}
            title="Add subfolder"
          >
            ＋
          </button>
          <button
            className="pl-btn pl-btn-ghost text-red-500"
            onClick={() => {
              if (confirm(`Delete folder "${folder.name}"?`)) deleteFolder(folder.id);
            }}
            title="Delete folder"
          >
            ×
          </button>
        </div>
      </div>
      {open && (
        <div className="pl-4">
          {children.map((c) => (
            <FolderNode key={c.id} folder={c} allFolders={allFolders} allRequests={allRequests} />
          ))}
          {leafRequests.map((r) => (
            <RequestLeaf key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestLeaf({ request }: { request: SavedRequest }) {
  const addTab = useTabsStore((s) => s.addTab);
  return (
    <div className="flex items-center group px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-sm">
      <button
        data-testid={`saved-request-${request.id}`}
        className="flex-1 text-left flex items-center gap-2"
        onClick={() =>
          addTab({ ...request.draft }, { id: request.id, snapshot: request.draft })
        }
      >
        <span className={`pl-chip ${methodColor(request.draft.method)}`}>
          {request.draft.method}
        </span>
        <span className="truncate">{request.draft.name}</span>
      </button>
      <button
        className="opacity-0 group-hover:opacity-100 pl-btn pl-btn-ghost text-red-500 text-xs"
        onClick={() => {
          if (confirm(`Delete request "${request.draft.name}"?`)) {
            deleteSavedRequest(request.id);
          }
        }}
        title="Delete"
      >
        ×
      </button>
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
