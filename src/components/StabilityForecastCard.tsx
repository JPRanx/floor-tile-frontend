import { useTranslation } from 'react-i18next';
import type { StabilityForecast } from '../requests/orderBuilder';

interface StabilityForecastCardProps {
  forecast: StabilityForecast;
  boatName?: string;
  orderDeadline?: string;
  onViewDetails: () => void;
}

export function StabilityForecastCard({ forecast, boatName, orderDeadline, onViewDetails }: StabilityForecastCardProps) {
  const { t } = useTranslation();

  const formatDeadline = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (forecast.status) {
      case 'stable':
        return {
          icon: '✓',
          iconBg: 'bg-emerald-500/20',
          iconColor: 'text-emerald-400',
          barColor: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
          glow: 'shadow-emerald-500/30',
        };
      case 'recovering':
        return {
          icon: '↗',
          iconBg: 'bg-amber-500/20',
          iconColor: 'text-amber-400',
          barColor: 'bg-gradient-to-r from-amber-600 to-amber-400',
          glow: 'shadow-amber-500/30',
        };
      case 'unstable':
        return {
          icon: '!',
          iconBg: 'bg-orange-500/20',
          iconColor: 'text-orange-400',
          barColor: 'bg-gradient-to-r from-orange-600 to-orange-400',
          glow: 'shadow-orange-500/30',
        };
      case 'blocked':
        return {
          icon: '✕',
          iconBg: 'bg-red-500/20',
          iconColor: 'text-red-400',
          barColor: 'bg-gradient-to-r from-red-600 to-red-400',
          glow: 'shadow-red-500/30',
        };
      default:
        return {
          icon: '?',
          iconBg: 'bg-slate-500/20',
          iconColor: 'text-slate-400',
          barColor: 'bg-gradient-to-r from-slate-600 to-slate-400',
          glow: 'shadow-slate-500/30',
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className={`w-8 h-8 rounded-lg ${statusDisplay.iconBg} flex items-center justify-center ${statusDisplay.iconColor} font-bold`}>
            {statusDisplay.icon}
          </span>
          {t('stabilityForecast.title', 'Cycle Stability')}
        </h3>
        <button
          onClick={onViewDetails}
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {t('common.viewDetails', 'View Details')}
        </button>
      </div>

      {/* Status Message */}
      <p className="text-sm text-slate-300 mb-2">
        {forecast.status_message}
      </p>

      {/* Simulation context: what boat and deadline these recommendations are for */}
      {orderDeadline && (
        <p className="text-xs text-slate-500 mb-4">
          {t('stabilityForecast.simulatedFor', 'Simulado para')}{' '}
          <span className="text-slate-400 font-medium">{boatName}</span>
          {' · '}
          {t('stabilityForecast.deadline', 'Fecha límite')}{' '}
          <span className="text-slate-400 font-medium">{formatDeadline(orderDeadline)}</span>
        </p>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>{t('stabilityForecast.recovery', 'Recovery Progress')}</span>
          <span className="text-white font-medium">{forecast.recovery_progress_pct}%</span>
        </div>
        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full ${statusDisplay.barColor} transition-all duration-500 ease-out rounded-full shadow-lg ${statusDisplay.glow}`}
            style={{ width: `${forecast.recovery_progress_pct}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Stable */}
        <div className="bg-slate-700/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {forecast.stable_count}
          </div>
          <div className="text-xs text-slate-400">
            {t('stabilityForecast.stable', 'Stable')}
          </div>
        </div>

        {/* Recovering */}
        <div className="bg-slate-700/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">
            {forecast.recovering_products.length}
          </div>
          <div className="text-xs text-slate-400">
            {t('stabilityForecast.recovering', 'Recovering')}
          </div>
        </div>

        {/* Blocked */}
        <div className="bg-slate-700/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">
            {forecast.blocker_count}
          </div>
          <div className="text-xs text-slate-400">
            {t('stabilityForecast.blocked', 'Blocked')}
          </div>
        </div>
      </div>

      {/* Stable Date (if recovering) */}
      {forecast.status === 'recovering' && forecast.stable_date && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              {t('stabilityForecast.stableBy', 'Stable by')}
            </span>
            <span className="text-sm font-medium text-emerald-400">
              {formatDate(forecast.stable_date)}
            </span>
          </div>
          {forecast.stable_date_note && (
            <p className="text-xs text-slate-500 mt-1">
              {forecast.stable_date_note}
            </p>
          )}
        </div>
      )}

      {/* Blocked Warning */}
      {forecast.blocker_count > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-start gap-2 text-red-400">
            <span className="text-lg">!</span>
            <div>
              <p className="text-sm font-medium">
                {t('stabilityForecast.actionRequired', 'Action Required')}
              </p>
              <p className="text-xs text-slate-400">
                {forecast.blocker_count} {t('stabilityForecast.productsNeedSupply', 'product(s) need supply scheduled')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
