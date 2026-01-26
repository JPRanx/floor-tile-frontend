/**
 * StockCoverage — Unified component for displaying warehouse + transit coverage
 *
 * Three variants for different contexts:
 * - compact: Dashboard table cells (scannable)
 * - bars: Intelligence product cards (visual comparison)
 * - comparison: Order Builder (current vs with order)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

export interface StockCoverageProps {
  /** Days of coverage from warehouse stock only */
  warehouseDays: number | null;
  /** Days of coverage including in-transit (required for 'bars' variant) */
  withTransitDays?: number | null;
  /** Days of coverage from transit alone (withTransitDays - warehouseDays) */
  inTransitDays?: number | null;
  /** When transit arrives (formatted date string) */
  transitArrivalDate?: string | null;
  /** True if stockout before transit arrives */
  hasGap?: boolean;
  /** Days without product before transit arrives */
  gapDays?: number | null;
  /** Display variant */
  variant: 'compact' | 'bars' | 'comparison';

  // For comparison variant only (Order Builder)
  /** Coverage after order arrives */
  withOrderDays?: number | null;
  /** When order arrives (formatted date string) */
  orderArrivalDate?: string | null;
}

// Consistent urgency thresholds across all variants
const getUrgencyColor = (days: number | null): string => {
  if (days === null) return 'text-slate-500';
  if (days < 7) return 'text-red-500';
  if (days < 14) return 'text-red-400';
  if (days < 30) return 'text-amber-400';
  return 'text-emerald-400';
};

const getUrgencyBarColor = (days: number | null): string => {
  if (days === null) return 'bg-slate-600';
  if (days < 7) return 'bg-gradient-to-r from-red-600 to-red-400';
  if (days < 14) return 'bg-gradient-to-r from-red-500 to-red-300';
  if (days < 30) return 'bg-gradient-to-r from-amber-500 to-amber-300';
  return 'bg-gradient-to-r from-emerald-600 to-emerald-400';
};

const formatDays = (days: number | null): string => {
  if (days === null) return '—';
  if (days > 365) return '365+';
  return String(Math.round(days));
};

/**
 * Compact variant for Dashboard table cells
 * Display: "11d (+5 🚢)" or "11d (+5 🚢) ⚠️"
 */
const CompactVariant: React.FC<StockCoverageProps> = ({
  warehouseDays,
  inTransitDays,
  hasGap,
}) => {
  const { t } = useTranslation();

  // No sales edge case
  if (warehouseDays === null) {
    return <span className="text-slate-500">{t('stockCoverage.noSales', 'Sin ventas')}</span>;
  }

  const urgencyColor = getUrgencyColor(warehouseDays);
  const transitDays = inTransitDays && inTransitDays > 0 ? Math.round(inTransitDays) : null;

  return (
    <span className="inline-flex items-center gap-1">
      <span className={`font-medium ${urgencyColor}`}>
        {formatDays(warehouseDays)}d
      </span>
      {transitDays !== null && (
        <span className="text-slate-500 text-sm">
          (+{transitDays} 🚢)
        </span>
      )}
      {hasGap && (
        <span className="text-amber-400" title={t('stockCoverage.gapWarning', 'Stockout before transit arrives')}>
          ⚠️
        </span>
      )}
    </span>
  );
};

/**
 * Bars variant for Intelligence product cards
 * Display: Two horizontal progress bars with labels
 */
