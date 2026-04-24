import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Flow } from '@postmanlike/shared';
import { createFlow, deleteFlow, listFlows } from '../../lib/db';
import { FlowEditor } from './FlowEditor';

export function FlowsPanel() {
  const flows = useLiveQuery(() => listFlows(), [], [] as Flow[]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState('');

  return (
    <div className="h-full flex flex-col" data-testid="flows-panel">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-900">
        <input
          data-testid="new-flow-input"
          className="pl-input flex-1 text-xs"
          placeholder="New flow"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          data-testid="new-flow-button"
          className="pl-btn pl-btn-primary text-xs"
          disabled={!name.trim()}
          onClick={async () => {
            if (!name.trim()) return;
            const flow = await createFlow(name.trim());
            setName('');
            setOpenId(flow.id);
          }}
        >
          +
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {flows?.length === 0 ? (
          <div className="px-3 py-2 text-xs text-neutral-500" data-testid="flows-empty">
            No flows yet.
          </div>
        ) : (
          flows?.map((f) => (
            <div
              key={f.id}
              data-testid="flow-item"
              className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-900 text-sm flex items-center gap-2"
            >
              <button className="flex-1 text-left" onClick={() => setOpenId(f.id)}>
                <div className="font-semibold text-brand">{f.name}</div>
                <div className="text-[10px] text-neutral-500">{f.steps.length} steps</div>
              </button>
              <button
                className="text-red-500 text-xs"
                data-testid={`flow-delete-${f.id}`}
                onClick={() => {
                  if (confirm(`Delete flow "${f.name}"?`)) deleteFlow(f.id);
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
      {openId && <FlowEditor flowId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
