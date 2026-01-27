import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BLAllocation, BLProductAllocation } from '../requests/orderBuilder';
import { CRITICAL_THRESHOLD } from '../requests/orderBuilder';

interface BLCardProps {
  bl: BLAllocation;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

/**
 * Collapsible card showing a single BL's products.
 * Critical products (score >= 85) are highlighted.
 */
export function BLCard({ bl, isExpanded = false, onToggleExpand }: BLCardProps) {
  const { t } = useTranslation();

  // Build customers string
  const customersStr = bl.primary_customers.length > 0
    ? bl.primary_customers.slice(0, 3).join(', ') +
      (bl.primary_customers.length > 3 ? ` +${bl.primary_customers.length - 3}` : '')
    : t('blAllocation.generalStock', 'General Stock');

  return (
    <div className="rounded-xl border border-slate-700/50 backdrop-blur-xl bg-slate-800/30 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={onToggleExpand}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Expand/Collapse Arrow */}
          <span
            className={`text-slate-400 text-sm transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}
          >
            ▶
          </span>

          {/* BL Number Badge */}
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <span className="text-indigo-400 font-bold">{bl.bl_number}</span>
          </div>

          {/* Title and Customers */}
          <div>
            <h3 className="text-white font-semibold">
              BL {bl.bl_number} — {customersStr}
            </h3>
            <div className="text-sm text-slate-400 mt-0.5">
              {bl.products.length} {t('blAllocation.products', 'products')}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          {/* Containers */}
          <div className="text-center">
            <div className="text-white font-semibold">{bl.total_containers}</div>
            <div className="text-slate-500 text-xs">{t('blAllocation.containers', 'cont.')}</div>
          </div>

          {/* Pallets */}
          <div className="text-center">
            <div className="text-white font-semibold">{bl.total_pallets}</div>
            <div className="text-slate-500 text-xs">{t('blAllocation.pallets', 'pallets')}</div>
          </div>

          {/* Critical Count */}
          {bl.critical_product_count > 0 && (
            <div className="text-center">
              <div className="text-red-400 font-semibold">{bl.critical_product_count}</div>
              <div className="text-slate-500 text-xs">{t('blAllocation.critical', 'critical')}</div>
            </div>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-700/30">
          {/* Column Headers */}
          <div className="px-5 py-2 bg-slate-900/30 grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <div className="col-span-5">{t('blAllocation.product', 'Product')}</div>
            <div className="col-span-2 text-center">{t('blAllocation.pallets', 'Pallets')}</div>
            <div className="col-span-2 text-center">m²</div>
            <div className="col-span-2">{t('blAllocation.customer', 'Customer')}</div>
            <div className="col-span-1 text-center">{t('blAllocation.score', 'Score')}</div>
          </div>

          {/* Product Rows */}
          <div className="divide-y divide-slate-700/30">
            {bl.products.map((product) => (
              <BLProductRow key={product.product_id} product={product} />
            ))}
          </div>

          {/* Subtotal */}
          <div className="px-5 py-3 bg-slate-900/50 border-t border-slate-700/30 grid grid-cols-12 gap-2 text-sm font-semibold">
            <div className="col-span-5 text-slate-300">{t('blAllocation.subtotal', 'SUBTOTAL')}</div>
            <div className="col-span-2 text-center text-white">{bl.total_pallets}</div>
            <div className="col-span-2 text-center text-white">
              {Math.round(bl.total_m2).toLocaleString()}
            </div>
            <div className="col-span-3"></div>
          </div>
        </div>
      )}
    </div>
  );
}

interface BLProductRowProps {
  product: BLProductAllocation;
}

/**
 * Single product row within a BL card.
 */
function BLProductRow({ product }: BLProductRowProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`
        px-5 py-3 grid grid-cols-12 gap-2 items-center text-sm
        ${product.is_critical
          ? 'bg-red-500/5 hover:bg-red-500/10'
          : 'hover:bg-white/5'
        }
        transition-colors
      `}
    >
      {/* SKU with Critical Indicator */}
      <div className="col-span-5 flex items-center gap-2">
        {product.is_critical && (
          <span className="text-red-400" title={t('blAllocation.criticalProduct', 'Critical product')}>
            🔴
          </span>
        )}
        <span className={`font-medium ${product.is_critical ? 'text-red-300' : 'text-white'}`}>
          {product.sku}
        </span>
      </div>

      {/* Pallets */}
      <div className="col-span-2 text-center text-slate-300">
        {product.pallets}
      </div>

      {/* M2 */}
      <div className="col-span-2 text-center text-slate-300">
        {Math.round(product.m2).toLocaleString()}
      </div>

      {/* Customer */}
      <div className="col-span-2 text-slate-400 truncate">
        {product.primary_customer || (
          <span className="text-slate-500 italic">
            ({t('blAllocation.general', 'General')})
          </span>
        )}
      </div>

      {/* Score */}
      <div className="col-span-1 text-center">
        <span
          className={`
            inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold
            ${product.score >= CRITICAL_THRESHOLD
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : product.score >= 50
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
            }
          `}
        >
          {product.score}
        </span>
      </div>
    </div>
  );
}