const BarsVariant: React.FC<StockCoverageProps> = ({
  warehouseDays,
  withTransitDays,
  inTransitDays,
  transitArrivalDate,
  hasGap,
  gapDays,
}) => {
  const { t } = useTranslation();

  // No sales edge case
  if (warehouseDays === null) {
    return (
      <div className="text-slate-500 text-sm">
        {t('stockCoverage.noSales', 'Sin ventas')}
      </div>
    );
  }

  const urgencyColor = getUrgencyColor(warehouseDays);
  const barColor = getUrgencyBarColor(warehouseDays);
  const maxDays = 60; // Scale bars relative to 60 days
  const warehousePercent = Math.min(100, (warehouseDays / maxDays) * 100);
  const totalPercent = withTransitDays ? Math.min(100, (withTransitDays / maxDays) * 100) : 0;
  const showTransit = inTransitDays && inTransitDays > 0;

  return (
    <div className="space-y-2">
      {/* Warehouse bar */}
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${warehousePercent}%` }}
          />
        </div>
        <span className={`text-xs ${urgencyColor}`}>
          {formatDays(warehouseDays)}d {t('stockCoverage.warehouse', 'bodega')}
        </span>
      </div>

      {/* Total bar (only if transit exists) */}
      {showTransit && withTransitDays !== null && (
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
              style={{ width: `${totalPercent}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">
            {formatDays(withTransitDays ?? null)}d {t('stockCoverage.total', 'total')}
          </span>
        </div>
      )}

      {/* Transit info */}
      {showTransit && transitArrivalDate && (
        <div className="text-xs text-slate-500">
          🚢 {t('stockCoverage.transit', 'Tránsito llega')}: {transitArrivalDate} (+{Math.round(inTransitDays!)}d)
        </div>
      )}

      {/* Gap warning */}
      {hasGap && gapDays && gapDays > 0 && (
        <div className="text-xs text-amber-400">
          ⚠️ {t('stockCoverage.gap', 'Gap')}: {Math.round(gapDays)} {t('stockCoverage.daysWithoutProduct', 'días sin producto')}
        </div>
      )}
    </div>
  );
};

/**
 * Comparison variant for Order Builder
 * Display: Side-by-side current vs with order
 */
const ComparisonVariant: React.FC<StockCoverageProps> = ({
  warehouseDays,
  inTransitDays,
  transitArrivalDate,
  hasGap,
  gapDays,
  withOrderDays,
  orderArrivalDate,
}) => {
  const { t } = useTranslation();

  // No sales edge case
  if (warehouseDays === null) {
    return (
      <div className="bg-slate-800/30 rounded-lg p-3 text-slate-500 text-sm">
        {t('stockCoverage.noSales', 'Sin ventas')}
      </div>
    );
  }

  const urgencyColor = getUrgencyColor(warehouseDays);
  const showTransit = inTransitDays && inTransitDays > 0;

  return (
    <div className="grid grid-cols-2 gap-4 bg-slate-800/30 rounded-lg p-3">
      {/* Current State */}
      <div>
        <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
          {t('stockCoverage.now', 'AHORA')}
        </div>
        <div className={`font-bold ${urgencyColor}`}>
          📦 {formatDays(warehouseDays)} {t('stockCoverage.days', 'días')}
        </div>
        {showTransit && (
          <div className="text-sm text-slate-400">
            🚢 +{Math.round(inTransitDays!)} {t('stockCoverage.days', 'días')}
            {transitArrivalDate && <span className="text-slate-500"> ({transitArrivalDate})</span>}
          </div>
        )}
        {hasGap && gapDays && gapDays > 0 && (
          <div className="text-sm text-amber-400">
            ⚠️ {t('stockCoverage.gap', 'Gap')}: {Math.round(gapDays)} {t('stockCoverage.days', 'días')}
          </div>
        )}
      </div>

      {/* With Order */}
      {withOrderDays !== null && (
        <div>
          <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
            {t('stockCoverage.withOrder', 'CON PEDIDO')}
          </div>
          <div className="font-bold text-emerald-400">
            📦 +{formatDays(withOrderDays ?? null)} {t('stockCoverage.days', 'días')}
          </div>
          {orderArrivalDate && (
            <div className="text-sm text-emerald-400">
              ✓ {t('stockCoverage.covered', 'Cubierto')} {orderArrivalDate}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Main StockCoverage component
 */
export const StockCoverage: React.FC<StockCoverageProps> = (props) => {
  switch (props.variant) {
    case 'compact':
      return <CompactVariant {...props} />;
    case 'bars':
      return <BarsVariant {...props} />;
    case 'comparison':
      return <ComparisonVariant {...props} />;
    default:
      return <CompactVariant {...props} />;
  }
};

export default StockCoverage;
