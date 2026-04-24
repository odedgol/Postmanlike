import type { RequestDraft } from '@postmanlike/shared';
import { toFetch } from './fetch.js';

export function toNodeFetch(draft: RequestDraft): string {
  return `// Node.js 18+ ships fetch. For older versions:
// import fetch from 'node-fetch';

${toFetch(draft)}`;
}
