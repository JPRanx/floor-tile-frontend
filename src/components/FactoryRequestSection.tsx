import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { FactoryRequestSummary, FactoryRequestItem } from '../requests/orderBuilder';
import { formatM2 } from '../utils/formatters';

interface FactoryRequestSectionProps {
  summary: FactoryRequestSummary | null;
  factoryId?: string;
  onItemSelect?: (item: FactoryRequestItem, selected: boolean) => void;
  onItemQuantityChange?: (item: FactoryRequestItem, pallets: number) => void;
}

export function FactoryRequestSection({
  summary,
  factoryId,
  onItemSelect,
  onItemQuantityChange,
}: FactoryRequestSectionProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);

  // Initialize selectedItems from server-provided is_selected field
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => {
    if (!summary) return new Set();
    return new Set(
      summary.items
        .filter((item) => item.is_selected)
        .map((item) => item.product_id)
    );
  });

  // Initialize quantities for selected items
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>(() => {
    if (!summary) return {};
    const quantities: Record<string, number> = {};
    summary.items
      .filter((item) => item.is_selected)
      .forEach((item) => {
        quantities[item.product_id] = item.request_pallets;
      });
    return quantities;
  });

  if (!summary || summary.items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-600/50 bg-slate-800/30 backdrop-blur-xl overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-2 h-10 rounded-full bg-slate-500" />
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              {t('orderBuilder.newFactoryRequest', 'Nueva Solicitud de Fábrica')}
              <span className="text-slate-500 font-normal">(0)</span>
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {t('orderBuilder.noFactoryRequestItems', 'Todos los productos tienen producción activa o stock suficiente')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleToggleItem = (item: FactoryRequestItem) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(item.product_id)) {
      newSelected.delete(item.product_id);
    } else {
      newSelected.add(item.product_id);
      // Initialize quantity if not set
      if (!itemQuantities[item.product_id]) {
        setItemQuantities((prev) => ({
          ...prev,
          [item.product_id]: item.request_pallets,
        }));
      }
    }
    setSelectedItems(newSelected);
    onItemSelect?.(item, newSelected.has(item.product_id));
  };

  const handleQuantityChange = (item: FactoryRequestItem, pallets: number) => {
    const validPallets = Math.max(0, pallets);
    setItemQuantities((prev) => ({
      ...prev,
      [item.product_id]: validPallets,
    }));
    onItemQuantityChange?.(item, validPallets);
  };

  // Calculate totals for selected items
  const selectedTotalPallets = summary.items
    .filter((item) => selectedItems.has(item.product_id))
    .reduce((sum, item) => sum + (itemQuantities[item.product_id] || item.request_pallets), 0);
  const selectedTotalM2 = selectedTotalPallets * 134.4;

  // Calculate progress toward limit
  const totalRequestM2 = Number(summary.total_request_m2) + Number(selectedTotalM2);
  const limitM2 = Number(summary.limit_m2);
  const utilizationPct = Math.min(100, (totalRequestM2 / limitM2) * 100);
  const isNearLimit = utilizationPct > 80;
  const isOverLimit = totalRequestM2 > limitM2;

  return (
    <div className="rounded-xl border border-slate-600/50 bg-slate-800/30 backdrop-blur-xl overflow-hidden">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-10 rounded-full bg-slate-500" />
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              {t('orderBuilder.newFactoryRequest', 'Nueva Solicitud de Fábrica')}
              <span className="text-slate-500 font-normal">({summary.items.length})</span>
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {t('orderBuilder.factoryRequestDesc2', 'Para productos sin producción activa')}
              <span className="ml-1 text-blue-400">
                · {t('orderBuilder.minPerProduct', 'Mín: 1 contenedor por producto')}
              </span>
              {summary.submit_deadline_display && (
                <span className="ml-1 font-medium text-slate-300">
                  · {summary.submit_deadline_display}
                </span>
              )}
            </p>
          </div>
        </div>
        <span className={`text-slate-400 text-sm transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-slate-600/30">
          {/* Progress Bar - 60k limit */}
          <div className="pt-4 pb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">
                {t('orderBuilder.monthlyQuota', 'Cuota Mensual')}
              </span>
              <span className={`font-medium ${isOverLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-slate-300'}`}>
                {formatM2(totalRequestM2)} / {formatM2(limitM2)} m²
              </span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isOverLimit
                    ? 'bg-red-500'
                    : isNearLimit
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, utilizationPct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
              <span>{utilizationPct.toFixed(0)}% {t('orderBuilder.used', 'utilizado')}</span>
              <span>
                {t('orderBuilder.remaining', 'Restante')}: {formatM2(limitM2 - totalRequestM2)} m²
              </span>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3">
            {summary.items.map((item) => (
              <FactoryRequestCard
                key={item.product_id}
                item={item}
                isSelected={selectedItems.has(item.product_id)}
                quantity={itemQuantities[item.product_id] || item.request_pallets}
                onToggle={() => handleToggleItem(item)}
                onQuantityChange={(pallets) => handleQuantityChange(item, pallets)}
              />
            ))}
          </div>

          {/* Section Footer - Totals + Link to Factory Request Builder */}
          <div className="mt-4 pt-4 border-t border-slate-600/30">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">
                <span className="font-medium">
                  {t('orderBuilder.totalRequest', 'Total solicitud')}:
                </span>
                <span className="ml-2">
                  {formatM2(selectedTotalM2)} m² ({selectedTotalPallets} {t('common.pallets', 'paletas')})
                </span>
              </div>
              {factoryId && (
                <Link
                  to={`/factory-requests?factory_id=${factoryId}`}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {t('orderBuilder.openFactoryRequest', 'Ver solicitud de produccion')} →
                </Link>
              )}
            </div>
            {summary.estimated_ready && (
              <p className="text-xs text-slate-500 mt-2">
                {t('orderBuilder.estimatedReady', 'Listo estimado')}: {summary.estimated_ready}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Individual card component for factory request items
interface FactoryRequestCardProps {
  item: FactoryRequestItem;
  isSelected: boolean;
  quantity: number;
  onToggle: () => void;
  onQuantityChange: (pallets: number) => void;
}

function FactoryRequestCard({
  item,
  isSelected,
  quantity,
  onToggle,
  onQuantityChange,
}: FactoryRequestCardProps) {
  const { t } = useTranslation();
  const m2 = quantity * 134.4;

  const urgencyStyles: Record<string, { color: string; bg: string; label: string }> = {
    critical: { color: 'text-red-400', bg: 'bg-red-500/20', label: t('orderBuilder.urgency.critical', 'CRÍTICO') },
    urgent: { color: 'text-orange-400', bg: 'bg-orange-500/20', label: t('orderBuilder.urgency.urgent', 'URGENTE') },
    soon: { color: 'text-amber-400', bg: 'bg-amber-500/20', label: t('orderBuilder.urgency.soon', 'PRONTO') },
    ok: { color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'OK' },
  };
  const urgency = urgencyStyles[item.urgency] || urgencyStyles.ok;

  // Low-volume products get special styling
  const isLowVolume = item.is_low_volume;

  return (
    <div
      className={`rounded-lg border transition-all duration-200 ${
        isLowVolume
          ? 'border-amber-500/50 bg-amber-500/5'
          : isSelected
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600/50'
      }`}
    >
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Checkbox - disabled for low-volume */}
            <button
              onClick={onToggle}
              disabled={isLowVolume}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                isLowVolume
                  ? 'border-amber-500/50 bg-amber-500/10 cursor-not-allowed'
                  : isSelected
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-slate-500 hover:border-blue-500'
              }`}
            >
              {isSelected && !isLowVolume && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {isLowVolume && (
                <span className="text-amber-500 text-xs">!</span>
              )}
            </button>

            {/* Product Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-medium truncate">{item.sku}</h3>
                {isLowVolume ? (
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {t('orderBuilder.lowVolume', 'BAJO VOLUMEN')}
                  </span>
                ) : (
                  <>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${urgency.bg} ${urgency.color}`}>
                      {urgency.label}
                    </span>
                    {item.minimum_applied && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {t('orderBuilder.minimumApplied', '1 CTN MÍN')}
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="text-sm text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>
                  {t('orderBuilder.need', 'Necesita')}: {formatM2(Number(item.suggested_m2 || 0))} m²
                </span>
                <span className="text-slate-600">·</span>
                <span>
                  {t('orderBuilder.velocity', 'Velocidad')}: {Number(item.velocity_m2_day || 0).toFixed(1)} m²/d
                </span>
                {item.days_to_consume_container && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span className={item.is_low_volume ? 'text-amber-400' : 'text-slate-400'}>
                      1 CTN = {item.days_to_consume_container}d
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Request / Gap Badge */}
          <div className="flex-shrink-0 text-right">
            {isLowVolume ? (
              <>
                <div className="text-sm text-amber-400">
                  {t('orderBuilder.notRecommended', 'NO RECOMENDADO')}
                </div>
                <div className="text-xs text-slate-500">
                  {t('orderBuilder.specialOrderOnly', 'Solo pedido especial')}
                </div>
              </>
            ) : (
              <>
                <div className="text-sm text-slate-400">
                  {t('orderBuilder.request', 'Solicitud')}
                </div>
                <div className="text-lg font-bold text-emerald-400">
                  {item.request_pallets} p
                </div>
              </>
            )}
          </div>
        </div>

        {/* Low-volume warning */}
        {isLowVolume && item.low_volume_reason && (
          <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-2 text-xs text-amber-400">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{item.low_volume_reason}</span>
            </div>
          </div>
        )}

        {/* Target Boat Info - for non-low-volume items */}
        {!isLowVolume && item.target_boat && (
          <div className="mt-2 text-sm text-slate-400 flex items-center gap-2">
            <span className="text-slate-500">{t('orderBuilder.target', 'Destino')}:</span>
            <span className="text-emerald-400">
              {item.target_boat_departure
                ? new Date(item.target_boat_departure).toLocaleDateString('es', { month: 'short', day: 'numeric' })
                : ''} — {item.target_boat}
            </span>
            {item.arrival_date && (
              <>
                <span className="text-slate-600">→</span>
                <span>
                  {t('orderBuilder.arrives', 'Llega')} {new Date(item.arrival_date).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
                </span>
              </>
            )}
          </div>
        )}

        {/* Quantity Controls - Only show when selected and not low-volume */}
        {isSelected && !isLowVolume && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">{t('orderBuilder.request', 'SOLICITUD')}:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onQuantityChange(quantity - 1)}
                    className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => onQuantityChange(parseInt(e.target.value) || 0)}
                    className="w-16 h-8 rounded bg-slate-700 text-white text-center text-sm border-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => onQuantityChange(quantity + 1)}
                    className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-slate-400">
                  {t('common.pallets', 'paletas')} = {formatM2(m2)} m²
                </span>
              </div>

              {/* Consumption info */}
              {item.days_to_consume_container && (
                <div className="text-sm text-slate-400">
                  <span className="text-slate-500">
                    {t('orderBuilder.willConsume', 'Se consume en ~{{days}} días', { days: item.days_to_consume_container })}
                  </span>
                </div>
              )}
            </div>
            {/* Minimum Note */}
            {item.minimum_applied && item.minimum_note && (
              <div className="mt-2 flex items-center gap-2 text-xs text-blue-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{item.minimum_note}</span>
              </div>
            )}
          </div>
        )}

        {/* Compact Info - Show when not selected and not low-volume */}
        {!isSelected && !isLowVolume && (
          <div className="mt-2 text-sm text-slate-500">
            {t('orderBuilder.gapPallets', 'Brecha')}: {item.gap_pallets} {t('common.pallets', 'paletas')}
            <span className="mx-2">·</span>
            {t('orderBuilder.ready', 'Listo')}: {item.estimated_ready}
          </div>
        )}
      </div>
    </div>
  );
}
