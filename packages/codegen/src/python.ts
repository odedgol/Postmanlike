import type { RequestDraft } from '@postmanlike/shared';
import { normalizeDraft, pyString } from './common.js';

export function toPython(draft: RequestDraft): string {
  const { method, url, headers, body } = normalizeDraft(draft);
  const headerLines = Object.entries(headers)
    .map(([k, v]) => `    ${pyString(k)}: ${pyString(v)}`)
    .join(',\n');

  const parts: string[] = [`import requests`, ``];
  if (headerLines) {
    parts.push(`headers = {\n${headerLines}\n}`);
  } else {
    parts.push(`headers = {}`);
  }
  if (body != null) {
    parts.push(`data = ${pyString(body)}`);
  }
  const call = [
    `requests.request(`,
    `    method=${pyString(method)}`,
    `    , url=${pyString(url)}`,
    `    , headers=headers`,
    ...(body != null ? [`    , data=data`] : []),
    `)`,
  ].join('\n');
  parts.push(`response = ${call}`);
  parts.push(`print(response.status_code, response.text)`);
  return parts.join('\n');
}
