import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Environment } from '@postmanlike/shared';
import { getActiveEnvId, listEnvironments, setActiveEnvId } from '../../lib/db';
import { EnvManager } from './EnvManager';

export function EnvSelector() {
  const envs = useLiveQuery(() => listEnvironments(), [], [] as Environment[]);
  const activeId = useLiveQuery(() => getActiveEnvId(), [], null);
  const [managerOpen, setManagerOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1" data-testid="env-selector">
        <select
          data-testid="env-select"
          className="pl-input font-mono text-xs"
          value={activeId ?? ''}
          onChange={(e) => setActiveEnvId(e.target.value || null)}
        >
          <option value="">No Environment</option>
          {envs?.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>
        <button
          data-testid="env-manage-button"
          className="pl-btn pl-btn-ghost text-xs"
          onClick={() => setManagerOpen(true)}
          title="Manage environments"
        >
          ⚙
        </button>
      </div>
      {managerOpen && <EnvManager onClose={() => setManagerOpen(false)} />}
    </>
  );
}
