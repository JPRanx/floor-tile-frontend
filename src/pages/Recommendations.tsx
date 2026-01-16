import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { recommendationsApi } from '../requests/recommendations';
import type { OrderRecommendations, ActionType, ConfidenceLevel } from '../requests/recommendations';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ActionBadge } from '../components/StatusBadge';

export function Recommendations() {
  const { t } = useTranslation();
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
      setError(t('recommendations.loadError'));
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

  const { warehouse_status, recommendations, warnings } = data;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('recommendations.title')}</h1>
        <p className="text-gray-600">
          {t('recommendations.subtitle', { days: data.lead_time_days })}
        </p>
      </div>

      {/* Action Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <ActionCard action="ORDER_NOW" count={data.order_now_count} label={t('recommendations.orderNow')} />
        <ActionCard action="ORDER_SOON" count={data.order_soon_count} label={t('recommendations.orderSoon')} />
        <ActionCard action="WELL_STOCKED" count={data.well_stocked_count} label={t('recommendations.wellStocked')} />
        <ActionCard action="SKIP_ORDER" count={data.skip_order_count} label={t('recommendations.skipOrder')} />
        <ActionCard action="REVIEW" count={data.review_count} label={t('recommendations.review')} />
      </div>

      {/* Warehouse Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('recommendations.warehouseStatus')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">{t('recommendations.capacity')}</div>
            <div className="text-xl font-semibold">{warehouse_status.total_capacity_pallets} {t('common.pallets')}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">{t('recommendations.currentStock')}</div>
            <div className="text-xl font-semibold">{Math.round(warehouse_status.total_current_pallets)} {t('common.pallets')}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">{t('recommendations.utilization')}</div>
            <div className="text-xl font-semibold">{Math.round(warehouse_status.utilization_percent)}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">{t('recommendations.toOrder')}</div>
            <div className="text-xl font-semibold text-blue-600">
              {Math.round(data.total_recommended_pallets)} {t('common.pallets')}
            </div>
          </div>
        </div>
        {warehouse_status.total_in_transit_pallets > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            {t('recommendations.inTransitNote', { pallets: Math.round(warehouse_status.total_in_transit_pallets), m2: Math.round(warehouse_status.total_in_transit_m2).toLocaleString() })}
          </div>
        )}
        {warehouse_status.allocation_scaled && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            {t('recommendations.allocationScaled', { percent: Math.round((warehouse_status.scale_factor || 1) * 100) })}
          </div>
        )}
      </div>

      {/* Recommendations Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('recommendations.tableTitle', { count: recommendations.length })}
          </h2>
        </div>

        {recommendations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {t('recommendations.noProductsNeed')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('recommendations.columns.sku')}
                    </th>
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('recommendations.columns.action')}
                    </th>
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('recommendations.columns.gap')}
                    </th>
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('recommendations.columns.days')}
                    </th>
                    <th className="hidden sm:table-cell px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('recommendations.columns.confidence')}
                    </th>
                    <th className="hidden md:table-cell px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('recommendations.columns.details')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recommendations.map((rec) => (
                    <tr key={rec.product_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{rec.sku}</div>
                        <div className="text-xs text-gray-500">{rec.rotation || '—'}</div>
                        {/* Show in-transit if > 0 */}
                        {rec.in_transit_pallets > 0 && (
                          <div className="text-xs text-blue-600 mt-0.5">
                            📦 {Math.round(rec.in_transit_pallets)}p in transit
                          </div>
                        )}
                        {/* Show confidence on mobile under SKU */}
                        <div className="sm:hidden mt-1">
                          <ConfidenceBadge level={rec.confidence} />
                        </div>
                      </td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                        <ActionBadge action={rec.action_type} />
                      </td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {Math.round(rec.gap_pallets)}p
                        </div>
                        <div className="text-xs text-gray-500">
                          {Math.round(rec.gap_m2).toLocaleString()}m²
                        </div>
                      </td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-right">
                        <span className={`text-sm font-medium ${
                          rec.days_until_empty != null && rec.days_until_empty < 45
                            ? 'text-red-600'
                            : 'text-gray-900'
                        }`}>
                          {rec.days_until_empty != null
                            ? `${Math.round(rec.days_until_empty)}d`
                            : '—'}
                        </span>
                        {!rec.arrives_before_stockout && rec.days_until_empty != null && (
                          <div className="text-xs text-red-500">{t('recommendations.late')}</div>
                        )}
                      </td>
                      <td className="hidden sm:table-cell px-3 py-2 sm:px-4 sm:py-3">
                        <ConfidenceBadge level={rec.confidence} />
                        <CustomerInfo
                          uniqueCustomers={rec.unique_customers}
                          recurringCustomers={rec.recurring_customers}
                          topCustomerName={rec.top_customer_name}
                          topCustomerShare={rec.top_customer_share}
                        />
                      </td>
                      <td className="hidden md:table-cell px-3 py-2 sm:px-4 sm:py-3">
                        <div className="text-sm text-gray-900">{rec.action}</div>
                        <div className="text-xs text-gray-500">{rec.reason}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Skip This Cycle Section */}
      {warnings.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">
              {t('recommendations.skipCycle', { count: warnings.length })}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('recommendations.skipCycleDesc')}
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {warnings.map((warning, index) => (
              <div key={`warning-${warning.product_id}-${index}`} className="px-4 py-3 flex items-start gap-3">
                <span className="flex-shrink-0 mt-0.5">
                  <SkipIcon type={warning.type} />
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{warning.sku}</div>
                  <div className="text-sm text-gray-600">
                    {warning.message}
                    {warning.in_transit_m2 != null && warning.in_transit_m2 > 0 && (
                      <span className="text-blue-600 ml-1">
                        (📦 {Math.round(warning.in_transit_m2).toLocaleString()} m² in transit)
                      </span>
                    )}
                  </div>
                  <SkipBadge type={warning.type} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Action Card Component
interface ActionCardProps {
  action: ActionType;
  count: number;
  label: string;
}

const actionCardStyles: Record<ActionType, string> = {
  ORDER_NOW: 'bg-red-50 border-red-200 text-red-800',
  ORDER_SOON: 'bg-orange-50 border-orange-200 text-orange-800',
  WELL_STOCKED: 'bg-green-50 border-green-200 text-green-800',
  SKIP_ORDER: 'bg-blue-50 border-blue-200 text-blue-800',
  REVIEW: 'bg-gray-50 border-gray-200 text-gray-800',
};

function ActionCard({ action, count, label }: ActionCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${actionCardStyles[action]}`}>
      <div className="text-3xl font-bold">{count}</div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  );
}

// Skip Icon - color based on type
function SkipIcon({ type }: { type: string }) {
  const isGoodStock = type === 'WELL_STOCKED' || type === 'OVER_STOCKED';
  const colorClass = isGoodStock ? 'text-green-500' : 'text-gray-400';

  if (isGoodStock) {
    // Checkmark icon for well-stocked/over-stocked
    return (
      <svg className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  // Question mark icon for uncertain items
  return (
    <svg className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Skip Badge - styled label based on type
const skipBadgeStyles: Record<string, string> = {
  WELL_STOCKED: 'bg-green-100 text-green-800',
  OVER_STOCKED: 'bg-green-100 text-green-800',
  NO_SALES_DATA: 'bg-gray-100 text-gray-600',
  LOW_VELOCITY: 'bg-gray-100 text-gray-600',
};

const skipBadgeLabels: Record<string, string> = {
  WELL_STOCKED: 'Well Stocked',
  OVER_STOCKED: 'Over Stocked',
  NO_SALES_DATA: 'No History',
  LOW_VELOCITY: 'Low Demand',
};

function SkipBadge({ type }: { type: string }) {
  const style = skipBadgeStyles[type] || 'bg-gray-100 text-gray-600';
  const label = skipBadgeLabels[type] || type.replace(/_/g, ' ');

  return (
    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${style}`}>
      {label}
    </span>
  );
}

// Confidence Badge - color based on level
const confidenceStyles: Record<ConfidenceLevel, string> = {
  HIGH: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-gray-100 text-gray-600',
};

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${confidenceStyles[level]}`}>
      {level}
    </span>
  );
}

// Customer Info - shows customer breakdown under confidence badge
interface CustomerInfoProps {
  uniqueCustomers: number;
  recurringCustomers: number;
  topCustomerName: string | null;
  topCustomerShare: number | null;
}

function CustomerInfo({ uniqueCustomers, recurringCustomers, topCustomerName, topCustomerShare }: CustomerInfoProps) {
  if (uniqueCustomers === 0) {
    return <div className="text-xs text-gray-400 mt-1">No customer data</div>;
  }

  const topPct = topCustomerShare != null ? Math.round(topCustomerShare * 100) : null;

  return (
    <div className="text-xs text-gray-500 mt-1">
      <div>{uniqueCustomers} customers, {recurringCustomers} recurring</div>
      {topCustomerName && topPct != null && topPct > 20 && (
        <div className="text-gray-400">
          Top: {topCustomerName} ({topPct}%)
        </div>
      )}
    </div>
  );
}
