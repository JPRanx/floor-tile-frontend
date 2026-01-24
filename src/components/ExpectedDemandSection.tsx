import { useTranslation } from 'react-i18next';
import type { DemandForecastResponse } from '../requests/orderBuilder';

interface ExpectedDemandSectionProps {
  forecast: DemandForecastResponse | null;
  loading: boolean;
}

export function ExpectedDemandSection({ forecast, loading }: ExpectedDemandSectionProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            📈
          </span>
          {t('demandForecast.title')}
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse flex space-x-4">
            <div className="h-4 bg-slate-700 rounded w-32"></div>
            <div className="h-4 bg-slate-700 rounded w-24"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!forecast) {
    return null;
  }

  const velocityM2 = forecast.velocity_based_demand_m2;
  const patternM2 = forecast.pattern_based_demand_m2;
  const recommendedM2 = forecast.recommended_demand_m2;
  const difference = patternM2 - velocityM2;
  const differencePercent = velocityM2 > 0 ? (difference / velocityM2) * 100 : 0;

  // Determine which is higher
  const patternIsHigher = patternM2 > velocityM2;
  const significantDifference = Math.abs(differencePercent) > 10;

  const formatM2 = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K m²`;
    }
    return `${value.toLocaleString()} m²`;
  };

  return (
    <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5 shadow-xl">
      {/* Header */}
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
          📈
        </span>
        {t('demandForecast.title')}
      </h3>

      {/* Demand Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Velocity-based */}
        <div className={`p-3 rounded-xl ${!patternIsHigher ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-slate-700/30'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-slate-400 text-xs uppercase tracking-wide">
              {t('demandForecast.velocityBased')}
            </span>
            {!patternIsHigher && (
              <span className="text-emerald-400 text-xs">✓</span>
            )}
          </div>
          <p className={`text-xl font-bold ${!patternIsHigher ? 'text-emerald-400' : 'text-slate-300'}`}>
            {formatM2(velocityM2)}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {t('demandForecast.velocityDescription')}
          </p>
        </div>

        {/* Pattern-based */}
        <div className={`p-3 rounded-xl ${patternIsHigher ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-700/30'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-slate-400 text-xs uppercase tracking-wide">
              {t('demandForecast.patternBased')}
            </span>
            {patternIsHigher && (
              <span className="text-amber-400 text-xs">✓</span>
            )}
          </div>
          <p className={`text-xl font-bold ${patternIsHigher ? 'text-amber-400' : 'text-slate-300'}`}>
            {formatM2(patternM2)}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {t('demandForecast.patternDescription')}
          </p>
        </div>
      </div>

      {/* Recommendation */}
      {significantDifference && (
        <div className={`p-3 rounded-xl ${patternIsHigher ? 'bg-amber-500/5' : 'bg-slate-700/20'}`}>
          <div className="flex items-start gap-2">
            <span className="text-lg">{patternIsHigher ? '⚠️' : '✅'}</span>
            <div>
              <p className={`text-sm font-medium ${patternIsHigher ? 'text-amber-300' : 'text-slate-300'}`}>
                {patternIsHigher
                  ? t('demandForecast.patternHigherWarning', {
                      percent: Math.round(differencePercent),
                      customers: forecast.customers_due_soon.length,
                    })
                  : t('demandForecast.velocityHigherInfo')
                }
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {t('demandForecast.recommendation', {
                  recommended: formatM2(recommendedM2),
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Customer count summary */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400">
            {t('demandForecast.customersDueSoon')}
          </span>
          <span className="font-semibold text-white">
            {forecast.customers_due_soon.length}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm mt-2">
          <span className="text-slate-400">
            {t('demandForecast.leadTime')}
          </span>
          <span className="font-semibold text-white">
            {forecast.lead_time_days} {t('common.days')}
          </span>
        </div>
      </div>
    </div>
  );
}
