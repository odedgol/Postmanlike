interface Props {
  names: string[];
}

export function UnresolvedBadge({ names }: Props) {
  if (names.length === 0) {
    return <div data-testid="unresolved-badge-empty" className="hidden" aria-hidden />;
  }
  return (
    <div
      data-testid="unresolved-badge"
      className="px-3 py-1 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-b border-amber-500/30"
    >
      <span className="font-semibold">
        {names.length} unresolved variable{names.length === 1 ? '' : 's'}:
      </span>{' '}
      <span className="font-mono" data-testid="unresolved-names">
        {names.join(', ')}
      </span>
    </div>
  );
}
