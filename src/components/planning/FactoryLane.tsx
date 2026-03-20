import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlanningHorizonResponse } from '../../requests/planning';
import type { Factory } from '../../requests/factories';
import { BoatNode } from './BoatNode';

export interface ProductionStatus {
  blindSpotCount: number;
  inProductionCount: number;
  mostUrgentSku: string | null;
  mostUrgentActBy: string | null;
  lastSubmissionDaysAgo: number | null;
  sinStockCount: number;
  criticoCount: number;
}

interface FactoryLaneProps {
  factory: Factory;
  horizon: PlanningHorizonResponse | null;
  loading: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onBoatClick: (boatId: string) => void;
  onDirectAccess?: () => void;
  productionStatus: ProductionStatus | null;
  onProductionClick: () => void;
}

export function FactoryLane({
  factory,
  horizon,
  loading,
  isSelected,
  onSelect,
  onBoatClick,
  onDirectAccess,
  productionStatus,
  onProductionClick,
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
  const boatCount = (horizon?.projections.length ?? 0) + (horizon?.completed?.length ?? 0);

  const urgencyIndicator = totalCritical > 0
    ? 'border-red-500/40'
    : totalUrgent > 0
    ? 'border-orange-500/30'
    : 'border-slate-700/40';

  // Production needs attention?
  const needsProductionAttention = productionStatus != null && productionStatus.blindSpotCount > 0;

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
          {/* Production status badge in header */}
          {productionStatus != null && !needsProductionAttention && (
            <span className="text-emerald-500/70 text-xs flex items-center gap-1">
              {'\u2713'} {t('planning.productionStatus.ok', 'Producción')}
            </span>
          )}
          {needsProductionAttention && (
            <span className={`text-xs font-medium flex items-center gap-1 ${
              productionStatus.sinStockCount > 0 ? 'text-red-400' : 'text-amber-400'
            }`}>
              {'\u{1F4CB}'} {productionStatus.blindSpotCount} {t('planning.productionStatus.pending', 'pendientes')}
            </span>
          )}
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

      {/* Production attention row — contextual expansion (Option B) */}
      {needsProductionAttention && (
        <button
          onClick={(e) => { e.stopPropagation(); onProductionClick(); }}
          className="w-full px-5 py-3 border-t border-dashed border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className={`font-medium ${
                  productionStatus.sinStockCount > 0 ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {productionStatus.blindSpotCount} {t('planning.productionStatus.blindSpots', 'sin producción')}
                </span>
                {productionStatus.inProductionCount > 0 && (
                  <>
                    <span className="text-slate-600">{'\u00B7'}</span>
                    <span className="text-emerald-400/80">
                      {productionStatus.inProductionCount} {t('planning.productionStatus.inProduction', 'en producción')}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {productionStatus.mostUrgentSku && (
                  <span className="truncate">
                    {productionStatus.mostUrgentSku}
                    {productionStatus.mostUrgentActBy && (
                      <> — {t('planning.productionStatus.actBy', 'pedir antes del')} {new Date(productionStatus.mostUrgentActBy).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</>
                    )}
                  </span>
                )}
                {productionStatus.lastSubmissionDaysAgo != null && (
                  <>
                    <span className="text-slate-700">{'\u00B7'}</span>
                    <span>
                      {t('planning.productionStatus.lastSubmission', 'Última solicitud')}: {t('planning.productionStatus.daysAgo', 'hace {{count}}d', { count: productionStatus.lastSubmissionDaysAgo })}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span className="text-indigo-400 text-xs font-medium flex-shrink-0 ml-3">
              {t('planning.productionStatus.viewCenter', 'Ver centro de producción')} {'\u2192'}
            </span>
          </div>
        </button>
      )}

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
          <div className="px-5 pb-4 pt-1 space-y-3">
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {/* Boat nodes only — no production card in scroll */}
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
      {!loading && horizon && boatCount === 0 && (
        <div className="px-5 pb-4 pt-1 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-slate-600 text-xs">
              {t('planning.noBoats', 'Sin barcos en el horizonte')}
            </span>
            {onDirectAccess && (
              <button
                onClick={onDirectAccess}
                className="px-3 py-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors"
              >
                {t('planning.openOrderBuilder', 'Abrir Order Builder')} {'\u2192'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
