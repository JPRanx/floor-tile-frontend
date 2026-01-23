import { useTranslation } from 'react-i18next';
import type { OrderBuilderSummary as SummaryType } from '../requests/orderBuilder';

interface OrderBuilderSummaryProps {
  summary: SummaryType;
}

export function OrderBuilderSummary({ summary }: OrderBuilderSummaryProps) {
  const { t } = useTranslation();
  const maxPallets = summary.boat_max_containers * 14; // 14 pallets per container

  // Calculate percentages for progress bars
  const palletPercent = Math.min(100, (summary.total_pallets / maxPallets) * 100);
  const containerPercent = Math.min(100, (summary.total_containers / summary.boat_max_containers) * 100);
  const warehousePercent = Math.min(100, summary.warehouse_utilization_after);

  // Determine colors and glow based on thresholds
  const getPalletStyles = () => {
    if (summary.total_pallets > maxPallets) return { bar: 'bg-gradient-to-r from-red-600 to-red-400', glow: 'shadow-red-500/30' };
    if (palletPercent > 80) return { bar: 'bg-gradient-to-r from-emerald-600 to-emerald-400', glow: 'shadow-emerald-500/30' };
    return { bar: 'bg-gradient-to-r from-indigo-600 to-indigo-400', glow: 'shadow-indigo-500/30' };
  };

  const getContainerStyles = () => {
    if (summary.total_containers > summary.boat_max_containers) return { bar: 'bg-gradient-to-r from-red-600 to-red-400', glow: 'shadow-red-500/30' };
    if (containerPercent > 80) return { bar: 'bg-gradient-to-r from-emerald-600 to-emerald-400', glow: 'shadow-emerald-500/30' };
    return { bar: 'bg-gradient-to-r from-indigo-600 to-indigo-400', glow: 'shadow-indigo-500/30' };
  };

  const getWarehouseStyles = () => {
    if (summary.warehouse_after_delivery > summary.warehouse_capacity) return { bar: 'bg-gradient-to-r from-red-600 to-red-400', glow: 'shadow-red-500/30' };
    if (warehousePercent > 95) return { bar: 'bg-gradient-to-r from-orange-600 to-orange-400', glow: 'shadow-orange-500/30' };
    if (warehousePercent > 80) return { bar: 'bg-gradient-to-r from-amber-600 to-amber-400', glow: 'shadow-amber-500/30' };
    return { bar: 'bg-gradient-to-r from-emerald-600 to-emerald-400', glow: 'shadow-emerald-500/30' };
  };

  const palletStyles = getPalletStyles();
  const containerStyles = getContainerStyles();
  const warehouseStyles = getWarehouseStyles();

  return (
    <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5 shadow-xl">
      {/* Header */}
      <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
          📊
        </span>
        {t('orderBuilderSummary.title')}
      </h3>

      <div className="space-y-5">
        {/* Pallets Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400 font-medium">{t('orderBuilderSummary.pallets')}</span>
            <span className="font-semibold text-white">
              {summary.total_pallets} <span className="text-slate-500">/</span> {maxPallets}
            </span>
          </div>
          <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full ${palletStyles.bar} transition-all duration-500 ease-out rounded-full shadow-lg ${palletStyles.glow}`}
              style={{ width: `${palletPercent}%` }}
            />
          </div>
        </div>

        {/* Containers Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400 font-medium">{t('orderBuilderSummary.containers')}</span>
            <span className="font-semibold text-white">
              {summary.total_containers} <span className="text-slate-500">/</span> {summary.boat_max_containers}
            </span>
          </div>
          <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full ${containerStyles.bar} transition-all duration-500 ease-out rounded-full shadow-lg ${containerStyles.glow}`}
              style={{ width: `${containerPercent}%` }}
            />
          </div>
        </div>

        {/* Warehouse Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400 font-medium">{t('orderBuilderSummary.warehouseAfter')}</span>
            <span className="font-semibold text-white">
              {summary.warehouse_after_delivery} <span className="text-slate-500">/</span> {summary.warehouse_capacity}
            </span>
          </div>
          <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full ${warehouseStyles.bar} transition-all duration-500 ease-out rounded-full shadow-lg ${warehouseStyles.glow}`}
              style={{ width: `${warehousePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>
              {t('orderBuilderSummary.current')}: {summary.warehouse_current_pallets} {t('common.pallets')}
            </span>
            <span>
              {t('orderBuilderSummary.after')}: {Math.round(summary.warehouse_utilization_after)}%
            </span>
          </div>
        </div>

        {/* Total m² with prominent styling */}
        <div className="pt-4 border-t border-slate-700/50">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">{t('orderBuilderSummary.totalOrder')}</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              {Math.round(summary.total_m2).toLocaleString()} m²
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
