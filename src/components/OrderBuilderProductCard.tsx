import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  OrderBuilderProduct,
  ConfidenceLevel,
  Urgency,
  TrendDirection,
  TrendStrength,
} from '../requests/orderBuilder';
import { StockCoverage } from './shared';
import { M2_PER_PALLET, WEIGHT_PER_M2_KG } from '../constants/inventory';

// Extended product type with selected_m2 for two-way input sync
interface OrderBuilderProductWithM2 extends OrderBuilderProduct {
  selected_m2: number;
}

interface OrderBuilderProductCardProps {
  product: OrderBuilderProductWithM2;
  onToggleSelect: (productId: string) => void;
  onQuantityChange: (productId: string, pallets: number) => void;
  onM2Change: (productId: string, m2: number) => void;
}

export function OrderBuilderProductCard({
  product,
  onToggleSelect,
  onQuantityChange,
  onM2Change,
}: OrderBuilderProductCardProps) {
  const { t } = useTranslation();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const confidenceStyles: Record<ConfidenceLevel, { bg: string; text: string; border: string; glow: string }> = {
    HIGH: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' },
    MEDIUM: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-amber-500/20' },
    LOW: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', glow: 'shadow-slate-500/20' },
  };

  const confidenceIcons: Record<ConfidenceLevel, string> = {
    HIGH: '✓',
    MEDIUM: '⚠',
    LOW: '?',
  };

  const urgencyStyles: Record<Urgency, { bg: string; text: string; border: string; label: string; glow: string }> = {
    critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'CRITICAL', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]' },
    urgent: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', label: 'URGENT', glow: 'shadow-[0_0_10px_rgba(249,115,22,0.2)]' },
    soon: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'SOON', glow: '' },
    ok: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', label: 'OK', glow: '' },
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
  const confidence = confidenceStyles[product.confidence];

  return (
    <div
      className={`
        rounded-xl border p-4 transition-all duration-300
        ${product.is_selected
          ? 'bg-indigo-900/20 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
          : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/40'
        }
        backdrop-blur-sm
      `}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox with custom styling */}
        <label className="relative flex items-center mt-0.5 cursor-pointer">
          <input
            type="checkbox"
            checked={product.is_selected}
            onChange={() => onToggleSelect(product.product_id)}
            className="peer sr-only"
          />
          <div className={`
            w-5 h-5 rounded-md border-2 transition-all duration-200
            ${product.is_selected
              ? 'bg-indigo-500 border-indigo-500'
              : 'bg-slate-800 border-slate-600 hover:border-slate-500'
            }
            flex items-center justify-center
          `}>
            {product.is_selected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </label>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {/* SKU and Badges Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* SKU */}
              <span className="font-semibold text-white text-lg truncate">
                {product.sku}
              </span>

              {/* Urgency Badge */}
              <span className={`
                inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold
                ${urgency.bg} ${urgency.text} border ${urgency.border} ${urgency.glow}
              `}>
                {urgency.label}
              </span>

              {/* Trend Indicator */}
              {product.trend_direction && product.trend_direction !== 'stable' && (
                <span className={`
                  inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium
                  ${product.trend_direction === 'up' ? 'bg-emerald-500/10' : 'bg-red-500/10'}
                  ${trendColors[product.trend_direction]}
                `}>
                  <span className="text-base">{trendIcons[product.trend_direction]}</span>
                  <span>{Math.abs(Number(product.velocity_change_pct)).toFixed(0)}%</span>
                  <span className="text-xs opacity-60">{strengthLabels[product.trend_strength]}</span>
                </span>
              )}
            </div>

            {/* Right Side: Quantity + Weight + Confidence */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Pallet Selector with +/- buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onQuantityChange(product.product_id, Math.max(0, product.selected_pallets - 1))}
                  disabled={!product.is_selected || product.selected_pallets <= 0}
                  className={`
                    w-7 h-7 rounded-lg flex items-center justify-center font-bold text-lg transition-all
                    ${product.is_selected && product.selected_pallets > 0
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/30'
                      : 'bg-slate-800/50 border-slate-600/50 text-slate-600 cursor-not-allowed'
                    }
                    border
                  `}
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={product.selected_pallets}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    onQuantityChange(product.product_id, Math.min(50, Math.max(0, val)));
                  }}
                  disabled={!product.is_selected}
                  className={`
                    w-14 px-2 py-1 rounded-lg text-sm font-semibold text-center transition-all
                    ${product.is_selected
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                      : 'bg-slate-800/50 border-slate-600/50 text-slate-500 cursor-not-allowed'
                    }
                    border focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                  `}
                />
                <button
                  onClick={() => onQuantityChange(product.product_id, Math.min(50, product.selected_pallets + 1))}
                  disabled={!product.is_selected || product.selected_pallets >= 50}
                  className={`
                    w-7 h-7 rounded-lg flex items-center justify-center font-bold text-lg transition-all
                    ${product.is_selected && product.selected_pallets < 50
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/30'
                      : 'bg-slate-800/50 border-slate-600/50 text-slate-600 cursor-not-allowed'
                    }
                    border
                  `}
                >
                  +
                </button>
                <span className="text-sm text-slate-400 ml-1">{t('orderBuilderProduct.pallets')}</span>
              </div>

              {/* Separator */}
              <span className="text-slate-600">=</span>

              {/* m² Input (two-way sync with pallets) */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={Math.round(product.selected_m2 * 10) / 10}
                  onChange={(e) => {
                    const m2 = parseFloat(e.target.value) || 0;
                    // Clamp to max 50 pallets worth of m²
                    const maxM2 = 50 * M2_PER_PALLET;
                    onM2Change(product.product_id, Math.min(maxM2, Math.max(0, m2)));
                  }}
                  disabled={!product.is_selected}
                  className={`
                    w-20 px-2 py-1 rounded-lg text-sm font-semibold text-center transition-all
                    ${product.is_selected
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-800/50 border-slate-600/50 text-slate-500 cursor-not-allowed'
                    }
                    border focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                  `}
                />
                <span className="text-sm text-slate-400">m²</span>
              </div>

              {/* Weight Display (when selected) - calculated from actual m² */}
              {product.is_selected && product.selected_m2 > 0 && (
                <div className="hidden sm:flex items-center gap-1 text-sm">
                  <span className="text-slate-500">⚖️</span>
                  <span className="text-slate-300 font-medium">
                    {Math.round(product.selected_m2 * WEIGHT_PER_M2_KG).toLocaleString()} kg
                  </span>
                </div>
              )}

              {/* Confidence Badge */}
              <span className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold
                ${confidence.bg} ${confidence.text} ${confidence.border}
              `}>
                <span>{confidenceIcons[product.confidence]}</span>
                {product.confidence}
              </span>
            </div>
          </div>

          {/* Stock Coverage Comparison */}
          <div className="mt-3">
            <StockCoverage
              variant="comparison"
              warehouseDays={product.days_of_stock}
              withOrderDays={
                product.days_of_stock !== null && product.daily_velocity_m2 > 0 && product.selected_m2 > 0
                  ? product.days_of_stock + Math.round(product.selected_m2 / product.daily_velocity_m2)
                  : product.days_of_stock
              }
            />
            {product.in_transit_m2 > 0 && (
              <div className="mt-1 text-xs text-indigo-400">
                + 📦 {Math.round(product.in_transit_m2).toLocaleString()} m² {t('orderBuilderProduct.inTransit')}
              </div>
            )}
          </div>

          {/* Velocity Row */}
          {product.daily_velocity_m2 > 0 && (
            <div className="mt-1 text-sm text-slate-400">
              {t('orderBuilderProduct.velocity')}:{' '}
              <span className="font-semibold text-slate-200">{Number(product.daily_velocity_m2).toFixed(1)} m²/day</span>
            </div>
          )}

          {/* Gap & Customers Row */}
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
            <span>
              {t('orderBuilderProduct.gap')}:{' '}
              <span className="font-semibold text-white">{Math.round(product.coverage_gap_m2).toLocaleString()} m²</span>
              <span className="text-slate-500 ml-1">({product.coverage_gap_pallets}p)</span>
            </span>
            {product.unique_customers > 0 && (
              <span>
                <span className="text-indigo-400">{product.unique_customers}</span> {t('orderBuilderProduct.customers')}
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
            <div className="mt-3">
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
              >
                <span className={`transform transition-transform duration-200 ${showBreakdown ? 'rotate-90' : ''}`}>
                  ▶
                </span>
                {t('orderBuilderProduct.showCalculation')}
              </button>

              {showBreakdown && (
                <div className="mt-3 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 text-xs animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-2 text-slate-400">
                    <div className="flex justify-between">
                      <span>{t('orderBuilderProduct.leadTime')}:</span>
                      <span className="text-slate-300 font-medium">{breakdown.lead_time_days}d</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('orderBuilderProduct.untilNextBoat', 'Until next boat')}:</span>
                      <span className="text-slate-300 font-medium">{breakdown.ordering_cycle_days}d</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('orderBuilderProduct.dailyVelocity')}:</span>
                      <span className="text-slate-300 font-medium">{Number(breakdown.daily_velocity_m2).toFixed(1)} m²/d</span>
                    </div>
                    <div className="border-t border-slate-700/50 my-2" />
                    <div className="flex justify-between">
                      <span>{t('orderBuilderProduct.baseQuantity')}:</span>
                      <span className="text-slate-300 font-medium">{Math.round(Number(breakdown.base_quantity_m2)).toLocaleString()} m²</span>
                    </div>
                    {Number(breakdown.trend_adjustment_m2) !== 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>{t('orderBuilderProduct.trendAdjustment')} (+{Number(breakdown.trend_adjustment_pct).toFixed(0)}%):</span>
                        <span className="font-medium">+{Math.round(Number(breakdown.trend_adjustment_m2)).toLocaleString()} m²</span>
                      </div>
                    )}
                    <div className="flex justify-between text-red-400">
                      <span>{t('orderBuilderProduct.minusStock')}:</span>
                      <span className="font-medium">-{Math.round(Number(breakdown.minus_current_stock_m2)).toLocaleString()} m²</span>
                    </div>
                    {Number(breakdown.minus_incoming_m2) > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>{t('orderBuilderProduct.minusIncoming')}:</span>
                        <span className="font-medium">-{Math.round(Number(breakdown.minus_incoming_m2)).toLocaleString()} m²</span>
                      </div>
                    )}
                    <div className="border-t border-slate-700/50 my-2" />
                    <div className="flex justify-between font-semibold text-white text-sm">
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
            <div className="mt-2 text-xs text-slate-500 italic">
              {product.confidence_reason}
            </div>
          )}

          {/* Factory Production Status */}
          {product.factory_status === 'in_production' && (
            <div className={`
              mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg
              ${product.factory_ready_before_boat
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }
            `}>
              <span>🏭</span>
              <span className="font-medium">
                {product.factory_timing_message || (
                  product.factory_production_date
                    ? `Production: ${new Date(product.factory_production_date).toLocaleDateString()}`
                    : 'In production'
                )}
              </span>
              {product.factory_production_m2 && (
                <span className="text-slate-400 ml-1">
                  ({Math.round(Number(product.factory_production_m2)).toLocaleString()} m²)
                </span>
              )}
            </div>
          )}

          {product.factory_status === 'not_scheduled' && product.is_selected && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-500/10 px-2.5 py-1 rounded-lg border border-slate-500/30">
              <span>📋</span>
              <span>{t('orderBuilderProduct.notInSchedule', 'Not in production schedule')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
