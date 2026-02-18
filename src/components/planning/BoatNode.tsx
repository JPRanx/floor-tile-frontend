import type { BoatProjection } from '../../requests/planning';

interface BoatNodeProps {
  projection: BoatProjection;
  onClick: () => void;
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${day} ${months[date.getMonth()]}`;
}

function getDeadlineStyle(daysLeft: number | null): { badge: string; classes: string } {
  if (daysLeft == null) return { badge: '', classes: '' };
  if (daysLeft < 0) return { badge: 'VENCIDO', classes: 'text-red-400 bg-red-500/15 border-red-500/30' };
  if (daysLeft <= 3) return { badge: `${daysLeft}d`, classes: 'text-red-400 bg-red-500/15 border-red-500/30' };
  if (daysLeft <= 7) return { badge: `${daysLeft}d`, classes: 'text-orange-400 bg-orange-500/15 border-orange-500/30' };
  if (daysLeft <= 14) return { badge: `${daysLeft}d`, classes: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  return { badge: `${daysLeft}d`, classes: 'text-slate-500 bg-slate-500/10 border-slate-500/20' };
}

const STATUS_ICON: Record<string, string> = {
  drafting: '\u{270F}\u{FE0F}',
  action_needed: '\u{26A0}\u{FE0F}',
  ordered: '\u{1F4E8}',
  confirmed: '\u{2705}',
};

export function BoatNode({ projection, onClick }: BoatNodeProps) {
  const deadline = getDeadlineStyle(projection.days_until_order_deadline);
  const hasDraft = projection.is_active;
  const isCompleted = projection.draft_status === 'ordered' || projection.draft_status === 'confirmed';

  const palletsText = hasDraft
    ? `${projection.projected_pallets_min}p`
    : `~${projection.projected_pallets_min}p`;

  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 w-40 rounded-xl border p-3 text-left
        transition-all duration-200 cursor-pointer
        ${isCompleted
          ? 'bg-slate-800/15 border-slate-700/20 opacity-60 hover:opacity-80'
          : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/60 hover:border-slate-600/60'
        }
      `}
    >
      {/* Boat name + date */}
      <div className="text-white text-sm font-medium truncate">{projection.boat_name}</div>
      <div className="text-slate-500 text-xs mt-0.5">{formatDateShort(projection.departure_date)}</div>

      {/* Pallets + confidence */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-slate-400 text-xs">{palletsText}</span>
        {!hasDraft && (
          <div className="flex gap-0.5">
            {['very_high', 'high', 'medium', 'low', 'very_low'].map((level, i) => {
              const levels = ['very_high', 'high', 'medium', 'low', 'very_low'];
              const idx = levels.indexOf(projection.confidence);
              const filled = i <= idx;
              return (
                <span
                  key={level}
                  className={`w-1 h-1 rounded-full ${filled ? 'bg-indigo-400' : 'bg-slate-700'}`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Status / deadline row */}
      <div className="flex items-center justify-between mt-2 gap-1">
        {projection.draft_status ? (
          <span className="text-[10px] text-slate-400">
            {STATUS_ICON[projection.draft_status] || ''} {projection.draft_status === 'drafting' ? 'Borrador' : projection.draft_status === 'ordered' ? 'Enviado' : projection.draft_status === 'confirmed' ? 'Confirmado' : 'Accion'}
          </span>
        ) : (
          <span className="text-[10px] text-slate-600">Sin revisar</span>
        )}
        {deadline.badge && !isCompleted && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${deadline.classes}`}>
            {deadline.badge}
          </span>
        )}
      </div>
    </button>
  );
}
