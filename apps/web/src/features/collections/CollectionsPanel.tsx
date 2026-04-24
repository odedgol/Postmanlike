import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Collection, Folder, SavedRequest } from '@postmanlike/shared';
import { exportPostmanCollection } from '@postmanlike/shared';
import { DocsDialog } from '../docs/DocsDialog';
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
  const [creating, setCreating] = useState(false);

  const create = async () => {
    const trimmed = newName.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      await createCollection(trimmed);
      setNewName('');
    } finally {
      setCreating(false);
    }
  };

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
            if (e.key === 'Enter') {
              e.preventDefault();
              void create();
            }
          }}
          disabled={creating}
        />
        <button
          data-testid="new-collection-button"
          className="pl-btn pl-btn-primary"
          disabled={!newName.trim() || creating}
          onClick={() => void create()}
        >
          +
        </button>
      </div>
      <div className="flex-1 overflow-auto" data-testid="collections-list">
        {!collections || collections.length === 0 ? (
          <div className="px-3 py-2 text-xs text-neutral-500">
            No collections yet. Type a name above and press Enter.
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
  const [docsOpen, setDocsOpen] = useState(false);
  const folders = useLiveQuery(() => listFolders(collection.id), [collection.id], [] as Folder[]);
  const requests = useLiveQuery(
    () => listSavedRequests(collection.id),
    [collection.id],
    [] as SavedRequest[],
  );

  const toggle = () => setOpen((v) => !v);

  return (
    <div
      className="border-b border-neutral-100 dark:border-neutral-900"
      data-testid={`collection-${collection.id}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        className="flex items-center px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer select-none"
      >
        <span className="w-5 text-left text-neutral-500" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
        <div
          className="flex-1 text-sm truncate"
          onDoubleClick={(e) => {
            e.stopPropagation();
            const next = prompt('Rename collection', collection.name);
            if (next != null) renameCollection(collection.id, next);
          }}
          data-testid={`collection-name-${collection.id}`}
          title="Double-click to rename"
        >
          <span className="font-semibold">{collection.name}</span>
        </div>
        <div
          className="flex gap-0.5 text-xs text-neutral-400 dark:text-neutral-500"
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            label="New folder"
            onClick={() => {
              const name = prompt('Folder name', 'New Folder');
              if (name) createFolder(collection.id, null, name);
            }}
            testid={`new-folder-${collection.id}`}
          >
            ＋
          </IconButton>
          <IconButton
            label="Docs"
            onClick={() => setDocsOpen(true)}
            testid={`docs-collection-${collection.id}`}
          >
            📄
          </IconButton>
          <IconButton
            label="Export"
            onClick={async () => {
              const fs = await listFolders(collection.id);
              const rs = await listSavedRequests(collection.id);
              const json = exportPostmanCollection({ collection, folders: fs, requests: rs });
              const blob = new Blob([JSON.stringify(json, null, 2)], {
                type: 'application/json',
              });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `${collection.name.replace(/\s+/g, '_')}.postman_collection.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            testid={`export-collection-${collection.id}`}
          >
            ⇓
          </IconButton>
          <IconButton
            label="Delete"
            danger
            onClick={() => {
              if (confirm(`Delete collection "${collection.name}"?`)) {
                deleteCollection(collection.id);
              }
            }}
            testid={`delete-collection-${collection.id}`}
          >
            ×
          </IconButton>
        </div>
      </div>
      {open && (
        <div className="pl-4">
          {folders
            ?.filter((f) => f.parentId === null)
            .map((f) => (
              <FolderNode
                key={f.id}
                folder={f}
                allFolders={folders ?? []}
                allRequests={requests ?? []}
              />
            ))}
          {requests?.filter((r) => r.folderId === null).map((r) => <RequestLeaf key={r.id} request={r} />)}
        </div>
      )}
      {docsOpen && <DocsDialog collection={collection} onClose={() => setDocsOpen(false)} />}
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
  const toggle = () => setOpen((v) => !v);

  return (
    <div data-testid={`folder-${folder.id}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        className="flex items-center px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer select-none"
      >
        <span className="w-5 text-left text-neutral-500" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
        <span
          className="flex-1 text-sm truncate"
          onDoubleClick={(e) => {
            e.stopPropagation();
            const next = prompt('Rename folder', folder.name);
            if (next != null) renameFolder(folder.id, next);
          }}
          title="Double-click to rename"
        >
          {folder.name}
        </span>
        <div
          className="flex gap-0.5 text-xs text-neutral-400 dark:text-neutral-500"
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            label="Add subfolder"
            onClick={() => {
              const name = prompt('Subfolder name', 'New Folder');
              if (name) createFolder(folder.collectionId, folder.id, name);
            }}
            testid={`new-subfolder-${folder.id}`}
          >
            ＋
          </IconButton>
          <IconButton
            label="Delete folder"
            danger
            onClick={() => {
              if (confirm(`Delete folder "${folder.name}"?`)) deleteFolder(folder.id);
            }}
            testid={`delete-folder-${folder.id}`}
          >
            ×
          </IconButton>
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
    <div className="flex items-center px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-sm">
      <button
        data-testid={`saved-request-${request.id}`}
        className="flex-1 text-left flex items-center gap-2 min-w-0"
        onClick={() =>
          addTab({ ...request.draft }, { id: request.id, snapshot: request.draft })
        }
      >
        <span className={`pl-chip ${methodColor(request.draft.method)}`}>
          {request.draft.method}
        </span>
        <span className="truncate">{request.draft.name}</span>
      </button>
      <IconButton
        label="Delete"
        danger
        onClick={() => {
          if (confirm(`Delete request "${request.draft.name}"?`)) {
            deleteSavedRequest(request.id);
          }
        }}
        testid={`delete-request-${request.id}`}
      >
        ×
      </IconButton>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  testid,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  testid?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      data-testid={testid}
      className={`px-1.5 py-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors ${
        danger ? 'hover:text-red-500' : 'hover:text-neutral-900 dark:hover:text-neutral-100'
      }`}
    >
      {children}
    </button>
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
