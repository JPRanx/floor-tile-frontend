import { useTranslation } from 'react-i18next';
import type { BoatProjection, DraftStatus } from '../../requests/planning';
import { ConfidenceDots } from './ConfidenceDots';

interface BoatCardProps {
  projection: BoatProjection;
  onDrillIn: (boatId: string) => void;
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${day} ${months[date.getMonth()]}`;
}

const DRAFT_BADGE_CONFIG: Record<DraftStatus, { label: string; classes: string }> = {
  drafting: {
    label: 'planning.draftStatus.drafting',
    classes: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  },
  action_needed: {
    label: 'planning.draftStatus.action_needed',
    classes: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  },
  ordered: {
    label: 'planning.draftStatus.ordered',
    classes: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  confirmed: {
    label: 'planning.draftStatus.confirmed',
    classes: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
};

export function BoatCard({ projection, onDrillIn }: BoatCardProps) {
  const { t } = useTranslation();
  const isActive = projection.is_active;
  const urgency = projection.urgency_breakdown;

  const borderStyle = isActive
    ? 'border-slate-700/50'
    : 'border-dashed border-slate-700/40';

  const palletsText = isActive
    ? `${projection.projected_pallets_min}`
    : `~${projection.projected_pallets_min}-${projection.projected_pallets_max}`;

  return (
    <div
      className={`
        bg-slate-800/30 backdrop-blur-xl rounded-2xl border ${borderStyle}
        shadow-xl transition-all duration-200 hover:bg-slate-800/50 hover:border-slate-600/60
        flex flex-col
      `}
    >
      {/* Header: vessel name + dates */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">
            {isActive ? '\u{1F6A2}' : '\u{1F310}'}
          </span>
          <h3 className="text-white font-semibold truncate">
            {projection.boat_name}
          </h3>
        </div>
        <div className="text-right text-sm flex-shrink-0 ml-3">
          <div className="text-slate-400">
            {t('planning.departs', 'Sale')}: <span className="text-slate-300">{formatDateShort(projection.departure_date)}</span>
          </div>
          <div className="text-slate-500">
            {t('planning.arrives', 'Llega')}: <span className="text-slate-400">{formatDateShort(projection.arrival_date)}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-slate-700/30" />

      {/* Body: pallets + confidence */}
      <div className="px-5 py-3 space-y-3 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">{'\u{1F4E6}'}</span>
            <span className="text-slate-300 text-sm font-medium">
              {palletsText} {t('common.pallets', 'paletas')}
            </span>
          </div>
          {!isActive && <ConfidenceDots level={projection.confidence} />}
        </div>

        {/* Urgency breakdown */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="text-slate-500 font-medium">
            {t('planning.urgency', 'Urgencia')}:
          </span>
          {urgency.critical > 0 && (
            <span className="text-red-400">
              {'\u{1F534}'} {urgency.critical} {t('planning.critical', 'critico')}
            </span>
          )}
          {urgency.urgent > 0 && (
            <span className="text-orange-400">
              {'\u{1F7E0}'} {urgency.urgent} {t('planning.urgent', 'urgente')}
            </span>
          )}
          {urgency.soon > 0 && (
            <span className="text-amber-400">
              {'\u{1F7E1}'} {urgency.soon} {t('planning.soon', 'pronto')}
            </span>
          )}
          {urgency.ok > 0 && (
            <span className="text-emerald-400">
              {'\u{1F7E2}'} {urgency.ok} {t('planning.ok', 'ok')}
            </span>
          )}
        </div>
      </div>

      {/* Footer: draft status + drill-in */}
      <div className="px-5 pb-5 pt-1 flex items-center justify-between">
        <div>
          {projection.draft_status && (
            <span
              className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                ${DRAFT_BADGE_CONFIG[projection.draft_status].classes}
              `}
            >
              {projection.draft_status === 'drafting' && '\u{270F}\u{FE0F}'}
              {projection.draft_status === 'action_needed' && '\u{26A0}\u{FE0F}'}
              {projection.draft_status === 'ordered' && '\u{1F4E8}'}
              {projection.draft_status === 'confirmed' && '\u{2705}'}
              {t(DRAFT_BADGE_CONFIG[projection.draft_status].label)}
            </span>
          )}
        </div>
        <button
          onClick={() => onDrillIn(projection.boat_id)}
          className="
            px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
            bg-indigo-600/20 text-indigo-300 border border-indigo-500/30
            hover:bg-indigo-600/30 hover:text-indigo-200 hover:border-indigo-500/50
          "
        >
          {isActive
            ? t('planning.goToDetail', 'Detalle \u2192')
            : t('planning.preview', 'Vista previa')}
        </button>
      </div>
    </div>
  );
}
