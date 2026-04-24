import type { KeyValue, RequestDraft } from './types.js';

function kvEqual(a: KeyValue[], b: KeyValue[]): boolean {
  // Ignore trailing empty rows that the UI auto-adds as an input affordance.
  const trim = (rows: KeyValue[]) => {
    let end = rows.length;
    while (end > 0) {
      const r = rows[end - 1];
      if (r.key === '' && r.value === '') end -= 1;
      else break;
    }
    return rows.slice(0, end);
  };
  const A = trim(a);
  const B = trim(b);
  if (A.length !== B.length) return false;
  for (let i = 0; i < A.length; i++) {
    if (A[i].key !== B[i].key || A[i].value !== B[i].value || A[i].enabled !== B[i].enabled) {
      return false;
    }
  }
  return true;
}

export function draftsEqual(a: RequestDraft, b: RequestDraft): boolean {
  if (a.method !== b.method) return false;
  if (a.url !== b.url) return false;
  if (a.name !== b.name) return false;
  if (a.bodyMode !== b.bodyMode) return false;
  if (a.bodyRaw !== b.bodyRaw) return false;
  if (!kvEqual(a.params, b.params)) return false;
  if (!kvEqual(a.headers, b.headers)) return false;
  if (!kvEqual(a.bodyForm, b.bodyForm)) return false;
  return true;
}
