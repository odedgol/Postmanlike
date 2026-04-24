import type { RequestDraft } from '@postmanlike/shared';
import { jsString, normalizeDraft } from './common.js';

export function toFetch(draft: RequestDraft): string {
  const { method, url, headers, body } = normalizeDraft(draft);
  const init: string[] = [`method: ${jsString(method)}`];
  if (Object.keys(headers).length > 0) {
    const lines = Object.entries(headers)
      .map(([k, v]) => `    ${jsString(k)}: ${jsString(v)}`)
      .join(',\n');
    init.push(`headers: {\n${lines}\n  }`);
  }
  if (body != null) init.push(`body: ${jsString(body)}`);

  return `const response = await fetch(${jsString(url)}, {
  ${init.join(',\n  ')}
});
const data = await response.text();
console.log(response.status, data);`;
}
