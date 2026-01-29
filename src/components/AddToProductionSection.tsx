import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AddToProductionSummary, AddToProductionItem } from '../requests/orderBuilder';

interface AddToProductionSectionProps {
  summary: AddToProductionSummary | null;
  onItemSelect?: (item: AddToProductionItem, selected: boolean) => void;
  onItemQuantityChange?: (item: AddToProductionItem, pallets: number) => void;
}

export function AddToProductionSection({
  summary,
  onItemSelect,
  onItemQuantityChange,
}: AddToProductionSectionProps) {
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
        quantities[item.product_id] = item.suggested_additional_pallets;
      });
    return quantities;
  });

  if (!summary || summary.items.length === 0) {
    return null;
  }

  const handleToggleItem = (item: AddToProductionItem) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(item.product_id)) {
      newSelected.delete(item.product_id);
    } else {
      newSelected.add(item.product_id);
      // Initialize quantity if not set
      if (!itemQuantities[item.product_id]) {
        setItemQuantities((prev) => ({
          ...prev,
          [item.product_id]: item.suggested_additional_pallets,
        }));
      }
    }
    setSelectedItems(newSelected);
    onItemSelect?.(item, newSelected.has(item.product_id));
  };

  const handleQuantityChange = (item: AddToProductionItem, pallets: number) => {
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
    .reduce((sum, item) => sum + (itemQuantities[item.product_id] || item.suggested_additional_pallets), 0);
  const selectedTotalM2 = selectedTotalPallets * 134.4;

  return (
    <div className="rounded-xl border border-amber-500/50 bg-amber-900/20 backdrop-blur-xl overflow-hidden">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-10 rounded-full bg-amber-500" />
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-amber-400">⚠️</span>
              {t('orderBuilder.actionRequired', 'ACTION REQUIRED')}
              <span className="text-slate-500 font-normal">({summary.items.length})</span>
              {summary.has_critical_items && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                  {t('orderBuilder.criticalItems', 'Critical items')}
                </span>
              )}
            </h2>
            <p className="text-sm text-amber-400/80 mt-0.5">
              {t('orderBuilder.addToProductionDesc2', 'Piggyback on scheduled items')}
              {summary.action_deadline_display && (
                <span className="ml-1 font-medium text-amber-300">
                  · {t('orderBuilder.actBy', 'Act by')} {summary.action_deadline_display}
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
        <div className="px-5 pb-5 border-t border-amber-500/30">
          <div className="pt-4 space-y-3">
            {summary.items.map((item) => (
              <AddToProductionCard
                key={item.product_id}
                item={item}
                isSelected={selectedItems.has(item.product_id)}
                quantity={itemQuantities[item.product_id] || item.suggested_additional_pallets}
                onToggle={() => handleToggleItem(item)}
                onQuantityChange={(pallets) => handleQuantityChange(item, pallets)}
              />
            ))}
          </div>

          {/* Section Footer - Totals */}
          <div className="mt-4 pt-4 border-t border-amber-500/30">
            <div className="flex items-center justify-between">
              <div className="text-sm text-amber-300">
                <span className="font-medium">
                  {t('orderBuilder.totalToAdd', 'Total to add')}:
                </span>
                <span className="ml-2">
                  {selectedTotalM2.toLocaleString()} m² ({selectedTotalPallets} {t('common.pallets', 'pallets')})
                </span>
              </div>
              {selectedItems.size > 0 && (
                <button className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors">
                  {t('orderBuilder.exportAddRequest', 'Export Add Request')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual card component for add-to-production items
interface AddToProductionCardProps {
  item: AddToProductionItem;
  isSelected: boolean;
  quantity: number;
  onToggle: () => void;
  onQuantityChange: (pallets: number) => void;
}

function AddToProductionCard({
  item,
  isSelected,
  quantity,
  onToggle,
  onQuantityChange,
}: AddToProductionCardProps) {
  const { t } = useTranslation();
  const m2 = quantity * 134.4;

  return (
    <div
      className={`rounded-lg border transition-all duration-200 ${
        isSelected
          ? 'border-amber-500 bg-amber-500/10'
          : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50'
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
                  ? 'bg-amber-500 border-amber-500'
                  : 'border-slate-500 hover:border-amber-500'
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
                {item.is_critical && (
                  <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                    {t('orderBuilder.critical', 'CRITICAL')} {item.score}
                  </span>
                )}
                {!item.is_critical && item.score >= 70 && (
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                    {t('orderBuilder.high', 'HIGH')} {item.score}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                {t('orderBuilder.currentlyScheduled', 'Currently scheduled')}:{' '}
                <span className="text-slate-300">{item.current_requested_m2.toLocaleString()} m²</span>
              </p>
            </div>
          </div>

          {/* Score Badge */}
          <div className="flex-shrink-0">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold ${
                item.is_critical
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : item.score >= 70
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-700/50 text-slate-300 border border-slate-600/30'
              }`}
            >
              {item.score}
            </div>
          </div>
        </div>

        {/* Quantity Controls - Only show when selected */}
        {isSelected && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">{t('orderBuilder.add', 'ADD')}:</span>
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
                    className="w-16 h-8 rounded bg-slate-700 text-white text-center text-sm border-none focus:ring-2 focus:ring-amber-500"
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
              {item.target_boat && (
                <div className="text-sm text-slate-400">
                  <span className="text-emerald-400">{t('orderBuilder.ready', 'Ready')}: ~{item.estimated_ready_date}</span>
                  <span className="mx-1">→</span>
                  <span className="text-blue-400">{t('orderBuilder.ships', 'Ships')}: {item.target_boat}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compact Info - Show when not selected */}
        {!isSelected && (
          <div className="mt-2 flex items-center gap-4 text-sm text-slate-400">
            <span>
              {t('orderBuilder.systemSuggests', 'System suggests')}: {item.suggested_total_m2.toLocaleString()} m²
            </span>
            <span className="text-amber-400">
              +{item.suggested_additional_m2.toLocaleString()} m² ({item.suggested_additional_pallets}p)
            </span>
            {item.target_boat && (
              <span className="text-emerald-400">
                → {item.target_boat}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
