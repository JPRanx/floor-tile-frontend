import type { ConfidenceLevel } from '../../requests/planning';

interface ConfidenceDotsProps {
  level: ConfidenceLevel;
}

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { filled: number; color: string }> = {
  very_high: { filled: 5, color: 'bg-emerald-400' },
  high: { filled: 4, color: 'bg-emerald-400' },
  medium: { filled: 3, color: 'bg-amber-400' },
  low: { filled: 2, color: 'bg-orange-400' },
  very_low: { filled: 1, color: 'bg-red-400' },
};

export function ConfidenceDots({ level }: ConfidenceDotsProps) {
  const { filled, color } = CONFIDENCE_CONFIG[level];
  const total = 5;

  return (
    <div className="flex items-center gap-1" title={level.replace('_', ' ')}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full ${
            i < filled ? color : 'bg-slate-600'
          }`}
        />
      ))}
    </div>
  );
}
