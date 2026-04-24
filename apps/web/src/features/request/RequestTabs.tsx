import { useState } from 'react';
import type { BodyMode } from '@postmanlike/shared';
import { useTabsStore } from '../../state/tabsStore';
import { KeyValueTable } from './KeyValueTable';

const SECTIONS = ['Params', 'Headers', 'Body', 'Pre-request', 'Tests'] as const;
type Section = (typeof SECTIONS)[number];

interface Props {
  tabId: string;
}

export function RequestTabs({ tabId }: Props) {
  const [section, setSection] = useState<Section>('Params');
  const tab = useTabsStore((s) => s.tabs.find((t) => t.id === tabId));
  const { updateDraft } = useTabsStore();
  if (!tab) return null;
  const d = tab.draft;

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-1 px-2 pt-2 text-sm border-b border-neutral-200 dark:border-neutral-800">
        {SECTIONS.map((s) => (
          <button
            key={s}
            data-testid={`section-${s.toLowerCase()}`}
            onClick={() => setSection(s)}
            className={`px-3 py-1 rounded-t ${
              section === s
                ? 'text-brand border-b-2 border-brand'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex-1 p-2 overflow-auto">
        {section === 'Params' && (
          <KeyValueTable
            testid="params-table"
            rows={d.params}
            onChange={(params) => updateDraft(tabId, { params })}
          />
        )}
        {section === 'Headers' && (
          <KeyValueTable
            testid="headers-table"
            rows={d.headers}
            onChange={(headers) => updateDraft(tabId, { headers })}
          />
        )}
        {section === 'Body' && (
          <BodyPanel
            tabId={tabId}
            mode={d.bodyMode}
            raw={d.bodyRaw}
            form={d.bodyForm}
            onModeChange={(bodyMode) => updateDraft(tabId, { bodyMode })}
            onRawChange={(bodyRaw) => updateDraft(tabId, { bodyRaw })}
            onFormChange={(bodyForm) => updateDraft(tabId, { bodyForm })}
          />
        )}
        {section === 'Pre-request' && (
          <ScriptEditor
            testid="pre-script-editor"
            placeholder={`// Runs before the request is sent.\n// pm.environment.set("token", "abc");\n// console.log("before send");`}
            value={d.preScript ?? ''}
            onChange={(preScript) => updateDraft(tabId, { preScript })}
          />
        )}
        {section === 'Tests' && (
          <ScriptEditor
            testid="test-script-editor"
            placeholder={`// Runs after the response arrives.\n// pm.test("200 OK", () => pm.expect(pm.response.status).toBe(200));`}
            value={d.testScript ?? ''}
            onChange={(testScript) => updateDraft(tabId, { testScript })}
          />
        )}
      </div>
    </div>
  );
}

function ScriptEditor({
  value,
  onChange,
  placeholder,
  testid,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  testid: string;
}) {
  return (
    <textarea
      data-testid={testid}
      className="pl-input w-full h-64 font-mono text-xs"
      spellCheck={false}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function BodyPanel({
  mode,
  raw,
  form,
  onModeChange,
  onRawChange,
  onFormChange,
}: {
  tabId: string;
  mode: BodyMode;
  raw: string;
  form: { key: string; value: string; enabled: boolean }[];
  onModeChange: (m: BodyMode) => void;
  onRawChange: (r: string) => void;
  onFormChange: (rows: { key: string; value: string; enabled: boolean }[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-3 text-sm">
        {(['none', 'raw-json', 'raw-text', 'form-url'] as BodyMode[]).map((m) => (
          <label key={m} className="flex items-center gap-1">
            <input
              type="radio"
              name="body-mode"
              value={m}
              checked={mode === m}
              onChange={() => onModeChange(m)}
              data-testid={`body-mode-${m}`}
            />
            <span>{labelFor(m)}</span>
          </label>
        ))}
      </div>
      {mode === 'none' && <div className="text-sm text-neutral-500">This request has no body.</div>}
      {(mode === 'raw-json' || mode === 'raw-text') && (
        <textarea
          data-testid="body-raw"
          className="pl-input w-full h-40 font-mono"
          value={raw}
          onChange={(e) => onRawChange(e.target.value)}
          placeholder={mode === 'raw-json' ? '{\n  "key": "value"\n}' : 'plain text'}
        />
      )}
      {mode === 'form-url' && (
        <KeyValueTable testid="body-form-table" rows={form} onChange={onFormChange} />
      )}
    </div>
  );
}

function labelFor(m: BodyMode): string {
  switch (m) {
    case 'none':
      return 'none';
    case 'raw-json':
      return 'raw · JSON';
    case 'raw-text':
      return 'raw · text';
    case 'form-url':
      return 'x-www-form-urlencoded';
  }
}
