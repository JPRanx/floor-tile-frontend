interface TrendIndicatorProps {
  direction: 'up' | 'down' | 'stable';
  changePct: number;
  size?: 'sm' | 'md';
}

export function TrendIndicator({
  direction,
  changePct,
  size = 'sm'
}: TrendIndicatorProps) {
  const colorClass =
    direction === 'up'
      ? 'text-emerald-400'
      : direction === 'down'
        ? 'text-rose-400'
        : 'text-amber-400';

  const arrow =
    direction === 'up'
      ? '\u2191'  // ↑
      : direction === 'down'
        ? '\u2193'  // ↓
        : '\u2192'; // →

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const arrowSize = size === 'sm' ? 'text-sm' : 'text-base';

  // Format percentage - handle very large values
  const formatPct = (pct: number) => {
    if (Math.abs(pct) >= 1000) {
      return `${(pct / 1000).toFixed(1)}K`;
    }
    return pct.toFixed(0);
  };

  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${colorClass}`}>
      <span className={arrowSize}>{arrow}</span>
      <span className={textSize}>
        {direction === 'up' ? '+' : direction === 'down' ? '' : ''}
        {formatPct(changePct)}%
      </span>
    </span>
  );
}
