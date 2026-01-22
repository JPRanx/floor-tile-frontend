import { useState, useEffect } from 'react';

interface MetricBoxProps {
  label: string;
  value: number;
  format: 'currency' | 'number' | 'percent' | 'm2';
  trend?: number; // percentage change
  glowColor?: 'emerald' | 'amber' | 'indigo' | 'rose';
}

const glowStyles = {
  emerald: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]',
  amber: 'shadow-[0_0_30px_rgba(245,158,11,0.15)]',
  indigo: 'shadow-[0_0_30px_rgba(99,102,241,0.15)]',
  rose: 'shadow-[0_0_30px_rgba(244,63,94,0.15)]',
};

const textColors = {
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  indigo: 'text-indigo-400',
  rose: 'text-rose-400',
};

function formatValue(value: number, format: MetricBoxProps['format']): string {
  switch (format) {
    case 'currency':
      if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(1)}M`;
      }
      if (value >= 1_000) {
        return `$${(value / 1_000).toFixed(0)}K`;
      }
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

    case 'm2':
      if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M m²`;
      }
      if (value >= 1_000) {
        return `${(value / 1_000).toFixed(0)}K m²`;
      }
      return `${value.toLocaleString('en-US', { minimumFractionDigits: 0 })} m²`;

    case 'percent':
      return `${value.toFixed(1)}%`;

    case 'number':
    default:
      return value.toLocaleString('en-US', { minimumFractionDigits: 0 });
  }
}

export function MetricBox({ label, value, format, trend, glowColor = 'emerald' }: MetricBoxProps) {
  const [displayValue, setDisplayValue] = useState(0);

  // Count-up animation
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      current += increment;

      if (frame >= steps || current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div
      className={`
        bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4
        ${glowStyles[glowColor]}
        transition-all duration-300 hover:scale-[1.02]
      `}
    >
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${textColors[glowColor]}`}>
        {formatValue(displayValue, format)}
      </p>
      {trend !== undefined && trend !== 0 && (
        <p className={`text-xs mt-1 ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
        </p>
      )}
    </div>
  );
}
