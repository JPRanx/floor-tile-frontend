import { useEffect, useState } from 'react';
import { dashboardApi } from '../requests/dashboard';
import type { StockoutSummary } from '../requests/dashboard';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function Dashboard() {
  const [data, setData] = useState<StockoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const stockoutData = await dashboardApi.getStockoutList();
      setData(stockoutData);
    } catch (err) {
      setError('Failed to load dashboard data. Is the backend running?');
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
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { products } = data;

  // Calculate warehouse totals from products
  const totalWarehouseM2 = products.reduce((sum, p) => sum + p.warehouse_qty, 0);
  const totalInTransitM2 = products.reduce((sum, p) => sum + p.in_transit_qty, 0);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Stockout status overview</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusCard
          label="Critical"
          count={data.critical_count}
          color="red"
        />
        <StatusCard
          label="Warning"
          count={data.warning_count}
          color="yellow"
        />
        <StatusCard
          label="OK"
          count={data.ok_count}
          color="green"
        />
        <StatusCard
          label="No Sales"
          count={data.no_sales_count}
          color="gray"
        />
      </div>

      {/* Warehouse Utilization */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Warehouse Status
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Total Inventory</span>
              <span className="font-medium">
                {totalWarehouseM2.toLocaleString()} m²
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full"
                style={{
                  width: `${Math.min((totalWarehouseM2 / 100000) * 100, 100)}%`,
                }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              of 100,000 m² capacity
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round((totalWarehouseM2 / 100000) * 100)}%
            </div>
            <div className="text-xs text-gray-500">utilization</div>
          </div>
        </div>
        {totalInTransitM2 > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            + {totalInTransitM2.toLocaleString()} m² in transit
          </div>
        )}
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Products by Stockout Status
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Left
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Velocity
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock (m²)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.product_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
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
                        product.days_until_empty != null && !isNaN(product.days_until_empty) && product.days_until_empty < 45
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {product.days_until_empty != null && !isNaN(product.days_until_empty)
                        ? `${Math.round(product.days_until_empty)} days`
                        : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">
                    {product.daily_velocity > 0
                      ? `${Math.round(product.daily_velocity)} m²/day`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                    {product.warehouse_qty.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Status Card Component
interface StatusCardProps {
  label: string;
  count: number;
  color: 'red' | 'yellow' | 'green' | 'gray';
}

const colorClasses = {
  red: 'bg-red-50 border-red-200 text-red-800',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  green: 'bg-green-50 border-green-200 text-green-800',
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
