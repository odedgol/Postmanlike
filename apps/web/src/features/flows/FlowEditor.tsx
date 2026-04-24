import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Flow, FlowStep, RequestDraft } from '@postmanlike/shared';
import { runFlow, type FlowStepResult } from '@postmanlike/runtime';
import {
  getActiveEnvId,
  getGlobals,
  listEnvironments,
  listFlows,
  updateFlow,
} from '../../lib/db';
import { sendViaProxy } from '../../lib/proxyClient';
import { newRequestDraft } from '../../lib/factories';

interface Props {
  flowId: string;
  onClose: () => void;
}

function newStep(kind: FlowStep['kind']): FlowStep {
  const id = `step-${Math.random().toString(36).slice(2, 8)}`;
  if (kind === 'request') {
    return {
      id,
      kind: 'request',
      outputName: 'resp',
      draft: newRequestDraft({ name: 'Request' }),
    };
  }
  if (kind === 'evaluate') {
    return { id, kind: 'evaluate', outputName: 'val', expression: '1 + 1' };
  }
  return { id, kind: 'delay', ms: 100 };
}

export function FlowEditor({ flowId, onClose }: Props) {
  const flows = useLiveQuery(() => listFlows(), [], [] as Flow[]);
  const flow = flows?.find((f) => f.id === flowId);
  const [results, setResults] = useState<FlowStepResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [context, setContext] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setResults(null);
    setContext(null);
  }, [flowId]);

  if (!flow) return null;

  const save = (updates: Partial<Flow>) => updateFlow({ ...flow, ...updates });

  const addStep = (kind: FlowStep['kind']) => {
    save({ steps: [...flow.steps, newStep(kind)] });
  };

  const updateStep = (idx: number, patch: Partial<FlowStep>) => {
    save({
      steps: flow.steps.map((s, i) =>
        i === idx ? ({ ...s, ...patch } as FlowStep) : s,
      ),
    });
  };

  const removeStep = (idx: number) => {
    save({ steps: flow.steps.filter((_, i) => i !== idx) });
  };

  const moveStep = (idx: number, delta: number) => {
    const to = idx + delta;
    if (to < 0 || to >= flow.steps.length) return;
    const next = [...flow.steps];
    const [removed] = next.splice(idx, 1);
    next.splice(to, 0, removed);
    save({ steps: next });
  };

  const run = async () => {
    setRunning(true);
    setResults(null);
    try {
      const envs = await listEnvironments();
      const activeId = await getActiveEnvId();
      const active = activeId ? envs.find((e) => e.id === activeId) : undefined;
      const globals = await getGlobals();
      const toRec = (rows: { key: string; value: string; enabled: boolean }[]) => {
        const out: Record<string, string> = {};
        for (const r of rows) if (r.enabled && r.key.trim()) out[r.key] = r.value;
        return out;
      };
      const result = await runFlow(flow.steps, {
        send: (p) => sendViaProxy(p),
        environment: active ? toRec(active.values) : {},
        globals: toRec(globals.values),
      });
      setResults(result.results);
      setContext(result.context);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="flow-editor"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[860px] h-[80vh] bg-white dark:bg-neutral-900 rounded-lg shadow-xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
          <input
            data-testid="flow-name"
            className="pl-input font-semibold"
            value={flow.name}
            onChange={(e) => save({ name: e.target.value })}
          />
          <div className="flex-1" />
          <button
            data-testid="flow-add-request"
            className="pl-btn pl-btn-ghost text-xs"
            onClick={() => addStep('request')}
          >
            + Request
          </button>
          <button
            data-testid="flow-add-evaluate"
            className="pl-btn pl-btn-ghost text-xs"
            onClick={() => addStep('evaluate')}
          >
            + Evaluate
          </button>
          <button
            data-testid="flow-add-delay"
            className="pl-btn pl-btn-ghost text-xs"
            onClick={() => addStep('delay')}
          >
            + Delay
          </button>
          <button
            data-testid="flow-run"
            className="pl-btn pl-btn-primary"
            disabled={running || flow.steps.length === 0}
            onClick={run}
          >
            {running ? 'Running…' : 'Run'}
          </button>
          <button className="pl-btn pl-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 grid grid-cols-2 gap-4">
          <div className="space-y-3">
            {flow.steps.map((step, idx) => (
              <StepCard
                key={step.id}
                step={step}
                onChange={(patch) => updateStep(idx, patch)}
                onRemove={() => removeStep(idx)}
                onMoveUp={() => moveStep(idx, -1)}
                onMoveDown={() => moveStep(idx, 1)}
              />
            ))}
            {flow.steps.length === 0 && (
              <div className="text-sm text-neutral-500">
                Add a Request, Evaluate, or Delay step to get started.
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase text-neutral-500">Last run</div>
            {results ? (
              <>
                {results.map((r, i) => (
                  <div
                    key={i}
                    data-testid="flow-result"
                    className={`text-xs font-mono p-2 rounded border ${
                      r.error
                        ? 'border-red-500 text-red-500'
                        : 'border-neutral-200 dark:border-neutral-800'
                    }`}
                  >
                    <div>
                      {r.kind}
                      {r.status != null && <> · {r.status}</>}
                      {r.timingMs != null && <> · {r.timingMs}ms</>}
                    </div>
                    {r.error && <div>{r.error}</div>}
                    {r.output != null && (
                      <pre className="whitespace-pre-wrap break-all mt-1 text-neutral-500">
                        {JSON.stringify(r.output, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
                {context && (
                  <div data-testid="flow-context" className="text-xs font-mono text-neutral-500">
                    <div className="uppercase text-[10px] mt-2">Final context</div>
                    <pre className="whitespace-pre-wrap break-all">
                      {JSON.stringify(context, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs text-neutral-500">No run yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({
  step,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  step: FlowStep;
  onChange: (patch: Partial<FlowStep>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div
      data-testid={`flow-step-${step.kind}`}
      className="border border-neutral-200 dark:border-neutral-800 rounded p-3 space-y-2 text-xs"
    >
      <div className="flex items-center gap-2">
        <span className="uppercase font-semibold text-brand">{step.kind}</span>
        <div className="flex-1" />
        <button className="pl-btn pl-btn-ghost" onClick={onMoveUp}>
          ↑
        </button>
        <button className="pl-btn pl-btn-ghost" onClick={onMoveDown}>
          ↓
        </button>
        <button className="pl-btn pl-btn-ghost text-red-500" onClick={onRemove}>
          ×
        </button>
      </div>
      {step.kind === 'delay' && (
        <label className="block space-y-1">
          <span className="text-neutral-500">Milliseconds</span>
          <input
            type="number"
            min={0}
            className="pl-input w-full"
            value={step.ms}
            onChange={(e) => onChange({ ms: Number(e.target.value) || 0 })}
          />
        </label>
      )}
      {step.kind === 'evaluate' && (
        <>
          <label className="block space-y-1">
            <span className="text-neutral-500">Output name</span>
            <input
              data-testid="flow-evaluate-output"
              className="pl-input w-full font-mono"
              value={step.outputName}
              onChange={(e) => onChange({ outputName: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-neutral-500">Expression</span>
            <textarea
              data-testid="flow-evaluate-expression"
              className="pl-input w-full h-20 font-mono"
              value={step.expression}
              onChange={(e) => onChange({ expression: e.target.value })}
            />
          </label>
        </>
      )}
      {step.kind === 'request' && (
        <RequestStepEditor
          draft={step.draft}
          outputName={step.outputName}
          onChange={(patch) => onChange(patch as Partial<FlowStep>)}
        />
      )}
    </div>
  );
}

function RequestStepEditor({
  draft,
  outputName,
  onChange,
}: {
  draft: RequestDraft;
  outputName: string;
  onChange: (
    patch: { draft?: RequestDraft; outputName?: string },
  ) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block space-y-1">
        <span className="text-neutral-500">Output name</span>
        <input
          data-testid="flow-request-output"
          className="pl-input w-full font-mono"
          value={outputName}
          onChange={(e) => onChange({ outputName: e.target.value })}
        />
      </label>
      <div className="flex gap-1 items-center">
        <select
          className="pl-input font-mono text-xs"
          value={draft.method}
          onChange={(e) => onChange({ draft: { ...draft, method: e.target.value } })}
        >
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          data-testid="flow-request-url"
          className="pl-input flex-1 font-mono text-xs"
          value={draft.url}
          onChange={(e) => onChange({ draft: { ...draft, url: e.target.value } })}
        />
      </div>
    </div>
  );
}
