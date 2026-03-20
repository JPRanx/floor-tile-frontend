import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BoatProjection, DraftBLItem, DraftStatus, ProductProjection, StabilityImpact } from '../../requests/planning';
import { ConfidenceDots } from './ConfidenceDots';
import { formatDateShort } from '../../utils/dateUtils';

interface BoatCardProps {
  projection: BoatProjection;
  onDrillIn: (boatId: string) => void;
  onPreview?: (boatId: string) => void;
  onQuickAccept?: (projection: BoatProjection) => void;
  onExport?: (boatId: string) => void;
  isAccepting?: boolean;
  /** Render in compact mode for completed/ordered boats */
  compact?: boolean;
  /** Highlight as focal boat (timeline synced to this card) */
  isSelected?: boolean;
  /** Called when card is clicked to set it as the focal boat */
  onSelect?: () => void;
}

const DRAFT_BADGE_CONFIG: Record<DraftStatus, { label: string; classes: string }> = {
  drafting: {
    label: 'planning.draftStatus.drafting',
    classes: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  },
  action_needed: {
    label: 'planning.draftStatus.action_needed',
    classes: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  },
  ordered: {
    label: 'planning.draftStatus.ordered',
    classes: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  confirmed: {
    label: 'planning.draftStatus.confirmed',
    classes: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  skipped: {
    label: 'planning.draftStatus.skipped',
    classes: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function translateReviewReason(reason: string, t: any): string {
  const knownKeys: Record<string, string> = {
    'draft_needs_review': 'planning.reviewReason.needsReview',
    'earlier_draft_modified': 'planning.reviewReason.earlierModified',
    'earlier_draft_deleted': 'planning.reviewReason.earlierDeleted',
    'data_freshness': 'planning.reviewReason.dataFreshness',
  };
  const key = knownKeys[reason];
  return key ? t(key) : reason;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function translateDraftContext(ctx: string, t: any): string {
  if (ctx.startsWith('based_on_single:')) {
    const parts = ctx.split(':');
    return t('planning.draftContext.basedOnSingle', { boat: parts[1], pallets: parts[2] });
  }
  if (ctx.startsWith('based_on_multiple:')) {
    const parts = ctx.split(':');
    return t('planning.draftContext.basedOnMultiple', { count: parts[1], pallets: parts[2] });
  }
  return ctx;
}

const MAX_VISIBLE_PRODUCTS = 4;

function ProductList({
  products,
  showAll,
  onToggle,
}: {
  products: ProductProjection[];
  showAll: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  // Only show products that can actually ship (matches OB selection)
  const shippable = products.filter((p) => (p.shippable_pallets ?? p.suggested_pallets) > 0);
  const priorityProducts = shippable.filter(
    (p) => p.urgency === 'critical' || p.urgency === 'urgent'
  );
  const otherProducts = shippable.filter(
    (p) => p.urgency !== 'critical' && p.urgency !== 'urgent'
  );

  const visibleOthers = showAll ? otherProducts : otherProducts.slice(0, Math.max(0, MAX_VISIBLE_PRODUCTS - priorityProducts.length));
  const hiddenCount = showAll ? 0 : otherProducts.length - visibleOthers.length;

  if (shippable.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
        {t('planning.products')}
      </div>
      <div className="space-y-0.5">
        {priorityProducts.map((p) => (
          <ProductRow key={p.product_id} product={p} />
        ))}
        {visibleOthers.map((p) => (
          <ProductRow key={p.product_id} product={p} />
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          {t('planning.showMore', { count: hiddenCount })}
        </button>
      )}
      {showAll && otherProducts.length > MAX_VISIBLE_PRODUCTS - priorityProducts.length && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          {t('planning.showLess')}
        </button>
      )}
    </div>
  );
}

function ProductRow({ product }: { product: ProductProjection }) {
  const pallets = product.shippable_pallets ?? product.suggested_pallets;
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${URGENCY_DOT[product.urgency] || 'bg-slate-500'}`} />
        <span className={`text-xs truncate ${URGENCY_TEXT[product.urgency] || 'text-slate-400'}`}>
          {product.sku}
        </span>
      </div>
      {pallets > 0 && (
        <span className="text-[11px] text-slate-500 flex-shrink-0">
          {pallets}p
        </span>
      )}
    </div>
  );
}

function BLGroupedList({ items }: { items: DraftBLItem[] }) {
  // Group by bl_number
  const groups = new Map<number, DraftBLItem[]>();
  for (const item of items) {
    const list = groups.get(item.bl_number) || [];
    list.push(item);
    groups.set(item.bl_number, list);
  }

  return (
    <div className="space-y-2">
      {Array.from(groups.entries())
        .sort(([a], [b]) => a - b)
        .map(([blNum, products]) => (
          <div key={blNum}>
            <div className="text-[11px] text-indigo-400/80 font-semibold uppercase tracking-wider mb-0.5">
              BL {blNum}
            </div>
            <div className="space-y-0.5 pl-2 border-l border-indigo-500/20">
              {products.map((p) => (
                <div key={p.product_id} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="text-xs text-slate-400 truncate">{p.sku}</span>
                  <span className="text-[11px] text-slate-500 flex-shrink-0">{p.selected_pallets}p</span>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

const URGENCY_DOT: Record<string, string> = {
  critical: 'bg-red-400',
  urgent: 'bg-orange-400',
  soon: 'bg-amber-400',
  ok: 'bg-emerald-400',
};

const URGENCY_TEXT: Record<string, string> = {
  critical: 'text-red-300',
  urgent: 'text-orange-300',
  soon: 'text-amber-300',
  ok: 'text-slate-400',
};


function StabilitySection({ impact }: { impact: StabilityImpact }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  // DEBUG: trace what BoatCard stability section renders
  console.log('[BoatCard StabilitySection DEBUG]', {
    stabilizes: impact.stabilizes_count,
    recovering: impact.recovering_count,
    blocked: impact.blocked_count,
    progress: `${impact.progress_before_pct}->${impact.progress_after_pct}`,
  });

  const hasAny = impact.stabilizes_count > 0 || impact.recovering_count > 0 || impact.blocked_count > 0;
  if (!hasAny && impact.progress_before_pct === impact.progress_after_pct) return null;

  return (
    <div className="mt-2">
      {/* Clickable header with badge counts */}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="w-full flex items-center gap-1.5 text-left"
        title={t('planning.stability.tooltip', 'Productos con 30+ días de cobertura')}
      >
        {impact.stabilizes_count > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-medium">
            {'\u2713'} {t('planning.stability.stabilizesN', 'Estabiliza {{count}}', { count: impact.stabilizes_count })}
          </span>
        )}
        {impact.recovering_count > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-medium">
            {'\u21BB'} {t('planning.stability.recoveringN', 'Recuperando {{count}}', { count: impact.recovering_count })}
          </span>
        )}
        {impact.blocked_count > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-300 text-[10px] font-medium">
            {'\u2717'} {t('planning.stability.blockedN', 'Bloqueado {{count}}', { count: impact.blocked_count })}
          </span>
        )}
        <span className="text-[10px] text-slate-600 ml-auto">
          {expanded ? '\u25B2' : '\u25BC'}
        </span>
      </button>

      {/* Progress bar — stability percentage */}
      <div className="mt-1.5" title={t('planning.stability.tooltip', 'Productos con 30+ días de cobertura')}>
        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
          <div className="h-full flex">
            {impact.progress_before_pct > 0 && (
              <div
                className="bg-slate-500 h-full"
                style={{ width: `${impact.progress_before_pct}%` }}
              />
            )}
            {impact.progress_after_pct > impact.progress_before_pct && (
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${impact.progress_after_pct - impact.progress_before_pct}%` }}
              />
            )}
          </div>
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          {t('planning.stability.label', 'Estabilidad')}: {impact.progress_before_pct}% {'\u2192'} {impact.progress_after_pct}%
        </div>
      </div>

      {/* Expanded product lists */}
      {expanded && (
        <div className="mt-2 space-y-1.5">
          {impact.stabilizes_count > 0 && (
            <div>
              <div className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">
                {t('planning.stability.stabilizes', 'Estabiliza')}
              </div>
              <div className="text-[11px] text-slate-400 pl-2">
                {impact.stabilizes_products.join(', ')}
              </div>
            </div>
          )}
          {impact.recovering_count > 0 && (
            <div>
              <div className="text-[10px] font-medium text-amber-400 uppercase tracking-wider">
                {t('planning.stability.recovering', 'Recuperándose')}
              </div>
              <div className="text-[11px] text-slate-400 pl-2">
                {impact.recovering_products.join(', ')}
              </div>
            </div>
          )}
          {impact.blocked_count > 0 && (
            <div>
              <div className="text-[10px] font-medium text-red-400 uppercase tracking-wider">
                {t('planning.stability.blocked', 'Bloqueado')}
              </div>
              <div className="text-[11px] text-slate-400 pl-2">
                {impact.blocked_products.join(', ')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BoatCard({ projection, onDrillIn, onPreview, onQuickAccept, onExport, isAccepting, compact, isSelected, onSelect }: BoatCardProps) {
  const { t, i18n } = useTranslation();
  const [showAllProducts, setShowAllProducts] = useState(false);
  const isActive = projection.is_active;
  const isEstimated = projection.is_estimated;
  const isCompleted = projection.draft_status === 'ordered' || projection.draft_status === 'confirmed';
  const isPastCutoff = !isEstimated && projection.days_until_departure <= 10;

  const borderStyle = isActive
    ? 'border-slate-700/50'
    : isEstimated
      ? 'border-dashed border-slate-600/30'
      : 'border-dashed border-slate-700/40';

  // Shippable pallets: what factory can actually supply (matches OB selection)
  const shippableTotal = projection.product_details.reduce(
    (sum, p) => sum + (p.shippable_pallets ?? p.suggested_pallets), 0
  );
  const palletsText = isActive
    ? `${shippableTotal}`
    : `~${projection.projected_pallets_min}-${projection.projected_pallets_max}`;



  const canQuickAccept = onQuickAccept
    && !isCompleted
    && !isActive
    && projection.product_details.some((p) => (p.shippable_pallets ?? p.suggested_pallets) > 0);

  // Compact mode for ordered/confirmed/past-cutoff boats — expandable receipt
  const [receiptExpanded, setReceiptExpanded] = useState(false);

  if (compact && (isCompleted || isPastCutoff)) {
    const icon = isCompleted ? '\u{2705}' : '\u{23F3}';

    // Build product list from best available source
    const receiptProducts = projection.has_bl_allocation
      ? projection.draft_bl_items.map((item: DraftBLItem) => ({
          sku: item.sku,
          pallets: item.selected_pallets,
          m2: item.selected_pallets * 134.4,
        }))
      : projection.product_details
          .filter((p: ProductProjection) => (p.shippable_pallets ?? p.suggested_pallets) > 0)
          .map((p: ProductProjection) => ({
            sku: p.sku,
            pallets: p.shippable_pallets ?? p.suggested_pallets,
            m2: (p.shippable_pallets ?? p.suggested_pallets) * 134.4,
          }));

    const totalPallets = receiptProducts.reduce((sum, p) => sum + p.pallets, 0);
    const totalM2 = receiptProducts.reduce((sum, p) => sum + p.m2, 0);
    const hasProducts = receiptProducts.length > 0;

    const fmtDate = (iso: string) =>
      new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });

    return (
      <div className="bg-slate-800/20 rounded-xl border border-slate-700/30 opacity-70">
        {/* Collapsed header row */}
        <button
          onClick={() => setReceiptExpanded(!receiptExpanded)}
          className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm">{icon}</span>
            <span className="text-white font-medium truncate">{projection.boat_name}</span>
            <span className="text-slate-500 text-sm">{formatDateShort(projection.departure_date, i18n.language)}</span>
          </div>
          <div className="flex items-center gap-3">
            {projection.draft_status && (
              <span
                className={`
                  inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border
                  ${DRAFT_BADGE_CONFIG[projection.draft_status].classes}
                `}
              >
                {t(DRAFT_BADGE_CONFIG[projection.draft_status].label)}
              </span>
            )}
            <span className="text-slate-500 text-xs">{receiptExpanded ? '▴' : '▾'}</span>
          </div>
        </button>

        {/* Expanded receipt */}
        {receiptExpanded && (
          <div className="px-5 pb-4 space-y-3">
            {/* Date & carrier line */}
            <div className="text-sm text-slate-400">
              {t('departed.dates', 'Despachado {{dep}} → Llegada {{arr}}', {
                dep: fmtDate(projection.departure_date),
                arr: fmtDate(projection.arrival_date),
              })}
              {projection.carrier && (
                <span className="text-slate-500 ml-2 uppercase text-xs tracking-wider">{projection.carrier}</span>
              )}
            </div>

            {hasProducts ? (
              <>
                {/* Product table */}
                <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1fr_60px_80px] px-3 py-2 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800/50">
                    <span>SKU</span>
                    <span className="text-right">{t('departed.pallets', 'Paletas')}</span>
                    <span className="text-right">m²</span>
                  </div>
                  {receiptProducts.map((p) => (
                    <div key={p.sku} className="grid grid-cols-[1fr_60px_80px] px-3 py-2 border-b border-slate-800/30 last:border-b-0">
                      <span className="text-sm text-slate-300 truncate">{p.sku}</span>
                      <span className="text-sm text-slate-300 text-right tabular-nums">{p.pallets}</span>
                      <span className="text-sm text-slate-300 text-right tabular-nums">
                        {p.m2.toLocaleString('es', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                  <div className="grid grid-cols-[1fr_60px_80px] px-3 py-2.5 bg-slate-800/30 border-t border-slate-700/30">
                    <span className="text-sm font-medium text-white">TOTAL</span>
                    <span className="text-sm font-medium text-white text-right tabular-nums">{totalPallets}</span>
                    <span className="text-sm font-medium text-white text-right tabular-nums">
                      {totalM2.toLocaleString('es', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* Container estimate + export */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    ~{Math.ceil(totalPallets / 13)} {t('departed.containers', 'contenedor(es)')}
                  </span>
                  {onExport && projection.has_bl_allocation && (
                    <button
                      onClick={() => onExport(projection.boat_id)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                    >
                      {t('planning.export', 'Exportar')}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-500 text-sm">{t('departed.noOrder', 'Sin pedido para este barco')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={`
        bg-slate-800/30 backdrop-blur-xl rounded-2xl border ${borderStyle}
        shadow-xl transition-all duration-200 hover:bg-slate-800/50 hover:border-slate-600/60
        flex flex-col ${onSelect ? 'cursor-pointer' : ''}
        ${isSelected ? 'ring-1 ring-indigo-500/40' : ''}
      `}
    >
      {/* Header: vessel name + dates */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">
            {isActive ? '\u{1F6A2}' : isEstimated ? '\u{1F4C5}' : '\u{1F310}'}
          </span>
          <h3 className="text-white font-semibold truncate">
            {projection.boat_name}
          </h3>
          {projection.carrier && (
            <span className="text-[10px] text-slate-500 bg-slate-700/40 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
              {projection.carrier}
            </span>
          )}
        </div>
        <div className="text-right text-sm flex-shrink-0 ml-3">
          <div className="text-slate-400">
            {t('planning.departs', 'Sale')}: <span className="text-slate-300">{formatDateShort(projection.departure_date, i18n.language)}</span>
          </div>
          <div className="text-slate-500">
            {t('planning.arrives', 'Llega')}: <span className="text-slate-400">{formatDateShort(projection.arrival_date, i18n.language)}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-slate-700/30" />

      {/* Body: pallets + confidence */}
      <div className="px-5 py-3 space-y-3 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">{'\u{1F4E6}'}</span>
            <span className="text-slate-300 text-sm font-medium">
              {palletsText} {t('common.pallets', 'paletas')}
            </span>
          </div>
          {!isActive && <ConfidenceDots level={projection.confidence} />}
        </div>

        {/* Supply source badges */}
        {!isCompleted && (projection.has_factory_siesa_supply || projection.has_production_supply || projection.has_in_transit_supply) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {projection.has_factory_siesa_supply && (
              <span className="text-[10px] bg-blue-500/15 text-blue-300 px-1.5 py-0.5 rounded font-medium"
                title={t('planning.supplyFactoryTooltip', 'Stock disponible en fábrica SIESA para este barco')}>
                {t('planning.supplyFactory', 'SIESA: {{m2}} m²', { m2: Math.round(projection.factory_siesa_total_m2).toLocaleString() })}
              </span>
            )}
            {projection.has_production_supply && (
              <span className="text-[10px] bg-purple-500/15 text-purple-300 px-1.5 py-0.5 rounded font-medium"
                title={t('planning.supplyProductionTooltip', 'Producción de fábrica asignada a este barco')}>
                {t('planning.supplyProduction', 'Producción: {{m2}} m²', { m2: Math.round(projection.production_total_m2).toLocaleString() })}
              </span>
            )}
            {projection.has_in_transit_supply && (
              <span className="text-[10px] bg-cyan-500/15 text-cyan-300 px-1.5 py-0.5 rounded font-medium"
                title={t('planning.supplyInTransitTooltip', 'Productos en tránsito que llegan antes de este barco')}>
                {t('planning.supplyInTransit', 'En tránsito: {{m2}} m²', { m2: Math.round(projection.in_transit_total_m2).toLocaleString() })}
              </span>
            )}
          </div>
        )}

        {/* Stability impact */}
        {!isCompleted && projection.stability_impact && (
          <StabilitySection impact={projection.stability_impact} />
        )}

        {/* Review warning */}
        {projection.needs_review && (
          <div className="mt-3 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300">
            <span className="font-medium">{t('planning.needsReview', 'Revisar')}</span>
            {projection.review_reason && (
              <span className="text-amber-300/70"> — {translateReviewReason(projection.review_reason, t)}</span>
            )}
          </div>
        )}

        {/* Earlier draft dependency context */}
        {!isCompleted && projection.has_earlier_drafts && projection.earlier_draft_context && !projection.needs_review && (
          <div className="mt-2 text-[10px] text-slate-500 italic">
            {translateDraftContext(projection.earlier_draft_context, t)}
          </div>
        )}

        {/* Product list: BL-grouped if allocated, flat otherwise */}
        {projection.has_bl_allocation && projection.draft_bl_items.length > 0 ? (
          <BLGroupedList items={projection.draft_bl_items} />
        ) : projection.product_details.length > 0 ? (
          <ProductList
            products={projection.product_details}
            showAll={showAllProducts}
            onToggle={() => setShowAllProducts(!showAllProducts)}
          />
        ) : null}
      </div>

      {/* Footer: draft status + actions */}
      <div className="px-5 pb-5 pt-1 flex items-center justify-between gap-2">
        <div>
          {projection.draft_status && (
            <span
              className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                ${DRAFT_BADGE_CONFIG[projection.draft_status].classes}
              `}
            >
              {projection.draft_status === 'drafting' && '\u{270F}\u{FE0F}'}
              {projection.draft_status === 'action_needed' && '\u{26A0}\u{FE0F}'}
              {projection.draft_status === 'ordered' && '\u{1F4E8}'}
              {projection.draft_status === 'confirmed' && '\u{2705}'}
              {t(DRAFT_BADGE_CONFIG[projection.draft_status].label)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canQuickAccept && (
            projection.is_draft_locked ? (
              <span className="text-xs text-amber-400/70 flex items-center gap-1">
                {t('planning.draftLocked', 'Bloqueado por {{boat}}', { boat: projection.blocking_boat_name })}
              </span>
            ) : (
              <button
                onClick={() => onQuickAccept(projection)}
                disabled={isAccepting}
                className="
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                  bg-emerald-600/20 text-emerald-300 border border-emerald-500/30
                  hover:bg-emerald-600/30 hover:text-emerald-200 hover:border-emerald-500/50
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {isAccepting
                  ? t('planning.accepting', 'Guardando...')
                  : t('planning.quickAccept', 'Aceptar sugerido')}
              </button>
            )
          )}
          {onExport && projection.has_bl_allocation && (
            <button
              onClick={() => onExport(projection.boat_id)}
              className="
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                bg-emerald-600/20 text-emerald-300 border border-emerald-500/30
                hover:bg-emerald-600/30 hover:text-emerald-200 hover:border-emerald-500/50
              "
            >
              {t('planning.export', 'Exportar')}
            </button>
          )}
          <button
            onClick={() => {
              if (!isActive && onPreview) {
                onPreview(projection.boat_id);
              } else {
                onDrillIn(projection.boat_id);
              }
            }}
            className="
              px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
              bg-indigo-600/20 text-indigo-300 border border-indigo-500/30
              hover:bg-indigo-600/30 hover:text-indigo-200 hover:border-indigo-500/50
            "
          >
            {isActive
              ? t('planning.goToDetail', 'Detalle \u2192')
              : t('planning.preview', 'Vista previa')}
          </button>
        </div>
      </div>
    </div>
  );
}
