import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FactoryRequestSummary, FactoryRequestItem } from '../requests/orderBuilder';

interface FactoryRequestSectionProps {
  summary: FactoryRequestSummary | null;
  onItemSelect?: (item: FactoryRequestItem, selected: boolean) => void;
  onItemQuantityChange?: (item: FactoryRequestItem, pallets: number) => void;
}

export function FactoryRequestSection({
  summary,
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
        quantities[item.product_id] = item.gap_pallets;
      });
    return quantities;
  });

  if (!summary || summary.items.length === 0) {
    return null;
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
          [item.product_id]: item.gap_pallets,
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
    .reduce((sum, item) => sum + (itemQuantities[item.product_id] || item.gap_pallets), 0);
  const selectedTotalM2 = selectedTotalPallets * 134.4;

  // Calculate progress toward limit
  const totalRequestM2 = summary.total_request_m2 + Number(selectedTotalM2);
  const limitM2 = summary.limit_m2;
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
              {t('orderBuilder.newFactoryRequest', 'New Factory Request')}
              <span className="text-slate-500 font-normal">({summary.items.length})</span>
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {t('orderBuilder.factoryRequestDesc2', 'For products not currently in production')}
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
                {t('orderBuilder.monthlyQuota', 'Monthly Quota')}
              </span>
              <span className={`font-medium ${isOverLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-slate-300'}`}>
                {totalRequestM2.toLocaleString()} / {limitM2.toLocaleString()} m²
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
              <span>{utilizationPct.toFixed(0)}% {t('orderBuilder.used', 'used')}</span>
              <span>
                {t('orderBuilder.remaining', 'Remaining')}: {(limitM2 - totalRequestM2).toLocaleString()} m²
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
                quantity={itemQuantities[item.product_id] || item.gap_pallets}
                onToggle={() => handleToggleItem(item)}
                onQuantityChange={(pallets) => handleQuantityChange(item, pallets)}
              />
            ))}
          </div>

          {/* Section Footer - Totals */}
          <div className="mt-4 pt-4 border-t border-slate-600/30">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">
                <span className="font-medium">
                  {t('orderBuilder.totalRequest', 'Total request')}:
                </span>
                <span className="ml-2">
                  {selectedTotalM2.toLocaleString()} m² ({selectedTotalPallets} {t('common.pallets', 'pallets')})
                </span>
              </div>
              {selectedItems.size > 0 && (
                <button className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium rounded-lg transition-colors">
                  {t('orderBuilder.exportFactoryRequest', 'Export Factory Request')}
                </button>
              )}
            </div>
            {selectedItems.size > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                {t('orderBuilder.estimatedReady', 'Estimated ready')}: {summary.estimated_ready}
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
    critical: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'CRITICAL' },
    urgent: { color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'URGENT' },
    soon: { color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'SOON' },
    ok: { color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'OK' },
  };
  const urgency = urgencyStyles[item.urgency] || urgencyStyles.ok;

  return (
    <div
      className={`rounded-lg border transition-all duration-200 ${
        isSelected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600/50'
      }`}
    >
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Checkbox */}
            <button
              onClick={onToggle}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-slate-500 hover:border-blue-500'
              }`}
            >
              {isSelected && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>

            {/* Product Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-medium truncate">{item.sku}</h3>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${urgency.bg} ${urgency.color}`}>
                  {urgency.label}
                </span>
                {item.minimum_applied && (
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {t('orderBuilder.minimumApplied', '1 CTN MIN')}
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>
                  {t('orderBuilder.need', 'Need')}: {item.suggested_m2.toLocaleString()} m²
                </span>
                <span className="text-slate-600">·</span>
                <span>
                  {t('orderBuilder.siesa', 'SIESA')}: {item.factory_available_m2.toLocaleString()} m²
                </span>
                {item.in_production_m2 > 0 && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span className="text-blue-400">
                      {t('orderBuilder.inProduction', 'In Production')}: {item.in_production_m2.toLocaleString()} m²
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Gap Badge */}
          <div className="flex-shrink-0 text-right">
            <div className="text-sm text-slate-400">
              {t('orderBuilder.gap', 'Gap')}
            </div>
            <div className={`text-lg font-bold ${urgency.color}`}>
              {item.gap_m2.toLocaleString()} m²
            </div>
          </div>
        </div>

        {/* Quantity Controls - Only show when selected */}
        {isSelected && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">{t('orderBuilder.request', 'REQUEST')}:</span>
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
                  {t('common.pallets', 'pallets')} = {m2.toLocaleString()} m²
                </span>
              </div>

              {/* Timing */}
              <div className="text-sm text-slate-400">
                <span className="text-slate-500">
                  {t('orderBuilder.estimatedReady', 'Estimated ready')}: ~{item.estimated_ready}
                </span>
              </div>
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

        {/* Compact Info - Show when not selected */}
        {!isSelected && (
          <div className="mt-2 text-sm text-slate-500">
            {t('orderBuilder.gapPallets', 'Gap')}: {item.gap_pallets} {t('common.pallets', 'pallets')}
            <span className="mx-2">·</span>
            {t('orderBuilder.ready', 'Ready')}: ~{item.estimated_ready}
          </div>
        )}
      </div>
    </div>
  );
}
