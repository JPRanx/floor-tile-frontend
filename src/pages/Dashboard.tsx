import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dashboardApi } from '../requests/dashboard';
import type { StockoutSummary } from '../requests/dashboard';
import { inventoryApi } from '../requests/inventory';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { InventoryUploadModal } from '../components/InventoryUploadModal';

export function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<StockoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [lastInventoryUpdate, setLastInventoryUpdate] = useState<string | null>(null);

  useEffect(() => {
    loadData();
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
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadData}
          className="mt-2 text-red-600 hover:text-red-800 underline"
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

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-600">{t('dashboard.subtitle')}</p>
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
          color="yellow"
        />
        <StatusCard
          label={t('dashboard.wellCovered')}
          count={data.well_covered_count}
          color="green"
        />
        <StatusCard
          label={t('dashboard.yourCall')}
          count={data.your_call_count}
          color="gray"
        />
      </div>

      {/* No Boat Schedule Warning */}
      {!data.next_boat_departure && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 text-lg">⚠️</span>
            <span className="text-amber-800 font-medium">{t('dashboard.noBoatWarning')}</span>
          </div>
          <Link
            to="/boats"
            className="text-amber-700 hover:text-amber-900 font-medium underline text-sm"
          >
            {t('dashboard.uploadTiba')}
          </Link>
        </div>
      )}

      {/* Boat Departure Info */}
      {data.next_boat_departure && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">{t('dashboard.boatDepartures')}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-600">{t('dashboard.nextBoat')}</span>{' '}
              <span className="font-medium text-blue-800">
                {new Date(data.next_boat_departure).toLocaleDateString()} ({t('dashboard.daysLabel', { days: data.days_to_next_boat_departure })})
              </span>
            </div>
            {data.second_boat_departure && (
              <div>
                <span className="text-blue-600">{t('dashboard.secondBoat')}</span>{' '}
                <span className="font-medium text-blue-800">
                  {new Date(data.second_boat_departure).toLocaleDateString()} ({t('dashboard.daysLabel', { days: data.days_to_second_boat_departure })})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warehouse Utilization */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('dashboard.warehouseStatus')}
          </h2>
          <button
            onClick={() => setInventoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            📦 {t('inventory.uploadTitle')}
          </button>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{t('dashboard.warehouseStock')}</span>
              <span className="font-medium">
                {totalWarehouseM2.toLocaleString()} m²
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full"
                style={{
                  width: `${Math.min((totalWarehouseM2 / 99900) * 100, 100)}%`,
                }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {t('dashboard.ofCapacity')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round((totalWarehouseM2 / 99900) * 100)}%
            </div>
            <div className="text-xs text-gray-500">{t('dashboard.utilization')}</div>
          </div>
        </div>
        {totalInTransitM2 > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            {t('dashboard.inTransit', { amount: totalInTransitM2.toLocaleString() })}
          </div>
        )}
        {/* Last Updated Timestamp */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {t('inventory.lastUpdated')}: {' '}
            {lastInventoryUpdate ? (
              <span className="font-medium text-gray-700">{lastInventoryUpdate}</span>
            ) : (
              <span className="text-orange-500">{t('inventory.neverUpdated')}</span>
            )}
          </span>
          {lastInventoryUpdate && (() => {
            const updateDate = new Date(lastInventoryUpdate);
            const now = new Date();
            const hoursDiff = (now.getTime() - updateDate.getTime()) / (1000 * 60 * 60);
            return hoursDiff > 24 ? (
              <span className="inline-flex items-center gap-1 text-orange-500" title={t('inventory.dataStale')}>
                ⚠️ {t('inventory.dataStale')}
              </span>
            ) : null;
          })()}
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('dashboard.productsByStatus')}
          </h2>
        </div>
        <div className="overflow-auto max-h-[500px]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-20 bg-gray-50">
                  {t('dashboard.columns.sku')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('dashboard.columns.status')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('dashboard.columns.daysLeft')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('dashboard.columns.velocity')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('dashboard.columns.stock')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('dashboard.columns.inTransit')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.product_id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white group-hover:bg-gray-50">
                    <div className="text-sm font-medium text-gray-900">
                      {product.sku}
                    </div>
                    <div className="text-xs text-gray-500">
                      {product.rotation}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={product.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span
                      className={`text-sm font-medium ${
                        product.days_to_stockout != null && !isNaN(Number(product.days_to_stockout)) &&
                        data.days_to_next_boat != null && Number(product.days_to_stockout) < data.days_to_next_boat
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {product.days_to_stockout != null && !isNaN(Number(product.days_to_stockout))
                        ? t('dashboard.daysText', { count: Math.round(Number(product.days_to_stockout)) })
                        : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">
                    {Number(product.avg_daily_sales) > 0
                      ? t('dashboard.velocityText', { count: Math.round(Number(product.avg_daily_sales)) })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                    {Number(product.warehouse_qty).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                    {Number(product.in_transit_qty) > 0 ? (
                      <span className="text-blue-600 font-medium">
                        📦 {Number(product.in_transit_qty).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
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

// Status Card Component
interface StatusCardProps {
  label: string;
  count: number;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'purple' | 'blue' | 'gray';
}

const colorClasses = {
  red: 'bg-red-50 border-red-200 text-red-800',
  orange: 'bg-orange-50 border-orange-200 text-orange-800',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  green: 'bg-green-50 border-green-200 text-green-800',
  purple: 'bg-purple-50 border-purple-200 text-purple-800',
  blue: 'bg-blue-50 border-blue-200 text-blue-800',
  gray: 'bg-gray-50 border-gray-200 text-gray-600',
};

function StatusCard({ label, count, color }: StatusCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="text-3xl font-bold">{count}</div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  );
}
