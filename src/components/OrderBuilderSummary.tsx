import type { OrderBuilderSummary as SummaryType } from '../requests/orderBuilder';

interface OrderBuilderSummaryProps {
  summary: SummaryType;
}

export function OrderBuilderSummary({ summary }: OrderBuilderSummaryProps) {
  const maxPallets = summary.boat_max_containers * 14; // 14 pallets per container

  // Calculate percentages for progress bars
  const palletPercent = Math.min(100, (summary.total_pallets / maxPallets) * 100);
  const containerPercent = Math.min(100, (summary.total_containers / summary.boat_max_containers) * 100);
  const warehousePercent = Math.min(100, summary.warehouse_utilization_after);

  // Determine colors based on thresholds
  const getPalletColor = () => {
    if (summary.total_pallets > maxPallets) return 'bg-red-500';
    if (palletPercent > 80) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getContainerColor = () => {
    if (summary.total_containers > summary.boat_max_containers) return 'bg-red-500';
    if (containerPercent > 80) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getWarehouseColor = () => {
    if (summary.warehouse_after_delivery > summary.warehouse_capacity) return 'bg-red-500';
    if (warehousePercent > 95) return 'bg-orange-500';
    if (warehousePercent > 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span>📊</span> ORDER SUMMARY
      </h3>

      <div className="space-y-4">
        {/* Pallets Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Pallets</span>
            <span className="font-medium">
              {summary.total_pallets} / {maxPallets}
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getPalletColor()} transition-all duration-300`}
              style={{ width: `${palletPercent}%` }}
            />
          </div>
        </div>

        {/* Containers Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Containers</span>
            <span className="font-medium">
              {summary.total_containers} / {summary.boat_max_containers}
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getContainerColor()} transition-all duration-300`}
              style={{ width: `${containerPercent}%` }}
            />
          </div>
        </div>

        {/* Warehouse Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Warehouse (after delivery)</span>
            <span className="font-medium">
              {summary.warehouse_after_delivery} / {summary.warehouse_capacity}
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getWarehouseColor()} transition-all duration-300`}
              style={{ width: `${warehousePercent}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Current: {summary.warehouse_current_pallets} pallets | After: {Math.round(summary.warehouse_utilization_after)}%
          </div>
        </div>

        {/* Total m² */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Order</span>
            <span className="font-semibold text-gray-900">
              {Math.round(summary.total_m2).toLocaleString()} m²
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
