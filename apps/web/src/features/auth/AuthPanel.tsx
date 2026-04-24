import type { RequestAuth } from '@postmanlike/shared';
import { defaultAuthFor } from '@postmanlike/shared';
import { useTabsStore } from '../../state/tabsStore';

const AUTH_TYPES: { id: RequestAuth['type']; label: string }[] = [
  { id: 'none', label: 'No Auth' },
  { id: 'api-key', label: 'API Key' },
  { id: 'bearer', label: 'Bearer Token' },
  { id: 'basic', label: 'Basic Auth' },
  { id: 'aws-sigv4', label: 'AWS Signature v4' },
];

export function AuthPanel({ tabId }: { tabId: string }) {
  const tab = useTabsStore((s) => s.tabs.find((t) => t.id === tabId));
  const updateDraft = useTabsStore((s) => s.updateDraft);
  if (!tab) return null;
  const auth: RequestAuth = tab.draft.auth ?? { type: 'none' };

  const setAuth = (next: RequestAuth) => updateDraft(tab.id, { auth: next });

  return (
    <div className="space-y-3 text-sm" data-testid="auth-panel">
      <div className="flex items-center gap-2">
        <label className="text-xs text-neutral-500">Type</label>
        <select
          data-testid="auth-type"
          className="pl-input"
          value={auth.type}
          onChange={(e) => setAuth(defaultAuthFor(e.target.value as RequestAuth['type']))}
        >
          {AUTH_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {auth.type === 'none' && (
        <div className="text-neutral-500">This request does not use authentication.</div>
      )}

      {auth.type === 'bearer' && (
        <Field label="Token">
          <input
            data-testid="auth-bearer-token"
            className="pl-input w-full font-mono"
            value={auth.token}
            onChange={(e) => setAuth({ ...auth, token: e.target.value })}
          />
        </Field>
      )}

      {auth.type === 'basic' && (
        <>
          <Field label="Username">
            <input
              data-testid="auth-basic-username"
              className="pl-input w-full font-mono"
              value={auth.username}
              onChange={(e) => setAuth({ ...auth, username: e.target.value })}
            />
          </Field>
          <Field label="Password">
            <input
              data-testid="auth-basic-password"
              className="pl-input w-full font-mono"
              type="password"
              value={auth.password}
              onChange={(e) => setAuth({ ...auth, password: e.target.value })}
            />
          </Field>
        </>
      )}

      {auth.type === 'api-key' && (
        <>
          <Field label="Key">
            <input
              data-testid="auth-apikey-key"
              className="pl-input w-full font-mono"
              value={auth.key}
              onChange={(e) => setAuth({ ...auth, key: e.target.value })}
            />
          </Field>
          <Field label="Value">
            <input
              data-testid="auth-apikey-value"
              className="pl-input w-full font-mono"
              value={auth.value}
              onChange={(e) => setAuth({ ...auth, value: e.target.value })}
            />
          </Field>
          <Field label="Add to">
            <select
              data-testid="auth-apikey-location"
              className="pl-input"
              value={auth.location}
              onChange={(e) =>
                setAuth({ ...auth, location: e.target.value as 'header' | 'query' })
              }
            >
              <option value="header">Header</option>
              <option value="query">Query param</option>
            </select>
          </Field>
        </>
      )}

      {auth.type === 'aws-sigv4' && (
        <>
          <Field label="Access Key Id">
            <input
              data-testid="auth-aws-access-key"
              className="pl-input w-full font-mono"
              value={auth.accessKeyId}
              onChange={(e) => setAuth({ ...auth, accessKeyId: e.target.value })}
            />
          </Field>
          <Field label="Secret Access Key">
            <input
              data-testid="auth-aws-secret-key"
              className="pl-input w-full font-mono"
              type="password"
              value={auth.secretAccessKey}
              onChange={(e) => setAuth({ ...auth, secretAccessKey: e.target.value })}
            />
          </Field>
          <Field label="Region">
            <input
              data-testid="auth-aws-region"
              className="pl-input font-mono"
              value={auth.region}
              onChange={(e) => setAuth({ ...auth, region: e.target.value })}
            />
          </Field>
          <Field label="Service">
            <input
              data-testid="auth-aws-service"
              className="pl-input font-mono"
              value={auth.service}
              onChange={(e) => setAuth({ ...auth, service: e.target.value })}
            />
          </Field>
          <Field label="Session Token (optional)">
            <input
              data-testid="auth-aws-session"
              className="pl-input w-full font-mono"
              value={auth.sessionToken ?? ''}
              onChange={(e) =>
                setAuth({ ...auth, sessionToken: e.target.value || undefined })
              }
            />
          </Field>
          <div className="text-[11px] text-neutral-500">
            The proxy computes the signature server-side so the secret never leaves this machine via the browser.
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
