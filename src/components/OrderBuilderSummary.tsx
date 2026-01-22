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

  // Determine colors based on thresholds
  const getPalletColor = () => {
    if (summary.total_pallets > maxPallets) return 'bg-red-500';
    if (palletPercent > 80) return 'bg-emerald-500';
    return 'bg-indigo-500';
  };

  const getContainerColor = () => {
    if (summary.total_containers > summary.boat_max_containers) return 'bg-red-500';
    if (containerPercent > 80) return 'bg-emerald-500';
    return 'bg-indigo-500';
  };

  const getWarehouseColor = () => {
    if (summary.warehouse_after_delivery > summary.warehouse_capacity) return 'bg-red-500';
    if (warehousePercent > 95) return 'bg-orange-500';
    if (warehousePercent > 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>📊</span> {t('orderBuilderSummary.title')}
      </h3>

      <div className="space-y-4">
        {/* Pallets Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">{t('orderBuilderSummary.pallets')}</span>
            <span className="font-medium text-slate-200">
              {summary.total_pallets} / {maxPallets}
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getPalletColor()} transition-all duration-300`}
              style={{ width: `${palletPercent}%` }}
            />
          </div>
        </div>

        {/* Containers Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">{t('orderBuilderSummary.containers')}</span>
            <span className="font-medium text-slate-200">
              {summary.total_containers} / {summary.boat_max_containers}
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getContainerColor()} transition-all duration-300`}
              style={{ width: `${containerPercent}%` }}
            />
          </div>
        </div>

        {/* Warehouse Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">{t('orderBuilderSummary.warehouseAfter')}</span>
            <span className="font-medium text-slate-200">
              {summary.warehouse_after_delivery} / {summary.warehouse_capacity}
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getWarehouseColor()} transition-all duration-300`}
              style={{ width: `${warehousePercent}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {t('orderBuilderSummary.current')}: {summary.warehouse_current_pallets} {t('common.pallets')} | {t('orderBuilderSummary.after')}: {Math.round(summary.warehouse_utilization_after)}%
          </div>
        </div>

        {/* Total m² */}
        <div className="pt-2 border-t border-slate-700">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">{t('orderBuilderSummary.totalOrder')}</span>
            <span className="font-semibold text-white">
              {Math.round(summary.total_m2).toLocaleString()} m²
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
