import type { RequestDraft } from '@postmanlike/shared';
import { toCurl } from './curl.js';
import { toFetch } from './fetch.js';
import { toAxios } from './axios.js';
import { toPython } from './python.js';
import { toNodeFetch } from './node.js';

export interface CodegenLanguage {
  id: string;
  label: string;
  render: (draft: RequestDraft) => string;
}

export const LANGUAGES: CodegenLanguage[] = [
  { id: 'curl', label: 'cURL', render: toCurl },
  { id: 'fetch', label: 'JavaScript · fetch', render: toFetch },
  { id: 'axios', label: 'JavaScript · axios', render: toAxios },
  { id: 'node-fetch', label: 'Node.js · fetch', render: toNodeFetch },
  { id: 'python', label: 'Python · requests', render: toPython },
];

export { toCurl, toFetch, toAxios, toPython, toNodeFetch };
