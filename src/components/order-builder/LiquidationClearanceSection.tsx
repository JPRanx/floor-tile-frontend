import { useState } from 'react';
import type { LiquidationClearanceProduct } from '../../requests/orderBuilder';

interface LiquidationClearanceSectionProps {
  products: LiquidationClearanceProduct[];
}

export function LiquidationClearanceSection({ products }: LiquidationClearanceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (products.length === 0) return null;

  return (
    <div className="rounded-xl border backdrop-blur-xl bg-amber-900/20 border-amber-500/30">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 rounded-full bg-amber-400" />
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              Liquidation Clearance
              <span className="text-slate-500 font-normal">({products.length})</span>
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Deactivated products with factory stock — clear them out
            </p>
          </div>
        </div>
        <span className={`text-slate-400 text-sm transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Cards */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-amber-500/20 pt-4">
          {products.map((product) => (
            <div
              key={product.product_id}
              className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">{product.sku}</div>
                  {product.description && (
                    <div className="text-xs text-slate-500">{product.description}</div>
                  )}
                  <div className="text-sm text-slate-400 mt-1">
                    SIESA: {product.factory_available_m2.toLocaleString()} m²
                    {product.factory_lot_count > 0 && ` (${product.factory_lot_count} lots)`}
                  </div>
                  {product.warehouse_m2 > 0 && (
                    <div className="text-sm text-slate-500">
                      Warehouse: {product.warehouse_m2.toLocaleString()} m²
                    </div>
                  )}
                  <div className="text-sm text-amber-400 mt-1">
                    Suggested: {product.suggested_pallets} pallets ({product.suggested_m2.toLocaleString()} m²)
                  </div>
                  {product.days_since_last_sale !== null && (
                    <div className="text-xs text-slate-500 mt-1">
                      Last sale: {product.days_since_last_sale} days ago
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 ml-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {product.inactive_reason || 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
