import type { TrendDirection, TrendStrength } from '../../requests/intelligence';

interface TrendArrowProps {
  direction: TrendDirection;
  strength: TrendStrength;
  changePct?: number;
  showValue?: boolean;
}

export function TrendArrow({ direction, strength, changePct, showValue = true }: TrendArrowProps) {
  // Color based on direction
  const colorClass =
    direction === 'UP'
      ? 'text-emerald-400'
      : direction === 'DOWN'
        ? 'text-rose-400'
        : 'text-slate-400';

  // Arrow symbol based on direction and strength
  const getArrow = () => {
    if (direction === 'STABLE') return '→';
    if (direction === 'UP') {
      return strength === 'STRONG' ? '↑↑' : strength === 'MODERATE' ? '↑' : '↗';
    }
    // DOWN
    return strength === 'STRONG' ? '↓↓' : strength === 'MODERATE' ? '↓' : '↘';
  };

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${colorClass}`}>
      <span className="text-sm">{getArrow()}</span>
      {showValue && changePct !== undefined && (
        <span className="text-xs">
          {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%
        </span>
      )}
    </span>
  );
}
