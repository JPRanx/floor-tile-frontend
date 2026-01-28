import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  OrderBuilderProduct,
  ConfidenceLevel,
  TrendDirection,
} from '../requests/orderBuilder';
import { WEIGHT_PER_M2_KG } from '../constants/inventory';

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
  onM2Change: _onM2Change,
}: OrderBuilderProductCardProps) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  // Urgency styles - now combined with score
  const urgencyStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
    covered: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/40', label: '🚢 COVERED' },
    critical: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/40', label: 'CRITICAL' },
    urgent: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/40', label: 'URGENT' },
    soon: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/40', label: 'SOON' },
    ok: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/40', label: 'OK' },
  };

  const trendColors: Record<TrendDirection, string> = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    stable: 'text-slate-500',
  };

  const trendIcons: Record<TrendDirection, string> = {
    up: '↑',
    down: '↓',
    stable: '→',
  };

  const confidenceLabels: Record<ConfidenceLevel, { icon: string; color: string }> = {
    HIGH: { icon: '✓', color: 'text-emerald-400' },
    MEDIUM: { icon: '⚠', color: 'text-amber-400' },
    LOW: { icon: '?', color: 'text-slate-400' },
  };

  // Override urgency to COVERED when in-transit covers the need
  const isCoveredByTransit = product.suggested_pallets === 0 && product.in_transit_m2 > 0;
  const effectiveUrgency = isCoveredByTransit ? 'covered' : product.urgency;
  const urgency = urgencyStyles[effectiveUrgency] || urgencyStyles.ok;
  const breakdown = product.calculation_breakdown;
  const confidence = confidenceLabels[product.confidence];

  // Calculate coverage change
  const currentDays = product.days_of_stock ?? 0;
  const addedDays = product.daily_velocity_m2 > 0 && product.selected_m2 > 0
    ? Math.round(product.selected_m2 / product.daily_velocity_m2)
    : 0;
  const newDays = currentDays + addedDays;

  // Format arrival date for in-transit
  // For now, we'll show days until arrival if available, or estimate from boat arrival
  const formatTransitArrival = () => {
    // If we have boat arrival info, use that
    // Otherwise just show the quantity
    return product.in_transit_m2 > 0 ? `${Math.round(product.in_transit_m2).toLocaleString()} m²` : null;
  };

  // Build consolidated reasoning sentence
  const buildReasoningSentence = () => {
    const parts: string[] = [];

    // If covered by in-transit, lead with that explanation
    if (isCoveredByTransit) {
      const transitDays = product.daily_velocity_m2 > 0
        ? Math.round(product.in_transit_m2 / product.daily_velocity_m2)
        : 0;
      parts.push(t('orderBuilderProduct.coveredByTransit',
        'Covered by {{m2}} m² in transit ({{days}}d)',
        { m2: Math.round(product.in_transit_m2).toLocaleString(), days: transitDays }));
      return parts.join(' · ');
    }

    // Stock urgency
    if (currentDays !== null && currentDays <= 7) {
      parts.push(currentDays === 0
        ? t('orderBuilderProduct.outOfStock', 'Out of stock')
        : t('orderBuilderProduct.daysLeft', '{{days}}d left', { days: currentDays }));
    }

    // Customer count
    if (product.unique_customers > 0) {
      parts.push(t('orderBuilderProduct.customersCount', '{{count}} customers', { count: product.unique_customers }));
    }

    // Top customer concentration (if significant)
    if (product.top_customer_share != null && Number(product.top_customer_share) > 0.3 && product.top_customer_name) {
      const percent = Math.round(Number(product.top_customer_share) * 100);
      // Shorten customer name if too long
      const shortName = product.top_customer_name.length > 15
        ? product.top_customer_name.substring(0, 12) + '...'
        : product.top_customer_name;
      parts.push(`${percent}% ${shortName}`);
    }

    // Use reasoning display if available and we don't have enough parts
    if (parts.length === 0 && product.reasoning_display?.why_product_sentence) {
      return product.reasoning_display.why_product_sentence;
    }

    return parts.join(' · ');
  };

  const reasoningSentence = buildReasoningSentence();

  return (
    <div
      className={`
        rounded-xl border transition-all duration-300
        ${product.is_selected
          ? 'bg-indigo-900/20 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
          : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/40'
        }
        backdrop-blur-sm
      `}
    >
      {/* Header Row */}
      <div className="flex items-center gap-3 p-4 pb-3">
        {/* Checkbox */}
        <label className="relative flex items-center cursor-pointer shrink-0">
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

        {/* SKU */}
        <span className="font-semibold text-white text-lg truncate flex-1 min-w-0">
          {product.sku}
        </span>

        {/* Combined Urgency + Score Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold
            ${urgency.bg} ${urgency.text} border ${urgency.border}
          `}>
            {urgency.label}
            {product.score && (
              <span className="opacity-75">{product.score.total}</span>
            )}
          </span>

          {/* Trend (simplified) */}
          {product.trend_direction && product.trend_direction !== 'stable' && (
            <span className={`text-sm font-medium ${trendColors[product.trend_direction]}`}>
              {trendIcons[product.trend_direction]}{Math.abs(Number(product.velocity_change_pct)).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-slate-700/50" />

      {/* Two-Column: Inventory | Order */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
        {/* INVENTORY Column */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {t('orderBuilderProduct.inventory', 'Inventory')}
          </div>

          {/* Warehouse */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">📦</span>
            <span className="text-slate-200 font-medium">
              {Math.round(Number(product.current_stock_m2)).toLocaleString()} m²
            </span>
            {product.days_of_stock !== null && (
              <span className={`text-xs ${currentDays <= 7 ? 'text-red-400' : currentDays <= 14 ? 'text-amber-400' : 'text-slate-500'}`}>
                ({currentDays}d)
              </span>
            )}
          </div>

          {/* In Transit */}
          {product.in_transit_m2 > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">🚢</span>
              <span className="text-indigo-300 font-medium">
                {formatTransitArrival()}
              </span>
              <span className="text-xs text-slate-500">{t('orderBuilderProduct.inTransit', 'in transit')}</span>
            </div>
          )}

          {/* Velocity */}
          {product.daily_velocity_m2 > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">⚡</span>
              <span className="text-slate-400">
                {Number(product.daily_velocity_m2).toFixed(1)} m²/d
              </span>
            </div>
          )}
        </div>

        {/* ORDER Column */}
        <div className="space-y-2">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {t('orderBuilderProduct.order', 'Order')}
          </div>

          {/* Pallet Selector */}
          <div className="flex items-center gap-1.5">
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
                w-12 px-1.5 py-1 rounded-lg text-sm font-semibold text-center transition-all
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
            <span className="text-xs text-slate-500 ml-1">p</span>
            <span className="text-slate-600 mx-1">=</span>
            <span className={`text-sm font-semibold ${product.is_selected ? 'text-emerald-300' : 'text-slate-500'}`}>
              {Math.round(product.selected_m2).toLocaleString()} m²
            </span>
          </div>

          {/* Coverage Change */}
          {product.is_selected && product.selected_m2 > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">{t('orderBuilderProduct.coverage', 'Coverage')}:</span>
              <span className={`font-medium ${currentDays <= 7 ? 'text-red-400' : 'text-slate-400'}`}>
                {currentDays}d
              </span>
              <span className="text-slate-600">→</span>
              <span className="font-medium text-emerald-400">
                {newDays}d
              </span>
              <span className="text-emerald-500">✓</span>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-slate-700/50" />

      {/* Reasoning + Details Toggle */}
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        {/* Reasoning sentence */}
        {reasoningSentence && (
          <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
            <span className="shrink-0">💡</span>
            <span className="text-slate-300 truncate">{reasoningSentence}</span>
          </div>
        )}

        {/* Details toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors shrink-0"
        >
          <span className={`transform transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`}>
            ▼
          </span>
          {t('orderBuilderProduct.details', 'Details')}
        </button>
      </div>

      {/* Expanded Details Section */}
      {showDetails && (
        <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
          <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">

            {/* Calculation Breakdown */}
            {breakdown && (
              <div className="p-3 border-b border-slate-700/50">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {t('orderBuilderProduct.calculation', 'Calculation')}
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>{t('orderBuilderProduct.baseQuantity', 'Base')}: {Number(breakdown.daily_velocity_m2).toFixed(1)} m²/d × {breakdown.lead_time_days + breakdown.ordering_cycle_days}d</span>
                    <span className="text-slate-300">{Math.round(Number(breakdown.base_quantity_m2)).toLocaleString()} m²</span>
                  </div>
                  {Number(breakdown.trend_adjustment_m2) !== 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>{t('orderBuilderProduct.trendAdjustment', 'Trend')} (+{Number(breakdown.trend_adjustment_pct).toFixed(0)}%)</span>
                      <span>+{Math.round(Number(breakdown.trend_adjustment_m2)).toLocaleString()} m²</span>
                    </div>
                  )}
                  <div className="flex justify-between text-red-400">
                    <span>- {t('orderBuilderProduct.warehouse', 'Warehouse')}</span>
                    <span>-{Math.round(Number(breakdown.minus_current_stock_m2)).toLocaleString()} m²</span>
                  </div>
                  {Number(breakdown.minus_incoming_m2) > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>- {t('orderBuilderProduct.inTransitLabel', 'In transit')}</span>
                      <span>-{Math.round(Number(breakdown.minus_incoming_m2)).toLocaleString()} m²</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-white pt-1 border-t border-slate-700/50 mt-1">
                    <span>= {t('orderBuilderProduct.suggestion', 'Suggestion')}</span>
                    <span>{Math.round(Number(breakdown.final_suggestion_m2)).toLocaleString()} m²</span>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Info */}
            {product.unique_customers > 0 && (
              <div className="p-3 border-b border-slate-700/50">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {t('orderBuilderProduct.customers', 'Customers')}
                </div>
                <div className="text-xs text-slate-400">
                  <span className="text-indigo-400 font-medium">{product.unique_customers}</span> {t('orderBuilderProduct.totalCustomers', 'total')}
                  {product.top_customer_name && Number(product.top_customer_share) > 0.2 && (
                    <span className="ml-2">
                      · {t('orderBuilderProduct.top', 'Top')}: <span className="text-slate-300">{product.top_customer_name}</span>
                      <span className="text-amber-400 ml-1">({Math.round(Number(product.top_customer_share) * 100)}%)</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Factory Status */}
            {product.factory_status === 'in_production' && (
              <div className="p-3 border-b border-slate-700/50">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {t('orderBuilderProduct.factory', 'Factory')}
                </div>
                <div className={`text-xs flex items-center gap-2 ${product.factory_ready_before_boat ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <span>🏭</span>
                  <span>
                    {product.factory_timing_message || (
                      product.factory_production_date
                        ? `Ready ${new Date(product.factory_production_date).toLocaleDateString()}`
                        : 'In production'
                    )}
                  </span>
                  {product.factory_production_m2 && (
                    <span className="text-slate-400">
                      ({Math.round(Number(product.factory_production_m2)).toLocaleString()} m²)
                    </span>
                  )}
                </div>
              </div>
            )}

            {product.factory_status === 'not_scheduled' && product.is_selected && (
              <div className="p-3 border-b border-slate-700/50">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {t('orderBuilderProduct.factory', 'Factory')}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>📋</span>
                  <span>{t('orderBuilderProduct.notInSchedule', 'Not in production schedule')}</span>
                </div>
              </div>
            )}

            {/* Weight + Confidence */}
            <div className="p-3 flex flex-wrap gap-4 text-xs text-slate-400">
              {/* Weight */}
              {product.selected_m2 > 0 && (
                <div className="flex items-center gap-1.5">
                  <span>⚖️</span>
                  <span>{t('orderBuilderProduct.weight', 'Weight')}:</span>
                  <span className="text-slate-300 font-medium">
                    {Math.round(product.selected_m2 * WEIGHT_PER_M2_KG).toLocaleString()} kg
                  </span>
                </div>
              )}

              {/* Confidence */}
              <div className="flex items-center gap-1.5">
                <span className={confidence.color}>{confidence.icon}</span>
                <span>{t('orderBuilderProduct.confidence', 'Confidence')}:</span>
                <span className={`font-medium ${confidence.color}`}>{product.confidence}</span>
                {product.confidence === 'LOW' && product.confidence_reason && (
                  <span className="text-slate-500 italic ml-1">({product.confidence_reason})</span>
                )}
              </div>

              {/* Gap info */}
              <div className="flex items-center gap-1.5">
                <span>{t('orderBuilderProduct.gap', 'Gap')}:</span>
                <span className="text-slate-300 font-medium">
                  {Math.round(product.coverage_gap_m2).toLocaleString()} m²
                </span>
                <span className="text-slate-500">({product.coverage_gap_pallets}p)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
