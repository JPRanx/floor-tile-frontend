interface ProductMixBarProps {
  sku: string;
  percentage: number;
  maxPercentage: number;
}

// Colors for different ranks
const barColors = [
  'bg-emerald-500',  // 1st
  'bg-indigo-500',   // 2nd
  'bg-amber-500',    // 3rd
  'bg-rose-500',     // 4th
  'bg-slate-500',    // 5th+
];

export function ProductMixBar({ sku, percentage, maxPercentage }: ProductMixBarProps) {
  const barWidth = (percentage / maxPercentage) * 100;
  const colorIndex = Math.min(4, Math.floor(percentage / 20)); // Higher % = earlier color
  const barColor = barColors[4 - colorIndex] || barColors[4];

  return (
    <div className="flex items-center gap-3">
      {/* Bar */}
      <div className="flex-1 h-4 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Label */}
      <div className="flex items-center gap-2 min-w-[120px]">
        <span className="text-white text-sm font-medium truncate flex-1" title={sku}>
          {sku}
        </span>
        <span className="text-slate-400 text-xs whitespace-nowrap">
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
