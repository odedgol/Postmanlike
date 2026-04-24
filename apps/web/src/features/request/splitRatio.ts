export const MIN_RATIO = 0.15;
export const MAX_RATIO = 0.85;
export const DEFAULT_RATIO = 0.5;
export const SPLIT_RATIO_STORAGE_KEY = 'postmanlike.requestResponseSplit';

export function clampRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return DEFAULT_RATIO;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
}

// Pure math: given a drag from startY to currentY in a container of
// containerHeight pixels, compute the new request:response ratio.
// A drag downward (currentY > startY) grows the request half.
export function ratioFromDrag(params: {
  startY: number;
  currentY: number;
  startRatio: number;
  containerHeight: number;
}): number {
  if (params.containerHeight <= 0) return clampRatio(params.startRatio);
  const deltaRatio = (params.currentY - params.startY) / params.containerHeight;
  return clampRatio(params.startRatio + deltaRatio);
}

export function loadRatio(): number {
  if (typeof window === 'undefined') return DEFAULT_RATIO;
  const raw = window.localStorage.getItem(SPLIT_RATIO_STORAGE_KEY);
  if (raw == null) return DEFAULT_RATIO;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_RATIO;
  return clampRatio(parsed);
}

export function saveRatio(ratio: number): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, String(clampRatio(ratio)));
}
