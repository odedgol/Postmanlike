import { useEffect, useState } from 'react';
import type { Collection, Folder, SavedRequest } from '@postmanlike/shared';
import { listFolders, listSavedRequests } from '../../lib/db';

interface Props {
  collection: Collection;
  onClose: () => void;
}

export function DocsDialog({ collection, onClose }: Props) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [requests, setRequests] = useState<SavedRequest[]>([]);

  useEffect(() => {
    (async () => {
      setFolders(await listFolders(collection.id));
      setRequests(await listSavedRequests(collection.id));
    })();
  }, [collection.id]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="docs-dialog"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[880px] h-[80vh] bg-white dark:bg-neutral-900 rounded-lg shadow-xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
          <div className="font-semibold">{collection.name} — Documentation</div>
          <div className="flex-1" />
          <button
            data-testid="docs-print"
            className="pl-btn pl-btn-ghost"
            onClick={() => window.print()}
          >
            Print
          </button>
          <button className="pl-btn pl-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6 prose dark:prose-invert text-sm" data-testid="docs-body">
          {collection.description && (
            <p className="text-neutral-500">{collection.description}</p>
          )}
          <Section
            title="Endpoints"
            folders={folders}
            requests={requests}
            parentId={null}
          />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  folders,
  requests,
  parentId,
  depth = 0,
}: {
  title?: string;
  folders: Folder[];
  requests: SavedRequest[];
  parentId: string | null;
  depth?: number;
}) {
  const childFolders = folders.filter((f) => (f.parentId ?? null) === parentId);
  const leafRequests = requests.filter((r) => (r.folderId ?? null) === parentId);
  return (
    <div className={depth === 0 ? '' : 'ml-3'}>
      {title && <h3 className="font-semibold mt-4 mb-2">{title}</h3>}
      {leafRequests.map((r) => (
        <RequestDoc key={r.id} request={r} />
      ))}
      {childFolders.map((f) => (
        <div key={f.id}>
          <h4 className="font-semibold mt-3 mb-1">{f.name}</h4>
          <Section
            folders={folders}
            requests={requests}
            parentId={f.id}
            depth={depth + 1}
          />
        </div>
      ))}
    </div>
  );
}

function RequestDoc({ request }: { request: SavedRequest }) {
  const d = request.draft;
  return (
    <div
      data-testid="docs-request"
      className="border border-neutral-200 dark:border-neutral-800 rounded p-3 mb-3"
    >
      <div className="flex items-center gap-2">
        <span className="pl-chip font-mono">{d.method}</span>
        <span className="font-mono break-all">{d.url}</span>
      </div>
      <div className="text-base font-semibold mt-1">{d.name}</div>
      {d.headers.filter((h) => h.key.trim().length > 0).length > 0 && (
        <>
          <div className="text-xs uppercase text-neutral-500 mt-2">Headers</div>
          <table className="text-xs w-full">
            <tbody>
              {d.headers
                .filter((h) => h.key.trim().length > 0)
                .map((h, i) => (
                  <tr key={i}>
                    <td className="font-mono pr-4">{h.key}</td>
                    <td className="font-mono break-all">{h.value}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}
      {d.bodyMode !== 'none' && d.bodyRaw && (
        <>
          <div className="text-xs uppercase text-neutral-500 mt-2">
            Body · {d.bodyMode}
          </div>
          <pre className="text-xs bg-neutral-100 dark:bg-neutral-950 rounded p-2 whitespace-pre-wrap break-all">
            {d.bodyRaw}
          </pre>
        </>
      )}
    </div>
  );
}
