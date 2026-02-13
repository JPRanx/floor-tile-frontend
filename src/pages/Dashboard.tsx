import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dashboardApi } from '../requests/dashboard';
import type { StockoutSummary } from '../requests/dashboard';
import { inventoryApi } from '../requests/inventory';
import { productsApi } from '../requests/products';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { InventoryUploadModal } from '../components/InventoryUploadModal';
import { TopMoversWidget, AlertsWidget, OverdueCustomersWidget } from '../components/dashboard';
import { StockCoverage } from '../components/shared';
import { formatDateUTC } from '../utils/dateUtils';
import { WAREHOUSE_MAX_M2 } from '../constants/inventory';

export function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<StockoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [lastInventoryUpdate, setLastInventoryUpdate] = useState<string | null>(null);
  const [liquidationIds, setLiquidationIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  // Fetch liquidation IDs
  useEffect(() => {
    const fetchLiquidationIds = async () => {
      try {
        const products = await productsApi.getLiquidationProducts();
        setLiquidationIds(new Set(products.map(p => p.id)));
      } catch {
        // Non-critical
      }
    };
    fetchLiquidationIds();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const stockoutData = await dashboardApi.getStockoutList();
      setData(stockoutData);
      // Also fetch last inventory update timestamp
      try {
        const inventoryData = await inventoryApi.getLatest();
        setLastInventoryUpdate(inventoryData.as_of);
      } catch {
        // Non-critical - just don't show timestamp
      }
    } catch (err) {
      setError(t('dashboard.loadError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
        <p className="text-rose-400">{error}</p>
        <button
          onClick={loadData}
          className="mt-2 text-rose-400 hover:text-rose-300 underline"
        >
          {t('common.tryAgain')}
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { products } = data;

  // Calculate warehouse totals from products (convert from string/Decimal to number)
  const totalWarehouseM2 = products.reduce((sum, p) => sum + Number(p.warehouse_qty), 0);
  const totalInTransitM2 = products.reduce((sum, p) => sum + Number(p.in_transit_qty), 0);
  const utilizationPct = Math.round((totalWarehouseM2 / WAREHOUSE_MAX_M2) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t('dashboard.title')}</h1>
        <p className="text-slate-400">{t('dashboard.subtitle')}</p>
      </div>

      {/* Status Cards - Boat-based Priority */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatusCard
          label={t('dashboard.highPriority')}
          count={data.high_priority_count}
          color="orange"
        />
        <StatusCard
          label={t('dashboard.consider')}
          count={data.consider_count}
          color="amber"
        />
        <StatusCard
          label={t('dashboard.wellCovered')}
          count={data.well_covered_count}
          color="emerald"
        />
        <StatusCard
          label={t('dashboard.yourCall')}
          count={data.your_call_count}
          color="slate"
        />
      </div>

      {/* No Boat Schedule Warning */}
      {!data.next_boat_departure && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-lg">⚠️</span>
            <span className="text-amber-300 font-medium">{t('dashboard.noBoatWarning')}</span>
          </div>
          <Link
            to="/boats"
            className="text-amber-400 hover:text-amber-300 font-medium underline text-sm"
          >
            {t('dashboard.uploadTiba')}
          </Link>
        </div>
      )}

      {/* Boat Departure Info */}
      {data.next_boat_departure && (
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-sky-400 mb-2">{t('dashboard.boatDepartures')}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">{t('dashboard.nextBoat')}</span>{' '}
              <span className="font-medium text-white">
                {formatDateUTC(data.next_boat_departure)} ({t('dashboard.daysLabel', { days: data.days_to_next_boat_departure })})
              </span>
            </div>
            {data.second_boat_departure && (
              <div>
                <span className="text-slate-400">{t('dashboard.secondBoat')}</span>{' '}
                <span className="font-medium text-white">
                  {formatDateUTC(data.second_boat_departure)} ({t('dashboard.daysLabel', { days: data.days_to_second_boat_departure })})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warehouse Utilization */}
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <span className="text-lg">📦</span>
            {t('dashboard.warehouseStatus')}
          </h2>
          <button
            onClick={() => setInventoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
          >
            {t('inventory.uploadTitle')}
          </button>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">{t('dashboard.warehouseStock')}</span>
              <span className="font-medium text-white">
                {totalWarehouseM2.toLocaleString()} m²
              </span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                style={{
                  width: `${Math.min(utilizationPct, 100)}%`,
                }}
              />
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {t('dashboard.ofCapacity')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">
              {utilizationPct}%
            </div>
            <div className="text-xs text-slate-500">{t('dashboard.utilization')}</div>
          </div>
        </div>
        {totalInTransitM2 > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-sky-400">🚢</span>
            <span className="text-slate-400">
              {t('dashboard.inTransit', { amount: totalInTransitM2.toLocaleString() })}
            </span>
          </div>
        )}
        {/* Last Updated Timestamp */}
        <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {t('inventory.lastUpdated')}: {' '}
            {lastInventoryUpdate ? (
              <span className="font-medium text-slate-300">{lastInventoryUpdate}</span>
            ) : (
              <span className="text-amber-500">{t('inventory.neverUpdated')}</span>
            )}
          </span>
          {lastInventoryUpdate && (() => {
            const updateDate = new Date(lastInventoryUpdate);
            const now = new Date();
            const hoursDiff = (now.getTime() - updateDate.getTime()) / (1000 * 60 * 60);
            return hoursDiff > 24 ? (
              <span className="inline-flex items-center gap-1 text-amber-500" title={t('inventory.dataStale')}>
                ⚠️ {t('inventory.dataStale')}
              </span>
            ) : null;
          })()}
        </div>
      </div>

      {/* Intelligence Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopMoversWidget periodDays={365} />
        <AlertsWidget periodDays={365} />
        <OverdueCustomersWidget limit={5} />
      </div>

      {/* Product Table */}
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden shadow-[0_0_30px_rgba(99,102,241,0.1)]">
        <div className="px-5 py-4 border-b border-slate-700/50">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <span className="text-lg">📊</span>
            {t('dashboard.productsByStatus')}
          </h2>
        </div>
        <div className="overflow-auto max-h-[500px]">
          <table className="min-w-full">
            <thead className="bg-slate-800/50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider sticky left-0 z-20 bg-slate-800/50">
                  {t('dashboard.columns.sku')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {t('dashboard.columns.status')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {t('dashboard.columns.daysLeft')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {t('dashboard.columns.velocity')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {t('dashboard.columns.stock')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {t('dashboard.columns.inTransit')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {t('dashboard.columns.siesa', 'SIESA')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {products.map((product) => (
                <tr
                  key={product.product_id}
                  className={`hover:bg-slate-800/30 group transition-colors ${!product.active ? 'opacity-60' : ''}`}
                >
                  <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-slate-900/95 group-hover:bg-slate-800/30 transition-colors">
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      {product.sku}
                      {!product.active && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-600/50 text-slate-400 border border-slate-500/30">
                          {t('dashboard.inactive', 'INACTIVE')}
                        </span>
                      )}
                      {liquidationIds.has(product.product_id) && (
                        <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          LIQUIDATION
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {product.rotation}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadgeDark status={product.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <StockCoverage
                      variant="compact"
                      warehouseDays={product.days_to_stockout != null && !isNaN(Number(product.days_to_stockout))
                        ? Number(product.days_to_stockout)
                        : null}
                      withTransitDays={
                        product.days_to_stockout != null && Number(product.avg_daily_sales) > 0
                          ? Number(product.days_to_stockout) + (Number(product.in_transit_qty) / Number(product.avg_daily_sales))
                          : null
                      }
                      inTransitDays={
                        Number(product.in_transit_qty) > 0 && Number(product.avg_daily_sales) > 0
                          ? Number(product.in_transit_qty) / Number(product.avg_daily_sales)
                          : null
                      }
                      hasGap={
                        product.days_to_stockout != null &&
                        data.days_to_next_boat != null &&
                        Number(product.days_to_stockout) < data.days_to_next_boat
                      }
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-slate-400">
                    {Number(product.avg_daily_sales) > 0
                      ? t('dashboard.velocityText', { count: Math.round(Number(product.avg_daily_sales)) })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-white">
                    {Number(product.warehouse_qty).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                    {Number(product.in_transit_qty) > 0 ? (
                      <span className="text-sky-400 font-medium">
                        🚢 {Number(product.in_transit_qty).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                    {Number(product.factory_available_m2) > 0 ? (
                      <span className="text-purple-400 font-medium" title={t('dashboard.factoryLots', { count: product.factory_lot_count || 0 })}>
                        🏭 {Number(product.factory_available_m2).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory Upload Modal */}
      <InventoryUploadModal
        isOpen={inventoryModalOpen}
        onClose={() => setInventoryModalOpen(false)}
        onSuccess={() => {
          loadData(); // Refresh dashboard data after inventory upload
        }}
      />
    </div>
  );
}

// Status Card Component - Dark Theme
interface StatusCardProps {
  label: string;
  count: number;
  color: 'orange' | 'amber' | 'emerald' | 'slate' | 'rose' | 'sky';
}

const cardColorClasses = {
  orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  slate: 'bg-slate-700/30 border-slate-600/30 text-slate-300',
  rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  sky: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
};

function StatusCard({ label, count, color }: StatusCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${cardColorClasses[color]} transition-all hover:scale-[1.02]`}>
      <div className="text-3xl font-bold">{count}</div>
      <div className="text-sm font-medium opacity-80">{label}</div>
    </div>
  );
}

// Status Badge Component - Dark Theme
interface StatusBadgeDarkProps {
  status: string;
}

function StatusBadgeDark({ status }: StatusBadgeDarkProps) {
  const statusStyles: Record<string, string> = {
    HIGH_PRIORITY: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    CONSIDER: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    WELL_COVERED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    YOUR_CALL: 'bg-slate-600/30 text-slate-400 border-slate-500/30',
    OUT_OF_STOCK: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };

  const statusLabels: Record<string, string> = {
    HIGH_PRIORITY: 'High Priority',
    CONSIDER: 'Consider',
    WELL_COVERED: 'Well Covered',
    YOUR_CALL: 'Your Call',
    OUT_OF_STOCK: 'Out of Stock',
  };

  const style = statusStyles[status] || statusStyles.YOUR_CALL;
  const label = statusLabels[status] || status;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${style}`}>
      {label}
    </span>
  );
}
