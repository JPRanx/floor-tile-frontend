import { useTranslation } from 'react-i18next';
import type { StabilityForecast, ProductRecovery, StabilityBlocker, StabilityTimeline } from '../requests/orderBuilder';

interface StabilityForecastModalProps {
  forecast: StabilityForecast;
  isOpen: boolean;
  onClose: () => void;
}

export function StabilityForecastModal({ forecast, isOpen, onClose }: StabilityForecastModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get status badge styles
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'stable':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'recovering':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'unstable':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'blocked':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  // Get recovery status badge
  const getRecoveryStatusBadge = (status: string) => {
    switch (status) {
      case 'shipping':
        return 'bg-indigo-500/20 text-indigo-400';
      case 'in_production':
        return 'bg-amber-500/20 text-amber-400';
      case 'in_transit':
        return 'bg-sky-500/20 text-sky-400';
      case 'blocked':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  // Get recovery status label
  const getRecoveryStatusLabel = (status: string) => {
    switch (status) {
      case 'shipping':
        return t('stabilityForecast.statusShipping', 'SHIPPING');
      case 'in_production':
        return t('stabilityForecast.statusInProduction', 'IN PRODUCTION');
      case 'in_transit':
        return t('stabilityForecast.statusInTransit', 'IN TRANSIT');
      default:
        return status.toUpperCase();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">
              {t('stabilityForecast.detailTitle', 'Cycle Stability Forecast')}
            </h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(forecast.status)}`}>
              {forecast.status.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            x
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-3xl font-bold text-white">{forecast.total_products}</div>
              <div className="text-sm text-slate-400">{t('stabilityForecast.totalProducts', 'Total Products')}</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-3xl font-bold text-emerald-400">{forecast.stable_count}</div>
              <div className="text-sm text-slate-400">{t('stabilityForecast.stable', 'Stable')}</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-3xl font-bold text-amber-400">{forecast.recovering_products.length}</div>
              <div className="text-sm text-slate-400">{t('stabilityForecast.recovering', 'Recovering')}</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-3xl font-bold text-red-400">{forecast.blocker_count}</div>
              <div className="text-sm text-slate-400">{t('stabilityForecast.blocked', 'Blocked')}</div>
            </div>
          </div>

          {/* Timeline Section */}
          {forecast.timeline.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm">T</span>
                {t('stabilityForecast.timeline', 'Recovery Timeline')}
              </h3>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-700" />

                {forecast.timeline.map((event: StabilityTimeline, index: number) => (
                  <div key={index} className="relative pl-10 pb-6 last:pb-0">
                    {/* Timeline dot */}
                    <div className="absolute left-2.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-slate-900" />

                    <div className="bg-slate-800/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{event.event}</span>
                        <span className="text-sm text-slate-400">{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-emerald-400">
                          +{event.resolved_count} {t('stabilityForecast.resolved', 'resolved')}
                        </span>
                        <span className="text-slate-400">
                          {event.remaining_unstable} {t('stabilityForecast.remaining', 'remaining')}
                        </span>
                      </div>
                      {event.resolved_skus.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {event.resolved_skus.map((sku: string) => (
                            <span
                              key={sku}
                              className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded"
                            >
                              {sku}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recovering Products Section */}
          {forecast.recovering_products.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm">R</span>
                {t('stabilityForecast.recoveringProducts', 'Recovering Products')}
                <span className="text-sm font-normal text-slate-400">({forecast.recovering_products.length})</span>
              </h3>
              <div className="space-y-3">
                {forecast.recovering_products.map((product: ProductRecovery, index: number) => (
                  <div
                    key={index}
                    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-white font-medium">{product.sku}</span>
                        {product.product_name && (
                          <span className="text-slate-400 text-sm ml-2">{product.product_name}</span>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRecoveryStatusBadge(product.status)}`}>
                        {getRecoveryStatusLabel(product.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">{t('stabilityForecast.coverage', 'Coverage')}</span>
                        <div className={`font-medium ${product.current_coverage_days < 14 ? 'text-red-400' : 'text-amber-400'}`}>
                          {product.current_coverage_days} {t('common.days', 'days')}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">{t('stabilityForecast.supply', 'Supply')}</span>
                        <div className="text-white font-medium">
                          {Math.round(product.supply_amount_m2).toLocaleString()} m2
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">{t('stabilityForecast.shipsOn', 'Ships on')}</span>
                        <div className="text-indigo-400 font-medium">
                          {product.ship_boat_name || '-'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">{t('stabilityForecast.arrives', 'Arrives')}</span>
                        <div className="text-emerald-400 font-medium">
                          {formatDate(product.arrival_date)}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{product.status_note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blockers Section */}
          {forecast.blockers.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-red-500/20 flex items-center justify-center text-red-400 text-sm">!</span>
                {t('stabilityForecast.blockedProducts', 'Blocked Products')}
                <span className="text-sm font-normal text-slate-400">({forecast.blockers.length})</span>
              </h3>
              <div className="space-y-3">
                {forecast.blockers.map((blocker: StabilityBlocker, index: number) => (
                  <div
                    key={index}
                    className="bg-red-500/5 border border-red-500/20 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-white font-medium">{blocker.sku}</span>
                        {blocker.product_name && (
                          <span className="text-slate-400 text-sm ml-2">{blocker.product_name}</span>
                        )}
                      </div>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
                        {t('stabilityForecast.blocked', 'BLOCKED')}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-slate-400">{t('stabilityForecast.coverage', 'Coverage')}</span>
                        <div className="text-red-400 font-medium">
                          {blocker.current_coverage_days} {t('common.days', 'days')}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">{t('stabilityForecast.stockout', 'Stockout')}</span>
                        <div className="text-red-400 font-medium">
                          {formatDate(blocker.stockout_date)}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">{t('stabilityForecast.velocity', 'Velocity')}</span>
                        <div className="text-white font-medium">
                          {Math.round(blocker.velocity_m2_per_day)} m2/day
                        </div>
                      </div>
                    </div>
                    <div className="bg-red-500/10 rounded-lg p-3">
                      <p className="text-sm text-red-300 mb-1">{blocker.reason}</p>
                      <p className="text-sm font-medium text-white">
                        {t('stabilityForecast.action', 'Action')}: {blocker.suggested_action}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Stable Message */}
          {forecast.status === 'stable' && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">✓</div>
              <h3 className="text-xl font-semibold text-emerald-400 mb-2">
                {t('stabilityForecast.allStable', 'All Products Stable')}
              </h3>
              <p className="text-slate-400">
                {t('stabilityForecast.allStableDesc', 'All products have adequate coverage (30+ days). No action required.')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}
