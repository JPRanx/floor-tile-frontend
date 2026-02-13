import { useState } from 'react';
import type { LiquidationProduct } from '../../requests/products';

interface LiquidationSectionProps {
  products: LiquidationProduct[];
}

export function LiquidationSection({ products }: LiquidationSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-4 border-b border-slate-700/50 cursor-pointer hover:bg-slate-800/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              Liquidation Tracking
            </h2>
            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border bg-amber-500/20 text-amber-400 border-amber-500/30">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </span>
          </div>
          <button className="text-slate-400 hover:text-white transition-colors">
            <svg
              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Table */}
      {isExpanded && (
        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Remaining m²
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Days Since Last Sale
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{product.sku}</div>
                    {product.rotation && (
                      <div className="text-xs text-slate-500">{product.rotation}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    {product.category}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-amber-400 font-medium">
                    {product.warehouse_m2.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-400">
                    {product.days_since_last_sale !== null
                      ? `${product.days_since_last_sale} days`
                      : 'No sales'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
