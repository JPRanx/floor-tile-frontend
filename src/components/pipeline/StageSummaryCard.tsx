import { useEffect, useState } from 'react';

interface StageSummaryCardProps {
  label: string;
  count: number;
  color: 'slate' | 'emerald' | 'indigo' | 'amber';
  icon: string;
}

// Design tokens - glow effects matching Analytics
const glowStyles: Record<string, string> = {
  slate: 'shadow-[0_0_30px_rgba(148,163,184,0.2)]',
  emerald: 'shadow-[0_0_30px_rgba(16,185,129,0.3)]',
  indigo: 'shadow-[0_0_30px_rgba(99,102,241,0.3)]',
  amber: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]',
};

// Design tokens - text colors
const textColors: Record<string, string> = {
  slate: 'text-slate-300',
  emerald: 'text-emerald-400',
  indigo: 'text-indigo-400',
  amber: 'text-amber-400',
};

// Design tokens - dot colors
const dotColors: Record<string, string> = {
  slate: 'bg-slate-500',
  emerald: 'bg-emerald-500',
  indigo: 'bg-indigo-500',
  amber: 'bg-amber-500',
};

export function StageSummaryCard({ label, count, color, icon }: StageSummaryCardProps) {
  const [displayCount, setDisplayCount] = useState(0);

  // Smooth animation using requestAnimationFrame (matching Analytics pattern)
  useEffect(() => {
    if (count === 0) {
      setDisplayCount(0);
      return;
    }

    const duration = 800;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayCount(Math.floor(count * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [count]);

  return (
    <div
      className={`
        bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4
        transition-all duration-300 hover:scale-[1.02]
        ${count > 0 ? glowStyles[color] : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wide">
            {label}
          </p>
          <p className={`text-3xl font-bold mt-1 ${textColors[color]}`}>
            {displayCount}
          </p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>

      {/* Dot indicators - show up to 10 dots with pulse animation */}
      {count > 0 && (
        <div className="flex gap-1 mt-3">
          {Array.from({ length: Math.min(count, 10) }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${dotColors[color]} animate-pulse`}
              style={{
                animationDelay: `${i * 100}ms`,
                animationDuration: '2s',
              }}
            />
          ))}
          {count > 10 && (
            <span className="text-slate-500 text-xs ml-1">+{count - 10}</span>
          )}
        </div>
      )}
    </div>
  );
}
