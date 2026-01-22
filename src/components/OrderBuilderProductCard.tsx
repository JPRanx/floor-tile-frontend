import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  OrderBuilderProduct,
  ConfidenceLevel,
  Urgency,
  TrendDirection,
  TrendStrength,
} from '../requests/orderBuilder';

interface OrderBuilderProductCardProps {
  product: OrderBuilderProduct;
  onToggleSelect: (productId: string) => void;
  onQuantityChange: (productId: string, pallets: number) => void;
}

export function OrderBuilderProductCard({
  product,
  onToggleSelect,
  onQuantityChange,
}: OrderBuilderProductCardProps) {
  const { t } = useTranslation();
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Generate pallet options (0-50 in increments of 1)
  const palletOptions = Array.from({ length: 51 }, (_, i) => i);

  const confidenceStyles: Record<ConfidenceLevel, string> = {
    HIGH: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    MEDIUM: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    LOW: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const confidenceIcons: Record<ConfidenceLevel, string> = {
    HIGH: '✓',
    MEDIUM: '⚠️',
    LOW: '?',
  };

  const urgencyStyles: Record<Urgency, { bg: string; text: string; label: string }> = {
    critical: { bg: 'bg-red-500/20', text: 'text-red-300', label: 'CRITICAL' },
    urgent: { bg: 'bg-orange-500/20', text: 'text-orange-300', label: 'URGENT' },
    soon: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'SOON' },
    ok: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'OK' },
  };

  const trendIcons: Record<TrendDirection, string> = {
    up: '↑',
    down: '↓',
    stable: '→',
  };

  const trendColors: Record<TrendDirection, string> = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    stable: 'text-slate-400',
  };

  const strengthLabels: Record<TrendStrength, string> = {
    strong: '+++',
    moderate: '++',
    weak: '+',
  };

  const urgency = urgencyStyles[product.urgency] || urgencyStyles.ok;
  const breakdown = product.calculation_breakdown;

  return (
    <div
      className={`rounded-lg border p-3 sm:p-4 transition-colors ${
        product.is_selected
          ? 'bg-indigo-900/30 border-indigo-500/50'
          : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={product.is_selected}
          onChange={() => onToggleSelect(product.product_id)}
          className="mt-1 h-5 w-5 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
        />

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {/* SKU and Quantity */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white truncate">
                {product.sku}
              </span>

              {/* Urgency Badge */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${urgency.bg} ${urgency.text}`}>
                {urgency.label}
              </span>

              {/* Trend Indicator */}
              {product.trend_direction && product.trend_direction !== 'stable' && (
                <span className={`inline-flex items-center gap-1 text-sm font-medium ${trendColors[product.trend_direction]}`}>
                  <span>{trendIcons[product.trend_direction]}</span>
                  <span>{Math.abs(Number(product.velocity_change_pct)).toFixed(0)}%</span>
                  <span className="text-xs opacity-75">{strengthLabels[product.trend_strength]}</span>
                </span>
              )}

              {/* Quantity Selector */}
              <select
                value={product.selected_pallets}
                onChange={(e) =>
                  onQuantityChange(product.product_id, parseInt(e.target.value))
                }
                disabled={!product.is_selected}
                className={`px-2 py-1 border rounded text-sm font-medium ${
                  product.is_selected
                    ? 'border-indigo-500/50 bg-slate-700 text-white'
                    : 'border-slate-600 bg-slate-800 text-slate-500'
                }`}
              >
                {palletOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="text-sm text-slate-400">{t('orderBuilderProduct.pallets')}</span>
            </div>

            {/* Confidence Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${
                confidenceStyles[product.confidence]
              }`}
            >
              <span>{confidenceIcons[product.confidence]}</span>
              {product.confidence}
            </span>
          </div>

          {/* Stock & Days of Stock Row */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
            <span>
              {t('orderBuilderProduct.stock')}: <strong className="text-slate-200">{Math.round(product.current_stock_m2).toLocaleString()} m²</strong>
              {product.in_transit_m2 > 0 && (
                <span className="text-indigo-400 ml-1">
                  | 📦 {Math.round(product.in_transit_m2).toLocaleString()} m² {t('orderBuilderProduct.inTransit')}
                </span>
              )}
            </span>
            {product.days_of_stock !== null && (
              <span>
                {t('orderBuilderProduct.daysOfStock')}: <strong className={`${product.days_of_stock < 14 ? 'text-red-400' : product.days_of_stock < 30 ? 'text-amber-400' : 'text-slate-200'}`}>
                  {product.days_of_stock}d
                </strong>
              </span>
            )}
          </div>

          {/* Velocity Row */}
          {product.daily_velocity_m2 > 0 && (
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
              <span>
                {t('orderBuilderProduct.velocity')}: <strong className="text-slate-200">{Number(product.daily_velocity_m2).toFixed(1)} m²/day</strong>
              </span>
            </div>
          )}

          {/* Gap & Customers Row */}
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
            <span>
              {t('orderBuilderProduct.gap')}: <strong className="text-slate-200">{Math.round(product.coverage_gap_m2).toLocaleString()} m²</strong>
              {' '}({product.coverage_gap_pallets}p)
            </span>
            {product.unique_customers > 0 && (
              <span>
                {product.unique_customers} {t('orderBuilderProduct.customers')}
              </span>
            )}
            {product.top_customer_share != null && Number(product.top_customer_share) > 0.3 && (
              <span className="text-amber-400">
                {t('orderBuilderProduct.fromTopCustomer', {
                  percent: Math.round(Number(product.top_customer_share) * 100),
                  name: product.top_customer_name || 'top customer'
                })}
              </span>
            )}
          </div>

          {/* Calculation Breakdown Toggle */}
          {breakdown && (
            <div className="mt-2">
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>{showBreakdown ? '▼' : '▶'}</span>
                {t('orderBuilderProduct.showCalculation')}
              </button>

              {showBreakdown && (
                <div className="mt-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 text-xs">
                  <div className="space-y-1 text-slate-400">
                    <div className="flex justify-between">
                      <span>{t('orderBuilderProduct.leadTime')}:</span>
                      <span className="text-slate-300">{breakdown.lead_time_days}d</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('orderBuilderProduct.safetyStock')}:</span>
                      <span className="text-slate-300">{breakdown.safety_stock_days}d</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('orderBuilderProduct.dailyVelocity')}:</span>
                      <span className="text-slate-300">{Number(breakdown.daily_velocity_m2).toFixed(1)} m²/d</span>
                    </div>
                    <div className="border-t border-slate-700 my-2" />
                    <div className="flex justify-between">
                      <span>{t('orderBuilderProduct.baseQuantity')}:</span>
                      <span className="text-slate-300">{Math.round(Number(breakdown.base_quantity_m2)).toLocaleString()} m²</span>
                    </div>
                    {Number(breakdown.trend_adjustment_m2) !== 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>{t('orderBuilderProduct.trendAdjustment')} (+{Number(breakdown.trend_adjustment_pct).toFixed(0)}%):</span>
                        <span>+{Math.round(Number(breakdown.trend_adjustment_m2)).toLocaleString()} m²</span>
                      </div>
                    )}
                    <div className="flex justify-between text-red-400">
                      <span>{t('orderBuilderProduct.minusStock')}:</span>
                      <span>-{Math.round(Number(breakdown.minus_current_stock_m2)).toLocaleString()} m²</span>
                    </div>
                    {Number(breakdown.minus_incoming_m2) > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>{t('orderBuilderProduct.minusIncoming')}:</span>
                        <span>-{Math.round(Number(breakdown.minus_incoming_m2)).toLocaleString()} m²</span>
                      </div>
                    )}
                    <div className="border-t border-slate-700 my-2" />
                    <div className="flex justify-between font-semibold text-white">
                      <span>{t('orderBuilderProduct.suggestion')}:</span>
                      <span>{Math.round(Number(breakdown.final_suggestion_m2)).toLocaleString()} m² ({breakdown.final_suggestion_pallets}p)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confidence Reason (if LOW) */}
          {product.confidence === 'LOW' && product.confidence_reason && (
            <div className="mt-1 text-xs text-slate-500">
              {product.confidence_reason}
            </div>
          )}

          {/* Factory Status (MVP placeholder) */}
          {product.factory_status === 'unknown' && product.is_selected && (
            <div className="mt-1 text-xs text-amber-400">
              ⚠️ {t('orderBuilderProduct.verifyFactory')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
