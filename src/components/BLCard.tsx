import { useTranslation } from 'react-i18next';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import type { BLAllocation, BLProductAllocation } from '../requests/orderBuilder';
import { CRITICAL_THRESHOLD } from '../requests/orderBuilder';
import { formatM2 } from '../utils/formatters';
import { CONTAINER_MAX_WEIGHT_KG } from '../constants/inventory';

interface BLCardProps {
  bl: BLAllocation;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isEditMode?: boolean;
  activeProductId?: string | null;
}

/**
 * Collapsible card showing a single BL's products.
 * Critical products (score >= 85) are highlighted.
 * In edit mode, acts as a droppable zone for drag-and-drop.
 */
export function BLCard({
  bl,
  isExpanded = false,
  onToggleExpand,
  isEditMode = false,
  activeProductId = null,
}: BLCardProps) {
  const { t } = useTranslation();

  const { setNodeRef, isOver } = useDroppable({
    id: `bl-${bl.bl_number}`,
    disabled: !isEditMode,
  });

  // Build customers string
  const customersStr = bl.primary_customers.length > 0
    ? bl.primary_customers.slice(0, 3).join(', ') +
      (bl.primary_customers.length > 3 ? ` +${bl.primary_customers.length - 3}` : '')
    : t('blAllocation.generalStock', 'Stock General');

  // Weight constraint check
  const weightOverLimit = bl.total_weight_kg > CONTAINER_MAX_WEIGHT_KG;
  const weightPct = Math.round((bl.total_weight_kg / CONTAINER_MAX_WEIGHT_KG) * 100);

  return (
    <div
      ref={isEditMode ? setNodeRef : undefined}
      className={`
        rounded-xl border backdrop-blur-xl bg-slate-800/30 overflow-hidden transition-all duration-200
        ${isOver ? 'ring-2 ring-blue-500 bg-blue-500/10 border-blue-500/50' : 'border-slate-700/50'}
        ${isEditMode ? 'border-dashed' : ''}
      `}
    >
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
            {'\u25B6'}
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
              {bl.products.length} {t('blAllocation.products', 'productos')}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          {/* Weight indicator in edit mode */}
          {isEditMode && (
            <div className="text-center">
              <div className={`font-semibold ${weightOverLimit ? 'text-red-400' : 'text-white'}`}>
                {Math.round(bl.total_weight_kg).toLocaleString()} kg
              </div>
              <div className={`text-xs ${weightOverLimit ? 'text-red-400' : weightPct >= 90 ? 'text-amber-400' : 'text-slate-500'}`}>
                {weightPct}% de {CONTAINER_MAX_WEIGHT_KG.toLocaleString()} kg
              </div>
            </div>
          )}

          {/* Containers */}
          <div className="text-center">
            <div className="text-white font-semibold">{bl.total_containers}</div>
            <div className="text-slate-500 text-xs">{t('blAllocation.containers', 'cont')}</div>
          </div>

          {/* Pallets */}
          <div className="text-center">
            <div className="text-white font-semibold">{bl.total_pallets}</div>
            <div className="text-slate-500 text-xs">{t('blAllocation.pallets', 'paletas')}</div>
          </div>

          {/* Critical Count */}
          {bl.critical_product_count > 0 && (
            <div className="text-center">
              <div className="text-red-400 font-semibold">{bl.critical_product_count}</div>
              <div className="text-slate-500 text-xs">{t('blAllocation.critical', 'críticos')}</div>
            </div>
          )}
        </div>
      </button>

      {/* Weight warning bar */}
      {isEditMode && weightOverLimit && (
        <div className="px-5 py-2 bg-red-500/10 border-t border-red-500/30 flex items-center gap-2">
          <span className="text-red-400 text-sm font-semibold">
            {t('blAllocation.weightExceeds', 'Peso excede')} {CONTAINER_MAX_WEIGHT_KG.toLocaleString()} kg {t('blAllocation.by', 'por')}{' '}
            {Math.round(bl.total_weight_kg - CONTAINER_MAX_WEIGHT_KG).toLocaleString()} kg
          </span>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-700/30">
          {/* Column Headers */}
          <div className={`px-5 py-2 bg-slate-900/30 grid gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide ${isEditMode ? 'grid-cols-13' : 'grid-cols-12'}`}>
            {isEditMode && <div className="col-span-1"></div>}
            <div className="col-span-5">{t('blAllocation.product', 'Producto')}</div>
            <div className="col-span-2 text-center">{t('blAllocation.pallets', 'Paletas')}</div>
            <div className="col-span-2 text-center">m{'\u00B2'}</div>
            <div className="col-span-2">{t('blAllocation.customer', 'Cliente')}</div>
            <div className="col-span-1 text-center">{t('blAllocation.score', 'Puntaje')}</div>
          </div>

          {/* Product Rows */}
          <div className="divide-y divide-slate-700/30">
            {bl.products.map((product) => (
              isEditMode ? (
                <DraggableProductRow
                  key={product.product_id}
                  blNumber={bl.bl_number}
                  product={product}
                  isDraggedAway={activeProductId === product.product_id}
                />
              ) : (
                <BLProductRow key={product.product_id} product={product} />
              )
            ))}
          </div>

          {/* Drop zone hint when empty in edit mode */}
          {isEditMode && bl.products.length === 0 && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm italic border-t border-slate-700/30">
              {t('blAllocation.dropHere', 'Arrastra productos aquí')}
            </div>
          )}

          {/* Subtotal */}
          <div className={`px-5 py-3 bg-slate-900/50 border-t border-slate-700/30 grid gap-2 text-sm font-semibold ${isEditMode ? 'grid-cols-13' : 'grid-cols-12'}`}>
            {isEditMode && <div className="col-span-1"></div>}
            <div className="col-span-5 text-slate-300">{t('blAllocation.subtotal', 'SUBTOTAL')}</div>
            <div className="col-span-2 text-center text-white">{bl.total_pallets}</div>
            <div className="col-span-2 text-center text-white">
              {formatM2(bl.total_m2)}
            </div>
            <div className="col-span-3"></div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DraggableProductRowProps {
  blNumber: number;
  product: BLProductAllocation;
  isDraggedAway: boolean;
}

/**
 * Draggable product row used in edit mode.
 */
function DraggableProductRow({ blNumber, product, isDraggedAway }: DraggableProductRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${blNumber}-${product.product_id}`,
    data: { product, blNumber },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`
        px-5 py-3 grid grid-cols-13 gap-2 items-center text-sm transition-all
        ${product.is_critical
          ? 'bg-red-500/5 hover:bg-red-500/10'
          : 'hover:bg-white/5'
        }
        ${isDragging || isDraggedAway ? 'opacity-30' : 'opacity-100'}
      `}
    >
      {/* Drag Handle */}
      <div
        {...listeners}
        className="col-span-1 flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
        </svg>
      </div>

      {/* SKU with Critical Indicator */}
      <div className="col-span-5 flex items-center gap-2">
        {product.is_critical && (
          <span className="text-red-400" title="Producto cr\u00EDtico">
            {'\uD83D\uDD34'}
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
        {formatM2(product.m2)}
      </div>

      {/* Customer */}
      <div className="col-span-2 text-slate-400 truncate">
        {product.primary_customer || (
          <span className="text-slate-500 italic">(General)</span>
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

interface BLProductRowProps {
  product: BLProductAllocation;
}

/**
 * Single product row within a BL card (read-only mode).
 */
function BLProductRow({ product }: BLProductRowProps) {
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
          <span className="text-red-400" title="Producto cr\u00EDtico">
            {'\uD83D\uDD34'}
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
        {formatM2(product.m2)}
      </div>

      {/* Customer */}
      <div className="col-span-2 text-slate-400 truncate">
        {product.primary_customer || (
          <span className="text-slate-500 italic">(General)</span>
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

/**
 * Standalone product row for the DragOverlay (ghost preview).
 * Not connected to any DnD hooks — just renders the visual.
 */
export function DragOverlayProductRow({ product }: { product: BLProductAllocation }) {
  return (
    <div
      className="px-5 py-3 grid grid-cols-12 gap-2 items-center text-sm bg-slate-800 border border-blue-500/50 rounded-lg shadow-lg shadow-blue-500/20"
    >
      {/* SKU */}
      <div className="col-span-5 flex items-center gap-2">
        {product.is_critical && (
          <span className="text-red-400">{'\uD83D\uDD34'}</span>
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
        {formatM2(product.m2)}
      </div>

      {/* Customer */}
      <div className="col-span-2 text-slate-400 truncate">
        {product.primary_customer || (
          <span className="text-slate-500 italic">(General)</span>
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
