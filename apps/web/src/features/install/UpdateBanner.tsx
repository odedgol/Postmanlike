import { useSwUpdate } from '../../hooks/useSwUpdate';

export function UpdateBanner() {
  const { needsUpdate, reload } = useSwUpdate();
  if (!needsUpdate) return null;
  return (
    <div
      data-testid="update-banner"
      className="px-3 py-1.5 text-xs bg-brand/10 text-brand border-b border-brand/30 flex items-center gap-2"
    >
      <span>A new version of Postmanlike is available.</span>
      <button
        data-testid="update-banner-reload"
        className="pl-btn pl-btn-primary text-xs"
        onClick={reload}
      >
        Reload to update
      </button>
    </div>
  );
}
