import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { WarehouseOrderSummary, OrderBuilderProduct } from '../requests/orderBuilder';
import { OrderBuilderProductCard } from './OrderBuilderProductCard';
import { formatM2 } from '../utils/formatters';

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
  const [showNoSiesa, setShowNoSiesa] = useState(false);

  // Split products by SIESA availability
  const withSiesa = products.filter((p) => p.factory_available_m2 > 0);
  const withoutSiesa = products.filter((p) => !p.factory_available_m2 || p.factory_available_m2 <= 0);

  const selectedProducts = products.filter((p) => p.is_selected);
  const selectedCount = selectedProducts.length;
  const totalPallets = selectedProducts.reduce((sum, p) => sum + p.selected_pallets, 0);
  const totalM2 = totalPallets * 134.4;

  // Group products WITH SIESA stock by priority for display
  const productsByPriority = {
    high_priority: withSiesa.filter((p) => p.priority === 'HIGH_PRIORITY'),
    consider: withSiesa.filter((p) => p.priority === 'CONSIDER'),
    well_covered: withSiesa.filter((p) => p.priority === 'WELL_COVERED'),
    your_call: withSiesa.filter((p) => p.priority === 'YOUR_CALL'),
  };

  const priorityConfig = [
    {
      key: 'high_priority' as const,
      label: t('orderBuilder.highPriority', 'Alta Prioridad'),
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      key: 'consider' as const,
      label: t('orderBuilder.consider', 'Considerar'),
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      key: 'well_covered' as const,
      label: t('orderBuilder.wellCovered', 'Bien Cubierto'),
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      key: 'your_call' as const,
      label: t('orderBuilder.yourCall', 'Tu Decisión'),
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10',
    },
  ];

  if (products.length === 0) {
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
              {t('orderBuilder.warehouseOrder', 'Pedido de Bodega')}
              <span className="text-slate-500 font-normal">({withSiesa.length})</span>
              {selectedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {selectedCount} {t('common.selected', 'seleccionados')}
                </span>
              )}
            </h2>
            <p className="text-sm text-emerald-400/80 mt-0.5">
              {t('orderBuilder.warehouseOrderDesc', 'Enviar desde inventario SIESA en barco seleccionado')}
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
                <div className="text-xs text-slate-400">{t('common.pallets', 'paletas')}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-emerald-400">
                  {Math.ceil(totalPallets / 14)}
                </div>
                <div className="text-xs text-slate-400">{t('common.containers', 'contenedores')}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-lg font-bold text-emerald-400">{formatM2(totalM2)}</div>
                <div className="text-xs text-slate-400">m²</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-lg font-bold text-slate-300">{summary?.bl_count || 1}</div>
                <div className="text-xs text-slate-400">{t('blAllocation.bls', 'BLs')}</div>
              </div>
            </div>
          )}

          {/* Products WITH SIESA stock — by Priority */}
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
                        {categorySelected} {t('common.selected', 'seleccionados')}
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

          {/* Products WITHOUT SIESA stock — collapsible */}
          {withoutSiesa.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700/30">
              <button
                onClick={() => setShowNoSiesa(!showNoSiesa)}
                className="flex items-center gap-2 w-full text-left group"
              >
                <span className={`text-slate-500 text-xs transition-transform duration-200 ${showNoSiesa ? 'rotate-90' : ''}`}>
                  ▶
                </span>
                <span className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">
                  {t('orderBuilder.noSiesaStock', 'Sin stock SIESA')}
                  <span className="ml-1">
                    ({withoutSiesa.length} {withoutSiesa.length === 1
                      ? t('orderBuilder.product', 'producto')
                      : t('orderBuilder.products', 'productos')})
                  </span>
                </span>
              </button>

              {showNoSiesa && (
                <div className="mt-3 space-y-2 opacity-70">
                  {withoutSiesa.map((product) => (
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
              )}
            </div>
          )}

          {/* Section Footer - Actions */}
          {selectedCount > 0 && (
            <div className="mt-4 pt-4 border-t border-emerald-500/30">
              <div className="flex items-center justify-between">
                <div className="text-sm text-emerald-300">
                  <span className="font-medium">{t('orderBuilder.readyToShip', 'Listo para enviar')}:</span>
                  <span className="ml-2">
                    {formatM2(totalM2)} m² ({totalPallets} {t('common.pallets', 'paletas')})
                  </span>
                </div>
                {onAllocateToBLs && (
                  <button
                    onClick={onAllocateToBLs}
                    disabled={blLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {blLoading
                      ? t('blAllocation.allocating', 'Asignando...')
                      : t('blAllocation.allocateToBLs', 'Asignar a BLs')}
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
