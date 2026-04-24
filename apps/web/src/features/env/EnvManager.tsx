import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Environment, EnvironmentVariable } from '@postmanlike/shared';
import {
  createEnvironment,
  deleteEnvironment,
  getGlobals,
  listEnvironments,
  setGlobals,
  updateEnvironment,
} from '../../lib/db';
import { EnvVariableEditor } from './EnvVariableEditor';

interface Props {
  onClose: () => void;
}

type Selected =
  | { kind: 'env'; id: string }
  | { kind: 'globals' }
  | null;

export function EnvManager({ onClose }: Props) {
  const envs = useLiveQuery(() => listEnvironments(), [], [] as Environment[]);
  const globals = useLiveQuery(() => getGlobals(), [], { key: 'default' as const, values: [] });
  const [selected, setSelected] = useState<Selected>(null);
  const [newEnvName, setNewEnvName] = useState('');

  useEffect(() => {
    if (!selected && envs && envs.length > 0) {
      setSelected({ kind: 'env', id: envs[0].id });
    }
  }, [envs, selected]);

  const activeEnv = selected?.kind === 'env' ? envs?.find((e) => e.id === selected.id) : undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="env-manager"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[860px] h-[560px] bg-white dark:bg-neutral-900 rounded-lg shadow-xl flex overflow-hidden">
        <aside className="w-60 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
          <div className="px-3 py-2 text-xs uppercase tracking-wide text-neutral-500">
            Environments
          </div>
          <div className="flex-1 overflow-auto">
            {envs?.map((env) => (
              <button
                key={env.id}
                data-testid={`env-item-${env.id}`}
                onClick={() => setSelected({ kind: 'env', id: env.id })}
                className={`block w-full text-left px-3 py-1.5 text-sm ${
                  selected?.kind === 'env' && selected.id === env.id
                    ? 'bg-neutral-100 dark:bg-neutral-800 font-semibold'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {env.name}
              </button>
            ))}
            <button
              data-testid="env-globals-button"
              onClick={() => setSelected({ kind: 'globals' })}
              className={`block w-full text-left px-3 py-1.5 text-sm border-t border-neutral-200 dark:border-neutral-800 ${
                selected?.kind === 'globals'
                  ? 'bg-neutral-100 dark:bg-neutral-800 font-semibold'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              ⊕ Globals
            </button>
          </div>
          <div className="p-2 border-t border-neutral-200 dark:border-neutral-800 flex gap-1">
            <input
              data-testid="env-new-name"
              className="pl-input flex-1 text-xs"
              placeholder="New environment"
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newEnvName.trim()) {
                  createEnvironment(newEnvName.trim()).then((env) =>
                    setSelected({ kind: 'env', id: env.id }),
                  );
                  setNewEnvName('');
                }
              }}
            />
            <button
              data-testid="env-new-button"
              className="pl-btn pl-btn-primary text-xs"
              disabled={!newEnvName.trim()}
              onClick={async () => {
                if (!newEnvName.trim()) return;
                const env = await createEnvironment(newEnvName.trim());
                setSelected({ kind: 'env', id: env.id });
                setNewEnvName('');
              }}
            >
              +
            </button>
          </div>
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
            {selected?.kind === 'env' && activeEnv ? (
              <>
                <input
                  data-testid="env-name-input"
                  className="pl-input flex-1 font-semibold"
                  value={activeEnv.name}
                  onChange={(e) =>
                    updateEnvironment({ ...activeEnv, name: e.target.value })
                  }
                />
                <button
                  data-testid="env-delete-button"
                  className="pl-btn pl-btn-ghost text-red-500"
                  onClick={() => {
                    if (confirm(`Delete environment "${activeEnv.name}"?`)) {
                      deleteEnvironment(activeEnv.id);
                      setSelected(null);
                    }
                  }}
                >
                  Delete
                </button>
              </>
            ) : selected?.kind === 'globals' ? (
              <div className="font-semibold">Globals</div>
            ) : (
              <div className="text-neutral-500 text-sm">Select an environment or Globals.</div>
            )}
            <button
              data-testid="env-close-button"
              className="pl-btn pl-btn-ghost"
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {selected?.kind === 'env' && activeEnv && (
              <EnvVariableEditor
                testid="env-vars"
                values={activeEnv.values}
                onChange={(values: EnvironmentVariable[]) =>
                  updateEnvironment({ ...activeEnv, values })
                }
              />
            )}
            {selected?.kind === 'globals' && (
              <EnvVariableEditor
                testid="globals-vars"
                values={globals?.values ?? []}
                onChange={(values: EnvironmentVariable[]) => setGlobals(values)}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
