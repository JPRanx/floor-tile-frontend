import type { CustomerStatus } from '../../requests/intelligence';

interface StatusDotProps {
  status: CustomerStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const styles: Record<CustomerStatus, { dot: string; pulse: string; label: string }> = {
  ACTIVE: {
    dot: 'bg-emerald-400',
    pulse: 'animate-pulse bg-emerald-400/50',
    label: 'Activo',
  },
  COOLING: {
    dot: 'bg-amber-400',
    pulse: '',
    label: 'Enfriando',
  },
  DORMANT: {
    dot: 'bg-slate-500',
    pulse: '',
    label: 'Inactivo',
  },
};

const sizes = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
};

export function StatusDot({ status, showLabel = false, size = 'md' }: StatusDotProps) {
  const style = styles[status];
  const sizeClass = sizes[size];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex">
        {/* Pulse ring for active */}
        {style.pulse && (
          <span className={`absolute inset-0 rounded-full ${style.pulse}`} />
        )}
        {/* Solid dot */}
        <span className={`relative rounded-full ${sizeClass} ${style.dot}`} />
      </span>
      {showLabel && (
        <span className="text-xs text-slate-400">{style.label}</span>
      )}
    </span>
  );
}
