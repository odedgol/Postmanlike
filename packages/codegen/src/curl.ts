import type { RequestDraft } from '@postmanlike/shared';
import { normalizeDraft } from './common.js';

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export function toCurl(draft: RequestDraft): string {
  const { method, url, headers, body } = normalizeDraft(draft);
  const lines = [`curl -X ${method} ${shellQuote(url)}`];
  for (const [k, v] of Object.entries(headers)) {
    lines.push(`  -H ${shellQuote(`${k}: ${v}`)}`);
  }
  if (body != null) {
    lines.push(`  --data ${shellQuote(body)}`);
  }
  return lines.join(' \\\n');
}
