import type { RequestDraft } from '@postmanlike/shared';
import { jsString, normalizeDraft } from './common.js';

export function toAxios(draft: RequestDraft): string {
  const { method, url, headers, body } = normalizeDraft(draft);
  const fields: string[] = [
    `method: ${jsString(method.toLowerCase())}`,
    `url: ${jsString(url)}`,
  ];
  if (Object.keys(headers).length > 0) {
    const lines = Object.entries(headers)
      .map(([k, v]) => `    ${jsString(k)}: ${jsString(v)}`)
      .join(',\n');
    fields.push(`headers: {\n${lines}\n  }`);
  }
  if (body != null) fields.push(`data: ${jsString(body)}`);

  return `import axios from 'axios';

const response = await axios({
  ${fields.join(',\n  ')}
});
console.log(response.status, response.data);`;
}
