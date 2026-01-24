import { useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CustomerTrend, Predictability } from '../../requests/intelligence';
import { Sparkline } from './Sparkline';
import { TrendArrow } from './TrendArrow';
import { StatusDot } from './StatusDot';
import { ProductMixBar } from './ProductMixBar';
import { InsightBrief } from './InsightBrief';
import { generateCustomerBrief } from '../../utils/briefGenerator';

// Predictability badge colors
const predictabilityStyles: Record<Predictability, { bg: string; text: string; label: string }> = {
  CLOCKWORK: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Muy Regular' },
  PREDICTABLE: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Predecible' },
  MODERATE: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Moderado' },
  ERRATIC: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Errático' },
};

interface CustomerDetailPanelProps {
  customer: CustomerTrend | null;
  isOpen: boolean;
  onClose: () => void;
}

// Country flags
const countryFlags: Record<string, string> = {
  GT: '🇬🇹',
  HN: '🇭🇳',
  SV: '🇸🇻',
  NI: '🇳🇮',
  CR: '🇨🇷',
  PA: '🇵🇦',
  CO: '🇨🇴',
  OTHER: '🌎',
};

// Tier badge colors
const tierColors: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Tier A' },
  B: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Tier B' },
  C: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Tier C' },
};

export function CustomerDetailPanel({ customer, isOpen, onClose }: CustomerDetailPanelProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Generate the insight brief
  const brief = useMemo(() => {
    return customer ? generateCustomerBrief(customer) : null;
  }, [customer]);

  if (!customer) return null;

  const flag = countryFlags[customer.country_code] || countryFlags.OTHER;
  const tierStyle = tierColors[customer.tier] || tierColors.C;

  const formatRevenue = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatM2 = (value: number) => {
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K m²`;
    return `${value.toLocaleString()} m²`;
  };

  const getSparklineColor = () => {
    switch (customer.trend_direction) {
      case 'UP': return 'emerald';
      case 'DOWN': return 'rose';
      default: return 'amber';
    }
  };

  const getLastOrderLabel = () => {
    if (customer.days_since_last_order === null) return t('intelligence.customerDetail.noOrders');
    if (customer.days_since_last_order === 0) return 'Hoy';
    if (customer.days_since_last_order === 1) return 'Ayer';
    return `Hace ${customer.days_since_last_order} días`;
  };

  // Calculate product mix percentages
  const totalProductM2 = customer.top_products.reduce((sum, p) => sum + p.total_m2, 0);
  const productMixData = customer.top_products.slice(0, 5).map(p => ({
    sku: p.sku,
    percentage: totalProductM2 > 0 ? (p.total_m2 / totalProductM2) * 100 : 0,
  }));
  const maxPercentage = Math.max(...productMixData.map(p => p.percentage), 1);

  return (
    <>
      {/* Overlay */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm z-40
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`
          fixed right-0 top-0 h-full w-full sm:w-[400px] z-50
          bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50
          transform transition-transform duration-300 ease-out
          overflow-y-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 p-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusDot status={customer.status} size="md" />
              <div>
                <h2 className="text-xl font-bold text-white">{customer.customer_normalized}</h2>
                <p className="text-slate-400 text-sm flex items-center gap-2">
                  <span>{flag}</span>
                  <span>{customer.country_name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierStyle.bg} ${tierStyle.text}`}>
                    {tierStyle.label}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Insight Brief */}
          {brief && <InsightBrief brief={brief} />}

          {/* Large Sparkline */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <Sparkline
              data={customer.sparkline}
              color={getSparklineColor()}
              height={100}
              animated={false}
            />
          </div>

          {/* Summary Stats */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>📊</span>
              {t('intelligence.customerDetail.summary')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                  {t('intelligence.customerDetail.revenue')}
                </p>
                <p className="text-emerald-400 font-bold text-lg">
                  {formatRevenue(customer.total_revenue_usd)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                  {t('intelligence.customerDetail.volume')}
                </p>
                <p className="text-indigo-400 font-bold text-lg">
                  {formatM2(customer.total_m2)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                  {t('intelligence.customerDetail.orders')}
                </p>
                <p className="text-white font-bold text-lg">
                  {customer.order_count}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                  {t('intelligence.customerDetail.lastOrder')}
                </p>
                <p className="text-white font-bold text-lg">
                  {getLastOrderLabel()}
                </p>
              </div>
            </div>
          </div>

          {/* Buying Pattern */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>📈</span>
              {t('intelligence.customerDetail.buyingPattern')}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{t('intelligence.customerDetail.avgOrder')}</span>
                <span className="text-white font-medium">{formatM2(customer.avg_order_m2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{t('intelligence.customerDetail.avgOrderValue')}</span>
                <span className="text-white font-medium">{formatRevenue(customer.avg_order_revenue_usd)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{t('intelligence.customerDetail.trend')}</span>
                <TrendArrow
                  direction={customer.trend_direction}
                  strength={customer.trend_strength}
                  changePct={customer.velocity_change_pct}
                />
              </div>
            </div>
          </div>

          {/* Order Pattern Section */}
          {(customer.avg_gap_days || customer.days_overdue > 0) && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span>📅</span>
                {t('intelligence.customerPattern.title')}
              </h3>
              <div className="space-y-3">
                {/* Frequency */}
                {customer.avg_gap_days && customer.order_count >= 2 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">{t('intelligence.customerPattern.frequency')}</span>
                    <span className="text-white font-medium">
                      {t('intelligence.customerPattern.ordersEvery', { days: Math.round(customer.avg_gap_days) })}
                    </span>
                  </div>
                )}

                {/* Predictability */}
                {customer.predictability && predictabilityStyles[customer.predictability] && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">{t('intelligence.customerPattern.predictability')}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${predictabilityStyles[customer.predictability].bg} ${predictabilityStyles[customer.predictability].text}`}>
                      {predictabilityStyles[customer.predictability].label}
                      {customer.coefficient_of_variation != null && (
                        <span className="text-slate-500 ml-1">(CV: {customer.coefficient_of_variation.toFixed(2)})</span>
                      )}
                    </span>
                  </div>
                )}

                {/* Total Orders */}
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t('intelligence.customerPattern.totalOrders')}</span>
                  <span className="text-white font-medium">{customer.order_count}</span>
                </div>

                {/* Avg Order USD */}
                {customer.avg_order_usd && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">{t('intelligence.customerPattern.avgOrder')}</span>
                    <span className="text-white font-medium">
                      {formatM2(customer.avg_order_m2)} / {formatRevenue(customer.avg_order_usd)}
                    </span>
                  </div>
                )}

                {/* Expected Next */}
                {customer.expected_next_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">{t('intelligence.customerPattern.expectedNext')}</span>
                    <span className="text-white font-medium">{customer.expected_next_date}</span>
                  </div>
                )}

                {/* Days Overdue Alert */}
                {customer.days_overdue > 0 && (
                  <div className={`mt-3 p-3 rounded-lg ${customer.days_overdue > 60 ? 'bg-red-500/10 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
                    <div className="flex items-center gap-2">
                      <span className={customer.days_overdue > 60 ? 'text-red-400' : 'text-amber-400'}>⚠️</span>
                      <span className={`font-semibold ${customer.days_overdue > 60 ? 'text-red-400' : 'text-amber-400'}`}>
                        {t('intelligence.customerPattern.daysOverdue', { days: customer.days_overdue })}
                      </span>
                    </div>
                    {customer.days_overdue > 180 && (
                      <p className="text-red-300 text-xs mt-1">{t('intelligence.customerPattern.possiblyLost')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Product Mix */}
          {customer.top_products.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span>📦</span>
                {t('intelligence.customerDetail.productMix')}
              </h3>
              <div className="space-y-2">
                {productMixData.map((item) => (
                  <ProductMixBar
                    key={item.sku}
                    sku={item.sku}
                    percentage={item.percentage}
                    maxPercentage={maxPercentage}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="space-y-3">
              {customer.first_order_date && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t('intelligence.customerDetail.firstOrder')}</span>
                  <span className="text-white font-medium">{customer.first_order_date}</span>
                </div>
              )}
              {customer.last_order_date && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t('intelligence.customerDetail.lastOrderDate')}</span>
                  <span className="text-white font-medium">{customer.last_order_date}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 p-4">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
          >
            {t('intelligence.customerDetail.close')}
          </button>
        </div>
      </div>
    </>
  );
}
