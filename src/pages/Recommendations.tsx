import { useEffect, useState } from 'react';
import { recommendationsApi } from '../requests/recommendations';
import type { OrderRecommendations, RecommendationPriority } from '../requests/recommendations';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function Recommendations() {
  const [data, setData] = useState<OrderRecommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await recommendationsApi.getOrders();
      setData(result);
    } catch (err) {
      setError('Failed to load recommendations. Is the backend running?');
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

  const { warehouse_status, recommendations, warnings } = data;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Order Recommendations</h1>
        <p className="text-gray-600">
          What to order based on warehouse allocation (Lead time: {data.lead_time_days} days)
        </p>
      </div>

      {/* Priority Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PriorityCard priority="CRITICAL" count={data.critical_count} />
        <PriorityCard priority="HIGH" count={data.high_count} />
        <PriorityCard priority="MEDIUM" count={data.medium_count} />
        <PriorityCard priority="LOW" count={data.low_count} />
      </div>

      {/* Warehouse Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Warehouse Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Capacity</div>
            <div className="text-xl font-semibold">{warehouse_status.total_capacity_pallets} pallets</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Current Stock</div>
            <div className="text-xl font-semibold">{Math.round(warehouse_status.total_current_pallets)} pallets</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Utilization</div>
            <div className="text-xl font-semibold">{Math.round(warehouse_status.utilization_percent)}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">To Order</div>
            <div className="text-xl font-semibold text-blue-600">
              {Math.round(data.total_recommended_pallets)} pallets
            </div>
          </div>
        </div>
        {warehouse_status.total_in_transit_pallets > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            + {Math.round(warehouse_status.total_in_transit_pallets)} pallets ({Math.round(warehouse_status.total_in_transit_m2).toLocaleString()} m²) in transit
          </div>
        )}
        {warehouse_status.allocation_scaled && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            Allocations scaled to {Math.round((warehouse_status.scale_factor || 1) * 100)}% due to capacity constraints
          </div>
        )}
      </div>

      {/* Recommendations Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Order Recommendations ({recommendations.length} products)
          </h2>
        </div>

        {recommendations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No products need ordering at this time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gap
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Left
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recommendations.map((rec) => (
                  <tr key={rec.product_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{rec.sku}</div>
                      <div className="text-xs text-gray-500">{rec.rotation || '—'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PriorityBadge priority={rec.priority} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {Math.round(rec.gap_pallets)} pallets
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round(rec.gap_m2).toLocaleString()} m²
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className={`text-sm font-medium ${
                        rec.days_until_empty != null && rec.days_until_empty < 45
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }`}>
                        {rec.days_until_empty != null
                          ? `${Math.round(rec.days_until_empty)} days`
                          : '—'}
                      </span>
                      {!rec.arrives_before_stockout && rec.days_until_empty != null && (
                        <div className="text-xs text-red-500">Late arrival</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{rec.action}</div>
                      <div className="text-xs text-gray-500">{rec.reason}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-yellow-50">
            <h2 className="text-lg font-semibold text-yellow-800">
              Warnings ({warnings.length} products)
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {warnings.map((warning) => (
              <div key={warning.product_id} className="px-4 py-3 flex items-start gap-3">
                <span className="flex-shrink-0 mt-0.5">
                  <WarningIcon />
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{warning.sku}</div>
                  <div className="text-sm text-gray-600">{warning.message}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {warning.type.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Priority Card Component
interface PriorityCardProps {
  priority: RecommendationPriority;
  count: number;
}

const priorityCardStyles = {
  CRITICAL: 'bg-red-50 border-red-200 text-red-800',
  HIGH: 'bg-orange-50 border-orange-200 text-orange-800',
  MEDIUM: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  LOW: 'bg-blue-50 border-blue-200 text-blue-800',
};

function PriorityCard({ priority, count }: PriorityCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${priorityCardStyles[priority]}`}>
      <div className="text-3xl font-bold">{count}</div>
      <div className="text-sm font-medium">{priority}</div>
    </div>
  );
}

// Priority Badge Component
interface PriorityBadgeProps {
  priority: RecommendationPriority;
}

const priorityBadgeStyles = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-blue-100 text-blue-800 border-blue-200',
};

function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${priorityBadgeStyles[priority]}`}
    >
      {priority}
    </span>
  );
}

// Warning Icon
function WarningIcon() {
  return (
    <svg
      className="h-5 w-5 text-yellow-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}
