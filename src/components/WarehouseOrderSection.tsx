import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { WarehouseOrderSummary, OrderBuilderProduct } from '../requests/orderBuilder';
import { OrderBuilderProductCard } from './OrderBuilderProductCard';

// Extended product type with selected_m2 for two-way input sync
interface OrderBuilderProductWithM2 extends OrderBuilderProduct {
  selected_m2: number;
}

interface WarehouseOrderSectionProps {
  summary: WarehouseOrderSummary | null;
  products: OrderBuilderProductWithM2[];
  onToggleSelect: (productId: string) => void;
  onQuantityChange: (productId: string, pallets: number) => void;
  onM2Change: (productId: string, m2: number) => void;
  onAllocateToBLs?: () => void;
  blLoading?: boolean;
  onRemove?: (sku: string) => void;
  removedSkus?: Set<string>;
}

export function WarehouseOrderSection({
  summary,
  products,
  onToggleSelect,
  onQuantityChange,
  onM2Change,
  onAllocateToBLs,
  blLoading,
  onRemove,
  removedSkus = new Set(),
}: WarehouseOrderSectionProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);

  // Show ALL products - this is the main inventory view
  const allProducts = products;

  // Products that can be shipped (have factory stock)
  const shippableProducts = products.filter(
    (p) => p.factory_available_m2 && p.factory_available_m2 > 0
  );

  const selectedProducts = allProducts.filter((p) => p.is_selected);
  const selectedCount = selectedProducts.length;
  const totalPallets = selectedProducts.reduce((sum, p) => sum + p.selected_pallets, 0);
  const totalM2 = totalPallets * 134.4;

  // Group ALL products by priority for display
  const productsByPriority = {
    high_priority: allProducts.filter((p) => p.priority === 'HIGH_PRIORITY'),
    consider: allProducts.filter((p) => p.priority === 'CONSIDER'),
    well_covered: allProducts.filter((p) => p.priority === 'WELL_COVERED'),
    your_call: allProducts.filter((p) => p.priority === 'YOUR_CALL'),
  };

  const priorityConfig = [
    {
      key: 'high_priority' as const,
      label: t('orderBuilder.highPriority', 'High Priority'),
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    },
    {
      key: 'consider' as const,
      label: t('orderBuilder.consider', 'Consider'),
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
    },
    {
      key: 'well_covered' as const,
      label: t('orderBuilder.wellCovered', 'Well Covered'),
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
    },
    {
      key: 'your_call' as const,
      label: t('orderBuilder.yourCall', 'Your Call'),
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-500/30',
    },
  ];

  if (allProducts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-emerald-500/50 bg-emerald-900/20 backdrop-blur-xl overflow-hidden">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-10 rounded-full bg-emerald-500" />
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              {t('orderBuilder.inventoryStatus', 'Inventory Status')}
              <span className="text-slate-500 font-normal">({allProducts.length})</span>
              {shippableProducts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {shippableProducts.length} {t('orderBuilder.canShip', 'can ship')}
                </span>
              )}
              {selectedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {selectedCount} {t('common.selected', 'selected')}
                </span>
              )}
            </h2>
            <p className="text-sm text-emerald-400/80 mt-0.5">
              {t('orderBuilder.inventoryStatusDesc', 'All products with stock levels and shipping status')}
              {summary?.boat_name && (
                <span className="ml-1 text-slate-400">· {summary.boat_name}</span>
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
        <div className="px-5 pb-5 border-t border-emerald-500/30">
          {/* Summary Stats */}
          {selectedCount > 0 && (
            <div className="pt-4 grid grid-cols-4 gap-4 text-center">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-emerald-400">{totalPallets}</div>
                <div className="text-xs text-slate-400">{t('common.pallets', 'pallets')}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-emerald-400">
                  {Math.ceil(totalPallets / 14)}
                </div>
                <div className="text-xs text-slate-400">{t('common.containers', 'containers')}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-lg font-bold text-emerald-400">{totalM2.toLocaleString()}</div>
                <div className="text-xs text-slate-400">m²</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-lg font-bold text-slate-300">{summary?.bl_count || 1}</div>
                <div className="text-xs text-slate-400">{t('blAllocation.bls', 'BLs')}</div>
              </div>
            </div>
          )}

          {/* Products by Priority */}
          <div className="pt-4 space-y-4">
            {priorityConfig.map(({ key, label, color, bgColor }) => {
              const categoryProducts = productsByPriority[key];
              if (categoryProducts.length === 0) return null;

              const categorySelected = categoryProducts.filter((p) => p.is_selected).length;

              return (
                <div key={key}>
                  {/* Priority Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-medium ${color}`}>{label}</span>
                    <span className="text-xs text-slate-500">({categoryProducts.length})</span>
                    {categorySelected > 0 && (
                      <span className={`px-1.5 py-0.5 rounded text-xs ${bgColor} ${color}`}>
                        {categorySelected} {t('common.selected', 'selected')}
                      </span>
                    )}
                  </div>

                  {/* Product Cards */}
                  <div className="space-y-2">
                    {categoryProducts.map((product) => (
                      <OrderBuilderProductCard
                        key={product.product_id}
                        product={product}
                        onToggleSelect={onToggleSelect}
                        onQuantityChange={onQuantityChange}
                        onM2Change={onM2Change}
                        onRemove={onRemove}
                        isRemoved={removedSkus.has(product.sku)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section Footer - Actions */}
          {selectedCount > 0 && (
            <div className="mt-4 pt-4 border-t border-emerald-500/30">
              <div className="flex items-center justify-between">
                <div className="text-sm text-emerald-300">
                  <span className="font-medium">{t('orderBuilder.readyToShip', 'Ready to ship')}:</span>
                  <span className="ml-2">
                    {totalM2.toLocaleString()} m² ({totalPallets} {t('common.pallets', 'pallets')})
                  </span>
                </div>
                {onAllocateToBLs && (
                  <button
                    onClick={onAllocateToBLs}
                    disabled={blLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {blLoading
                      ? t('blAllocation.allocating', 'Allocating...')
                      : t('blAllocation.allocateToBLs', 'Allocate to BLs')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
