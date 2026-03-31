import { useTranslation } from 'react-i18next';
import type { BoatProjection } from '../../requests/planning';
import { formatDateShort } from '../../utils/dateUtils';

interface BoatNodeProps {
  projection: BoatProjection;
  onClick: () => void;
}

const STATUS_ICON: Record<string, string> = {
  drafting: '\u{270F}\u{FE0F}',
  action_needed: '\u{26A0}\u{FE0F}',
  ordered: '\u{1F4E8}',
  confirmed: '\u{2705}',
  skipped: '\u{23ED}\u{FE0F}',
};

export function BoatNode({ projection, onClick }: BoatNodeProps) {
  const { t, i18n } = useTranslation();
  const hasDraft = projection.is_active;
  const isDeparted = new Date(projection.departure_date) < new Date();
  const isSkipped = projection.draft_status === 'skipped';
  const isCompleted = projection.draft_status === 'ordered' || projection.draft_status === 'confirmed' || projection.state === 'DISPATCHED';
  const { critical, urgent, soon, actionable } = projection.urgency_breakdown;
  const totalNeed = critical + urgent + soon;
  const needsAttention = critical > 0 || urgent > 0;
  const nothingToSend = !needsAttention && soon === 0 && !hasDraft;

  // Deadline signal for boats without drafts
  const siesaDays = projection.days_until_siesa_deadline;
  const depDays = projection.days_until_departure;
  let deadlineText: string | null = null;
  let deadlineColor = '';

  if (!isCompleted && !hasDraft && siesaDays !== null) {
    const muted = projection.is_estimated; // estimated boats always muted — dates aren't confirmed
    if (siesaDays > 0 && siesaDays <= 10) {
      deadlineText = t('planning.deadline.planBy', {
        date: formatDateShort(projection.siesa_order_date!, i18n.language)
      });
      deadlineColor = muted ? 'text-slate-500' : 'text-amber-400';
    } else if (siesaDays <= 0 && depDays > 10) {
      deadlineText = t('planning.deadline.orderNow');
      deadlineColor = muted ? 'text-slate-500' : 'text-red-400';
    }
  }

  const palletsText = hasDraft
    ? `${projection.projected_pallets_min}p`
    : `~${projection.projected_pallets_min}p`;

  const nodeStyle = isDeparted
    ? hasDraft
      ? 'bg-slate-800/10 border-emerald-700/10 opacity-40'
      : 'bg-slate-800/10 border-slate-700/10 opacity-30'
    : isSkipped
      ? 'bg-slate-800/10 border-amber-500/15 opacity-40 hover:opacity-60'
    : isCompleted
      ? 'bg-emerald-900/10 border-emerald-500/20 opacity-60 hover:opacity-80'
      : nothingToSend
        ? 'bg-slate-800/20 border-slate-700/20 opacity-40 hover:opacity-70'
        : needsAttention
          ? 'bg-slate-800/40 border-orange-500/40 hover:bg-slate-800/60 hover:border-orange-400/60'
          : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/60 hover:border-slate-600/60';

  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 w-40 rounded-xl border p-3 text-left
        transition-all duration-200 cursor-pointer
        ${nodeStyle}
      `}
    >
      {/* Boat name + date */}
      <div className="text-white text-sm font-medium truncate">{projection.boat_name}</div>
      <div className="text-slate-500 text-xs mt-0.5">{formatDateShort(projection.departure_date, i18n.language)}</div>

      {/* Pallets + urgency badges */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-slate-400 text-xs">{palletsText}</span>
        {!isCompleted && needsAttention ? (
          <div className="flex gap-1">
            {actionable > 0 ? (
              <>
                <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">
                  {actionable} {t('planning.toShip')}
                </span>
                {totalNeed > actionable && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-slate-500/10 text-slate-500">
                    +{totalNeed - actionable}
                  </span>
                )}
              </>
            ) : (
              <>
                {critical > 0 && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">
                    {critical} crit
                  </span>
                )}
                {urgent > 0 && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-orange-500/15 text-orange-400 font-medium">
                    {urgent} urg
                  </span>
                )}
              </>
            )}
          </div>
        ) : !hasDraft && !isCompleted ? (
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
        ) : null}
      </div>

      {/* Status / deadline row */}
      <div className="flex items-center justify-between mt-2 gap-1">
        {isDeparted ? (
          <span className="text-[10px] text-slate-500">
            {hasDraft ? '🚢 ' + t('departed.shipped', 'Enviado') : '— ' + t('departed.noOrder', 'Sin pedido')}
          </span>
        ) : projection.draft_status ? (
          <span className="text-[10px] text-slate-400">
            {STATUS_ICON[projection.draft_status] || ''} {projection.draft_status === 'drafting' ? t('planning.draftStatus.drafting') : projection.draft_status === 'ordered' ? t('planning.draftStatus.ordered') : projection.draft_status === 'confirmed' ? t('planning.draftStatus.confirmed') : t('planning.draftStatus.action_needed')}
          </span>
        ) : deadlineText ? (
          <span className={`text-[10px] font-medium ${deadlineColor}`}>
            {deadlineText}
          </span>
        ) : (
          <span className="text-[10px] text-slate-600">{t('planning.noReview')}</span>
        )}
      </div>
    </button>
  );
}
