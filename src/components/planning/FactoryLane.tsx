import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlanningHorizonResponse } from '../../requests/planning';
import type { Factory } from '../../requests/factories';
import { BoatNode } from './BoatNode';
import { FactoryRequestCard } from './FactoryRequestCard';

interface FactoryLaneProps {
  factory: Factory;
  horizon: PlanningHorizonResponse | null;
  loading: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onBoatClick: (boatId: string) => void;
  onDirectAccess?: () => void;
}

export function FactoryLane({
  factory,
  horizon,
  loading,
  isSelected,
  onSelect,
  onBoatClick,
  onDirectAccess,
}: FactoryLaneProps) {
  const { t } = useTranslation();
  const [showAllEstimated, setShowAllEstimated] = useState(false);

  // Locked factory
  if (!factory.active) {
    return (
      <div className="bg-slate-800/15 rounded-xl border border-slate-700/20 px-5 py-4 opacity-50">
        <div className="flex items-center gap-3">
          <span className="text-sm">{'\u{1F512}'}</span>
          <span className="text-slate-400 font-medium">{factory.name}</span>
          <span className="text-slate-600 text-xs ml-2">
            {t('planning.comingSoon', 'proximamente')}
          </span>
        </div>
      </div>
    );
  }

  // Compute urgency summary for the lane header
  const totalCritical = horizon?.projections.reduce((s, p) => s + p.urgency_breakdown.critical, 0) ?? 0;
  const totalUrgent = horizon?.projections.reduce((s, p) => s + p.urgency_breakdown.urgent, 0) ?? 0;
  const boatCount = horizon?.projections.length ?? 0;

  const urgencyIndicator = totalCritical > 0
    ? 'border-red-500/40'
    : totalUrgent > 0
    ? 'border-orange-500/30'
    : 'border-slate-700/40';

  return (
    <div
      className={`
        rounded-xl border transition-all duration-200
        ${isSelected ? `bg-slate-800/50 ${urgencyIndicator} ring-1 ring-indigo-500/30` : `bg-slate-800/25 ${urgencyIndicator}`}
      `}
    >
      {/* Lane header */}
      <button
        onClick={onSelect}
        className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg">{'\u{1F3ED}'}</span>
          <span className="text-white font-semibold">{factory.name}</span>
          {loading && (
            <span className="text-slate-500 text-xs animate-pulse">{t('planning.loading')}</span>
          )}
          {!loading && (
            <span className="text-slate-500 text-xs">
              {boatCount === 1 ? t('planning.boatCountOne') : t('planning.boatCount', { count: boatCount })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {totalCritical > 0 && (
            <span className="text-red-400 text-xs font-medium">{totalCritical} {t('planning.critShort')}</span>
          )}
          {totalUrgent > 0 && (
            <span className="text-orange-400 text-xs font-medium">{totalUrgent} {t('planning.urgShort')}</span>
          )}
          <span className={`text-xs transition-transform duration-200 text-slate-500 ${isSelected ? 'rotate-180' : ''}`}>
            {'\u25BC'}
          </span>
        </div>
      </button>

      {/* Boat nodes (always visible, scrollable) */}
      {!loading && horizon && horizon.projections.length > 0 && (() => {
        const real = horizon.projections.filter((p) => !p.is_estimated);
        const estimated = horizon.projections.filter((p) => p.is_estimated);
        const visibleEstimated = showAllEstimated ? estimated : estimated.slice(0, 3);
        const hiddenCount = estimated.length - visibleEstimated.length;
        const visible = [...real, ...visibleEstimated].sort(
          (a, b) => a.departure_date.localeCompare(b.departure_date)
        );

        return (
          <div className="px-5 pb-4 pt-1">
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {horizon?.factory_order_signal &&
               horizon.factory_order_signal.signal_type !== 'no_production' && (
                <FactoryRequestCard signal={horizon.factory_order_signal} />
              )}
              {visible.map((projection) => (
                <BoatNode
                  key={projection.boat_id}
                  projection={projection}
                  onClick={() => onBoatClick(projection.boat_id)}
                />
              ))}
              {hiddenCount > 0 && (
                <button
                  onClick={() => setShowAllEstimated(true)}
                  className="flex-shrink-0 w-[140px] h-[72px] rounded-lg border border-dashed border-slate-700/50 flex items-center justify-center text-xs text-slate-500 hover:text-slate-400 hover:border-slate-600/50 transition-colors"
                >
                  {t('planning.estimatedMore', { count: hiddenCount })}
                </button>
              )}
              {showAllEstimated && estimated.length > 3 && (
                <button
                  onClick={() => setShowAllEstimated(false)}
                  className="flex-shrink-0 w-[140px] h-[72px] rounded-lg border border-dashed border-slate-700/50 flex items-center justify-center text-xs text-slate-500 hover:text-slate-400 hover:border-slate-600/50 transition-colors"
                >
                  {t('planning.showLess')}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Empty state — no boats */}
      {!loading && horizon && horizon.projections.length === 0 && (
        <div className="px-5 pb-4 pt-1 flex items-center gap-3">
          <span className="text-slate-600 text-xs">
            {t('planning.noBoats', 'Sin barcos en el horizonte')}
          </span>
          {onDirectAccess && (
            <button
              onClick={onDirectAccess}
              className="px-3 py-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors"
            >
              {t('planning.openOrderBuilder', 'Abrir Order Builder')} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
