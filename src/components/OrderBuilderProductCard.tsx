import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  OrderBuilderProduct,
  ConfidenceLevel,
  TrendDirection,
  FactoryFillStatus,
  VelocityTrendSignal,
  ProductionStatus,
} from '../requests/orderBuilder';
import { WEIGHT_PER_M2_KG } from '../constants/inventory';
import { formatDateUTC } from '../utils/dateUtils';
import { formatM2 } from '../utils/formatters';

// Extended product type with selected_m2 for two-way input sync
interface OrderBuilderProductWithM2 extends OrderBuilderProduct {
  selected_m2: number;
}

interface OrderBuilderProductCardProps {
  product: OrderBuilderProductWithM2;
  onToggleSelect: (productId: string) => void;
  onQuantityChange: (productId: string, pallets: number) => void;
  onM2Change: (productId: string, m2: number) => void;
  onRemove?: (sku: string) => void;
  isRemoved?: boolean;
}

export function OrderBuilderProductCard({
  product,
  onToggleSelect,
  onQuantityChange,
  onM2Change,
  onRemove,
  isRemoved = false,
}: OrderBuilderProductCardProps) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  // Urgency styles - now combined with score
  const urgencyStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
    covered: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/40', label: t('orderBuilderProduct.covered', '🚢 CUBIERTO') },
    critical: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/40', label: t('orderBuilderProduct.urgencyCritical', 'CRÍTICO') },
    urgent: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/40', label: t('orderBuilderProduct.urgencyUrgent', 'URGENTE') },
    soon: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/40', label: t('orderBuilderProduct.urgencySoon', 'PRONTO') },
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

  const factoryFillStyles: Record<FactoryFillStatus, { icon: string; color: string; textColor: string }> = {
    single_lot: { icon: '✓', color: 'text-emerald-400', textColor: 'text-emerald-400' },
    mixed_lots: { icon: '⚠', color: 'text-amber-400', textColor: 'text-amber-400' },
    available: { icon: '✓', color: 'text-emerald-400', textColor: 'text-emerald-400' },
    needs_production: { icon: '🔴', color: 'text-red-400', textColor: 'text-red-400' },
    partial_available: { icon: '⚡', color: 'text-amber-400', textColor: 'text-amber-400' },
    no_stock: { icon: '—', color: 'text-slate-500', textColor: 'text-slate-500' },
    not_needed: { icon: '', color: '', textColor: 'text-slate-400' },
    unknown: { icon: '?', color: 'text-slate-500', textColor: 'text-slate-500' },
  };

  const velocityTrendStyles: Record<VelocityTrendSignal, { icon: string; color: string; label: string }> = {
    growing: { icon: '📈', color: 'text-emerald-400', label: t('orderBuilderProduct.growing', 'Creciendo') },
    stable: { icon: '➡️', color: 'text-slate-400', label: t('orderBuilderProduct.stable', 'Estable') },
    declining: { icon: '📉', color: 'text-amber-400', label: t('orderBuilderProduct.declining', 'Bajando') },
  };

  // Production schedule status styles
  const productionStatusStyles: Record<ProductionStatus, { icon: string; color: string; bgColor: string; label: string }> = {
    scheduled: { icon: '📋', color: 'text-amber-400', bgColor: 'bg-amber-500/20', label: t('orderBuilderProduct.scheduled', 'Programado') },
    in_progress: { icon: '🔧', color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: t('orderBuilderProduct.inProduction', 'En Producción') },
    completed: { icon: '✅', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', label: t('orderBuilderProduct.readyToShip', 'Listo para Enviar') },
    not_scheduled: { icon: '', color: 'text-slate-500', bgColor: '', label: t('orderBuilderProduct.notScheduled', 'No Programado') },
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
    return product.in_transit_m2 > 0 ? `${formatM2(product.in_transit_m2)} m²` : null;
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
        { m2: formatM2(product.in_transit_m2), days: transitDays }));
      return parts.join(' · ');
    }

    // If covered by pending order, mention that
    if (product.suggested_pallets === 0 && product.pending_order_m2 > 0) {
      parts.push(t('orderBuilderProduct.coveredByPending',
        'Covered by {{m2}} m² pending order',
        { m2: formatM2(product.pending_order_m2) }));
      if (product.pending_order_boat) {
        parts.push(`(${product.pending_order_boat})`);
      }
      return parts.join(' ');
    }

    // Stock urgency
    if (currentDays !== null && currentDays <= 7) {
      if (currentDays === 0 && product.daily_velocity_m2 === 0) {
        // No sales data - don't say "Out of stock" which is misleading
        parts.push(t('orderBuilderProduct.noSalesHistory', 'Sin historial de ventas'));
      } else if (currentDays === 0) {
        parts.push(t('orderBuilderProduct.outOfStock', 'Agotado'));
      } else {
        parts.push(t('orderBuilderProduct.daysLeft', '{{days}}d restantes', { days: currentDays }));
      }
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

  // If removed, show dimmed version
  if (isRemoved) {
    return (
      <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 backdrop-blur-sm opacity-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-lg line-through">{product.sku}</span>
            <span className="text-slate-600 text-sm">
              ({product.coverage_gap_pallets || 0}p = {formatM2((product.coverage_gap_pallets || 0) * 134.4)} m²)
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700/50 text-slate-500">
              {t('orderBuilder.removed', 'REMOVED')}
            </span>
          </div>
        </div>
      </div>
    );
  }

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

          {/* Remove Button */}
          {onRemove && (
            <button
              onClick={() => onRemove(product.sku)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title={t('orderBuilder.removeFromOrder', 'Quitar del pedido')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

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
            {t('orderBuilderProduct.inventory', 'Inventario')}
          </div>

          {/* No inventory data warning */}
          {Number(product.current_stock_m2) === 0 &&
           product.in_transit_m2 === 0 &&
           product.factory_available_m2 === 0 &&
           product.daily_velocity_m2 === 0 && (
            <div className="flex items-center gap-2 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1.5 mb-1">
              <span className="text-amber-400">⚠️</span>
              <span className="text-amber-400 text-xs">
                {t('orderBuilderProduct.noInventoryData', 'Sin datos de inventario')}
              </span>
            </div>
          )}

          {/* Warehouse */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">📦</span>
            <span className="text-slate-200 font-medium">
              {formatM2(Number(product.current_stock_m2))} m²
            </span>
            {product.days_of_stock !== null && product.daily_velocity_m2 > 0 && (
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

          {/* Pending Orders (already ordered, awaiting shipment) */}
          {product.pending_order_m2 > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">📋</span>
              <span className="text-teal-300 font-medium">
                {formatM2(product.pending_order_m2)} m²
              </span>
              <span className="text-xs text-slate-500">
                {t('orderBuilderProduct.pendingOrder', 'pending')}
                {product.pending_order_boat && ` (${product.pending_order_boat})`}
              </span>
            </div>
          )}

          {/* Factory Available (SIESA) */}
          {product.factory_available_m2 > 0 ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">🏭</span>
              <span className="text-purple-300 font-medium">
                {formatM2(product.factory_available_m2)} m²
              </span>
              <span className="text-xs text-slate-500">{t('orderBuilderProduct.atFactory', 'at factory')}</span>
              {product.factory_fill_status && product.factory_fill_status !== 'not_needed' && product.factory_fill_status !== 'unknown' && (
                <span className={`text-xs ${factoryFillStyles[product.factory_fill_status].textColor}`}>
                  {factoryFillStyles[product.factory_fill_status].icon}{' '}
                  {product.factory_fill_status === 'single_lot' && t('orderBuilderProduct.singleLot', 'single lot')}
                  {product.factory_fill_status === 'mixed_lots' && t('orderBuilderProduct.mixedLots', 'mixed lots')}
                  {product.factory_fill_status === 'needs_production' && t('orderBuilderProduct.needsProduction', 'needs production')}
                  {product.factory_fill_status === 'no_stock' && t('orderBuilderProduct.noStock', 'no stock')}
                </span>
              )}
            </div>
          ) : product.suggested_pallets > 0 ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">🏭</span>
              <span className="text-orange-400 font-medium">
                {t('orderBuilderProduct.siesaNoStock', 'SIESA: No stock')}
              </span>
            </div>
          ) : null}

          {/* Production Schedule Status (from Programa de Produccion) */}
          {product.production_status && product.production_status !== 'not_scheduled' && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">
                {product.production_status === 'completed' && !product.factory_available_m2
                  ? '⏳'
                  : productionStatusStyles[product.production_status].icon}
              </span>
              <span className={`font-medium ${
                product.production_status === 'completed' && !product.factory_available_m2
                  ? 'text-amber-400'
                  : productionStatusStyles[product.production_status].color
              }`}>
                {product.production_status === 'completed' && (
                  product.factory_available_m2 > 0
                    ? <>{formatM2(product.production_completed_m2)} m² {t('orderBuilderProduct.readyToShip', 'ready to ship')}</>
                    : <>{formatM2(product.production_completed_m2)} m² {t('orderBuilderProduct.producedPendingSiesa', 'produced — pending SIESA entry')}</>
                )}
                {product.production_status === 'in_progress' && (
                  <>{formatM2(product.production_requested_m2)} m² {t('orderBuilderProduct.inProduction', 'in production')}</>
                )}
                {product.production_status === 'scheduled' && (
                  <>{formatM2(product.production_requested_m2)} m² {t('orderBuilderProduct.scheduled', 'scheduled')}</>
                )}
              </span>
              {product.production_can_add_more && (
                <span className="text-xs text-amber-400 font-medium">
                  ({t('orderBuilderProduct.canAddMore', 'can add more!')})
                </span>
              )}
            </div>
          )}

          {/* Velocity with Trend Signal */}
          {product.daily_velocity_m2 > 0 ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">⚡</span>
              <span className="text-slate-400">
                {Number(product.daily_velocity_m2).toFixed(1)} m²/d
              </span>
              {product.velocity_trend_signal && product.velocity_180d_m2 > 0 && (
                <span className={`text-xs ${velocityTrendStyles[product.velocity_trend_signal].color}`}>
                  {velocityTrendStyles[product.velocity_trend_signal].icon}{' '}
                  {product.velocity_trend_signal === 'growing' && (
                    <>+{Math.round((product.velocity_trend_ratio - 1) * 100)}% {t('orderBuilderProduct.vs6mo', 'vs 6m')}</>
                  )}
                  {product.velocity_trend_signal === 'declining' && (
                    <>{Math.round((product.velocity_trend_ratio - 1) * 100)}% {t('orderBuilderProduct.vs6mo', 'vs 6m')}</>
                  )}
                  {product.velocity_trend_signal === 'stable' && t('orderBuilderProduct.stable', 'Estable')}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">⚡</span>
              <span className="text-slate-500 italic">
                {t('orderBuilderProduct.noVelocityData', 'Sin datos de velocidad')}
              </span>
            </div>
          )}
        </div>

        {/* ORDER Column */}
        <div className="space-y-2">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {t('orderBuilderProduct.order', 'Pedido')}
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
          </div>

          {/* M² Input (synced with pallets) */}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              step="100"
              value={Math.round(product.selected_m2)}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                onM2Change(product.product_id, Math.max(0, val));
              }}
              disabled={!product.is_selected}
              className={`
                w-20 px-1.5 py-1 rounded-lg text-sm font-semibold text-center transition-all
                ${product.is_selected
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800/50 border-slate-600/50 text-slate-500 cursor-not-allowed'
                }
                border focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
              `}
            />
            <span className="text-xs text-slate-500">m²</span>
          </div>

          {/* Coverage Change */}
          {product.is_selected && product.selected_m2 > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">{t('orderBuilderProduct.coverage', 'Cobertura')}:</span>
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

      {/* Pre-Production Alert — Show when can add more to scheduled production */}
      {product.production_add_more_alert && (
        <div className="mx-4 mb-2 p-3 bg-amber-500/20 border border-amber-500/50 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-amber-400 text-lg">⚠️</span>
            <div className="flex-1 min-w-0">
              <div className="text-amber-300 font-medium text-sm">
                {product.production_add_more_alert}
              </div>
              <div className="text-amber-400/70 text-xs mt-1">
                {t('orderBuilderProduct.productionScheduledNotStarted', 'Producción programada pero no iniciada')} ·{' '}
                {t('orderBuilderProduct.currentRequest', 'Solicitud actual')}: {formatM2(product.production_requested_m2)} m²
              </div>
            </div>
          </div>
        </div>
      )}

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
          {t('orderBuilderProduct.details', 'Detalles')}
        </button>
      </div>

      {/* Expanded Details Section */}
      {showDetails && (
        <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
          <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">

            {/* Velocity Breakdown (90d vs 6mo) */}
            {product.velocity_90d_m2 > 0 && (
              <div className="p-3 border-b border-slate-700/50">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {t('orderBuilderProduct.velocityBreakdown', 'Velocidad')}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>{t('orderBuilderProduct.velocity90d', '90 días')} ({t('orderBuilderProduct.recent', 'reciente')})</span>
                    <span className="text-slate-300 font-medium">{Number(product.velocity_90d_m2).toFixed(1)} m²/d</span>
                  </div>
                  {product.velocity_180d_m2 > 0 && (
                    <>
                      <div className="flex justify-between text-slate-400">
                        <span>{t('orderBuilderProduct.velocity180d', '6 meses')} ({t('orderBuilderProduct.historical', 'histórico')})</span>
                        <span className="text-slate-300">{Number(product.velocity_180d_m2).toFixed(1)} m²/d</span>
                      </div>
                      <div className={`flex justify-between font-medium pt-1 border-t border-slate-700/50 mt-1 ${velocityTrendStyles[product.velocity_trend_signal].color}`}>
                        <span>{t('orderBuilderProduct.trend', 'Tendencia')}</span>
                        <span>
                          {velocityTrendStyles[product.velocity_trend_signal].icon}{' '}
                          {product.velocity_trend_signal === 'growing' && `${t('orderBuilderProduct.growing', 'Creciendo')} +${Math.round((product.velocity_trend_ratio - 1) * 100)}%`}
                          {product.velocity_trend_signal === 'declining' && `${t('orderBuilderProduct.declining', 'Bajando')} ${Math.round((product.velocity_trend_ratio - 1) * 100)}%`}
                          {product.velocity_trend_signal === 'stable' && t('orderBuilderProduct.stable', 'Estable')}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Calculation Breakdown */}
            {breakdown && (
              <div className="p-3 border-b border-slate-700/50">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {t('orderBuilderProduct.calculation', 'Cálculo')}
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>{t('orderBuilderProduct.baseQuantity', 'Base')}: {Number(breakdown.daily_velocity_m2).toFixed(1)} m²/d × {breakdown.lead_time_days + breakdown.ordering_cycle_days}d</span>
                    <span className="text-slate-300">{formatM2(Number(breakdown.base_quantity_m2))} m²</span>
                  </div>
                  {Number(breakdown.trend_adjustment_m2) !== 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>{t('orderBuilderProduct.trendAdjustment', 'Tendencia')} (+{Number(breakdown.trend_adjustment_pct).toFixed(0)}%)</span>
                      <span>+{formatM2(Number(breakdown.trend_adjustment_m2))} m²</span>
                    </div>
                  )}
                  <div className="flex justify-between text-red-400">
                    <span>- {t('orderBuilderProduct.warehouse', 'Bodega')}</span>
                    <span>-{formatM2(Number(breakdown.minus_current_stock_m2))} m²</span>
                  </div>
                  {Number(breakdown.minus_incoming_m2) > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>- {t('orderBuilderProduct.inTransitLabel', 'En tránsito')}</span>
                      <span>-{formatM2(Number(breakdown.minus_incoming_m2))} m²</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-white pt-1 border-t border-slate-700/50 mt-1">
                    <span>= {t('orderBuilderProduct.suggestion', 'Sugerencia')}</span>
                    <span>{formatM2(Number(breakdown.final_suggestion_m2))} m²</span>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Info */}
            {product.unique_customers > 0 && (
              <div className="p-3 border-b border-slate-700/50">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {t('orderBuilderProduct.customers', 'Clientes')}
                </div>
                <div className="text-xs text-slate-400">
                  <span className="text-indigo-400 font-medium">{product.unique_customers}</span> {t('orderBuilderProduct.totalCustomers', 'total')}
                  {product.top_customer_name && Number(product.top_customer_share) > 0.2 && (
                    <span className="ml-2">
                      · {t('orderBuilderProduct.top', 'Principal')}: <span className="text-slate-300">{product.top_customer_name}</span>
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
                  {t('orderBuilderProduct.factory', 'Fábrica')}
                </div>
                <div className={`text-xs flex items-center gap-2 ${product.factory_ready_before_boat ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <span>🏭</span>
                  <span>
                    {product.factory_timing_message || (
                      product.factory_production_date
                        ? `${t('orderBuilderProduct.ready', 'Listo')} ${formatDateUTC(product.factory_production_date)}`
                        : t('orderBuilderProduct.inProduction', 'En producción')
                    )}
                  </span>
                  {product.factory_production_m2 && (
                    <span className="text-slate-400">
                      ({formatM2(Number(product.factory_production_m2))} m²)
                    </span>
                  )}
                </div>
              </div>
            )}

            {product.factory_status === 'not_scheduled' && product.is_selected && (
              <div className="p-3 border-b border-slate-700/50">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {t('orderBuilderProduct.factory', 'Fábrica')}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>📋</span>
                  <span>{t('orderBuilderProduct.notInSchedule', 'No está en programa de producción')}</span>
                </div>
              </div>
            )}

            {/* Availability Breakdown */}
            {product.availability_breakdown && (
              <div className="p-3 border-b border-slate-700/50">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {t('orderBuilderProduct.availability', 'Disponibilidad para este barco')}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('orderBuilderProduct.siesaStock', 'SIESA (stock fábrica)')}</span>
                    <span className="text-slate-300">{formatM2(product.availability_breakdown.siesa_now_m2)} m²</span>
                  </div>
                  {product.availability_breakdown.production_completing_m2 > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">+ {t('orderBuilderProduct.productionCompleting', 'Producción completando')}</span>
                      <span className="text-emerald-400">+{formatM2(product.availability_breakdown.production_completing_m2)} m²</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-700/50 pt-1 mt-1">
                    <span className="text-slate-300 font-medium">{t('orderBuilderProduct.totalAvailable', 'Total disponible')}</span>
                    <span className="text-slate-200 font-medium">{formatM2(product.availability_breakdown.total_available_m2)} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('orderBuilderProduct.suggestedOrder', 'Pedido sugerido')}</span>
                    <span className="text-slate-300">{formatM2(product.availability_breakdown.suggested_order_m2)} m²</span>
                  </div>
                  {product.availability_breakdown.shortfall_m2 > 0 ? (
                    <div className="flex justify-between text-red-400">
                      <span>{t('orderBuilderProduct.shortfall', 'Faltante')}</span>
                      <span>-{formatM2(product.availability_breakdown.shortfall_m2)} m²</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-emerald-400">
                      <span>{t('orderBuilderProduct.status', 'Estado')}</span>
                      <span>✓ {t('orderBuilderProduct.canFulfill', 'Puede cumplir')}</span>
                    </div>
                  )}
                  {product.availability_breakdown.shortfall_note && (
                    <div className="text-[10px] text-slate-500 italic mt-1">
                      {product.availability_breakdown.shortfall_note}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Committed Orders (5e) */}
            {product.committed_orders_m2 > 0 && (
              <div className="p-3 border-b border-slate-700/50">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-blue-400">{t('orderBuilderProduct.committed', 'Comprometido:')}</span>
                  <span className="text-blue-300 font-medium">
                    {formatM2(product.committed_orders_m2)} m²
                  </span>
                  {product.committed_orders_customer && (
                    <span className="text-slate-500">({product.committed_orders_customer})</span>
                  )}
                  {product.committed_orders_count > 1 && (
                    <span className="text-slate-500">· {product.committed_orders_count} {t('orderBuilderProduct.orders', 'pedidos')}</span>
                  )}
                </div>
              </div>
            )}

            {/* Unfulfilled Demand (5f) */}
            {product.has_unfulfilled_demand && (
              <div className="p-3 border-b border-slate-700/50">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-amber-400">{t('orderBuilderProduct.unfulfilledDemand', 'Demanda insatisfecha:')}</span>
                  <span className="text-amber-300 font-medium">
                    {formatM2(product.unfulfilled_demand_m2)} m²
                  </span>
                  <span className="text-slate-500">{t('orderBuilderProduct.last90Days', '(últimos 90 días)')}</span>
                </div>
              </div>
            )}

            {/* Weight + Confidence */}
            <div className="p-3 flex flex-wrap gap-4 text-xs text-slate-400">
              {/* Weight */}
              {product.selected_m2 > 0 && (
                <div className="flex items-center gap-1.5">
                  <span>⚖️</span>
                  <span>{t('orderBuilderProduct.weight', 'Peso')}:</span>
                  <span className="text-slate-300 font-medium">
                    {Math.round(product.selected_m2 * WEIGHT_PER_M2_KG).toLocaleString()} kg
                  </span>
                </div>
              )}

              {/* Confidence */}
              <div className="flex items-center gap-1.5">
                <span className={confidence.color}>{confidence.icon}</span>
                <span>{t('orderBuilderProduct.confidence', 'Confianza')}:</span>
                <span className={`font-medium ${confidence.color}`}>{product.confidence}</span>
                {product.confidence === 'LOW' && product.confidence_reason && (
                  <span className="text-slate-500 italic ml-1">({product.confidence_reason})</span>
                )}
              </div>

              {/* Gap info */}
              <div className="flex items-center gap-1.5">
                <span>{t('orderBuilderProduct.gap', 'Brecha')}:</span>
                <span className="text-slate-300 font-medium">
                  {formatM2(product.coverage_gap_m2)} m²
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
