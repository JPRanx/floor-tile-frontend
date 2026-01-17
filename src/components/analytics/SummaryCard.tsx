import { useState, useEffect } from 'react';

interface SummaryCardProps {
  title: string;
  value: number;
  format: 'currency' | 'percent';
  changePercent?: number;
  glowColor: 'green' | 'blue' | 'gold';
}

// Design tokens - glow effects
const glowStyles: Record<string, string> = {
  green: 'shadow-[0_0_30px_rgba(16,185,129,0.3)]',
  blue: 'shadow-[0_0_30px_rgba(99,102,241,0.3)]',
  gold: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]',
};

// Design tokens - text colors
const textColors: Record<string, string> = {
  green: 'text-emerald-400',
  blue: 'text-indigo-400',
  gold: 'text-amber-400',
};

export function SummaryCard({ title, value, format, changePercent, glowColor }: SummaryCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  // Smooth animation using requestAnimationFrame
  useEffect(() => {
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(value * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  const formattedValue = format === 'currency'
    ? `$${displayValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}`
    : `${displayValue.toFixed(1)}%`;

  return (
    <div className={`
      bg-slate-800/50 backdrop-blur-sm
      rounded-xl border border-slate-700/50
      p-6
      ${glowStyles[glowColor]}
      transition-all duration-300 hover:scale-[1.02]
    `}>
      <p className="text-slate-400 text-sm font-medium uppercase tracking-wide">
        {title}
      </p>
      <p className={`text-3xl font-bold mt-2 ${textColors[glowColor]}`}>
        {formattedValue}
      </p>
      {changePercent !== undefined && (
        <p className={`text-sm mt-2 ${changePercent >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
          {changePercent >= 0 ? '▲' : '▼'} {Math.abs(changePercent)}%
        </p>
      )}
    </div>
  );
}
