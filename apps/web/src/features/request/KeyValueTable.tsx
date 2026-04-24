import type { KeyValue } from '@postmanlike/shared';

interface Props {
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
  testid?: string;
}

export function KeyValueTable({ rows, onChange, testid }: Props) {
  const ensureTrailing = (next: KeyValue[]): KeyValue[] => {
    const last = next[next.length - 1];
    if (!last || last.key.length > 0 || last.value.length > 0) {
      return [...next, { key: '', value: '', enabled: true }];
    }
    return next;
  };

  const update = (idx: number, patch: Partial<KeyValue>) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(ensureTrailing(next));
  };

  const remove = (idx: number) => {
    const next = rows.filter((_, i) => i !== idx);
    onChange(next.length > 0 ? next : [{ key: '', value: '', enabled: true }]);
  };

  return (
    <div data-testid={testid} className="space-y-1">
      <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-xs text-neutral-500 px-1">
        <span>On</span>
        <span>Key</span>
        <span>Value</span>
        <span />
      </div>
      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(e) => update(idx, { enabled: e.target.checked })}
            aria-label={`Enable row ${idx + 1}`}
          />
          <input
            className="pl-input font-mono"
            placeholder="key"
            value={row.key}
            onChange={(e) => update(idx, { key: e.target.value })}
            data-testid={testid ? `${testid}-key-${idx}` : undefined}
          />
          <input
            className="pl-input font-mono"
            placeholder="value"
            value={row.value}
            onChange={(e) => update(idx, { value: e.target.value })}
            data-testid={testid ? `${testid}-value-${idx}` : undefined}
          />
          <button
            className="text-neutral-500 hover:text-red-500 px-2"
            onClick={() => remove(idx)}
            aria-label={`Remove row ${idx + 1}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
