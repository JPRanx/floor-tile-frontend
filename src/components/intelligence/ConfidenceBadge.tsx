import type { ConfidenceLevel } from '../../requests/intelligence';

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  showLabel?: boolean;
}

const styles: Record<ConfidenceLevel, { bg: string; text: string; label: string }> = {
  HIGH: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    label: 'Alta',
  },
  MEDIUM: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    label: 'Media',
  },
  LOW: {
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
    label: 'Baja',
  },
};

export function ConfidenceBadge({ level, showLabel = true }: ConfidenceBadgeProps) {
  const style = styles[level];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
        ${style.bg} ${style.text}
      `}
    >
      {/* Confidence dots */}
      <span className="flex gap-0.5">
        <span className={`w-1.5 h-1.5 rounded-full ${level === 'LOW' ? 'bg-current' : 'bg-current'}`} />
        <span className={`w-1.5 h-1.5 rounded-full ${level === 'LOW' ? 'bg-current/30' : 'bg-current'}`} />
        <span className={`w-1.5 h-1.5 rounded-full ${level === 'HIGH' ? 'bg-current' : 'bg-current/30'}`} />
      </span>
      {showLabel && <span>{style.label}</span>}
    </span>
  );
}
