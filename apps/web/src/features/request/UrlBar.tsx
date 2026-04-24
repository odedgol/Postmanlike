interface Props {
  methods: string[];
  method: string;
  url: string;
  sending: boolean;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  onCancel: () => void;
}

export function UrlBar({
  methods,
  method,
  url,
  sending,
  onMethodChange,
  onUrlChange,
  onSend,
  onCancel,
}: Props) {
  return (
    <div className="flex items-center gap-2 p-2 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800">
      <select
        data-testid="method-select"
        value={method}
        onChange={(e) => onMethodChange(e.target.value)}
        className="pl-input font-mono"
        aria-label="HTTP method"
      >
        {methods.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <input
        data-testid="url-input"
        type="text"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSend();
        }}
        className="pl-input flex-1 font-mono"
        placeholder="https://api.example.com/endpoint"
        aria-label="Request URL"
      />
      {sending ? (
        <button
          data-testid="cancel-button"
          className="pl-btn pl-btn-ghost border border-neutral-300 dark:border-neutral-800"
          onClick={onCancel}
        >
          Cancel
        </button>
      ) : (
        <button data-testid="send-button" className="pl-btn pl-btn-primary" onClick={onSend}>
          Send
        </button>
      )}
    </div>
  );
}
