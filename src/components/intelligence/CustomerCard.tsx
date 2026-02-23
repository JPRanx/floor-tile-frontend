import { useTranslation } from 'react-i18next';
import type { CustomerTrend, Predictability } from '../../requests/intelligence';
import { Sparkline } from './Sparkline';
import { ConfidenceBadge } from './ConfidenceBadge';
import { StatusDot } from './StatusDot';
import { TrendArrow } from './TrendArrow';
import { formatDateUTC } from '../../utils/dateUtils';

interface CustomerCardProps {
  customer: CustomerTrend;
  index: number;
  onClick?: (customer: CustomerTrend) => void;
}

// Tier badge colors
const tierColors: Record<CustomerTrend['tier'], { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Cliente A' },
  B: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Cliente B' },
  C: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Cliente C' },
};

// Predictability labels
const predictabilityLabels: Record<Predictability, { label: string; color: string }> = {
  CLOCKWORK: { label: 'Muy Regular', color: 'text-emerald-400' },
  PREDICTABLE: { label: 'Predecible', color: 'text-green-400' },
  MODERATE: { label: 'Moderado', color: 'text-yellow-400' },
  ERRATIC: { label: 'Errático', color: 'text-orange-400' },
};

// Overdue severity
type OverdueSeverity = 'critical' | 'warning' | 'attention' | 'minor' | null;

function getOverdueSeverity(customer: CustomerTrend): OverdueSeverity {
  if (!customer.days_overdue || customer.days_overdue <= 0) return null;
  if (customer.days_overdue > 180) return 'critical';   // 6+ months
  if (customer.days_overdue > 60) return 'warning';     // 2+ months
  if (customer.days_overdue > 14) return 'attention';   // 2+ weeks
  return 'minor';
}

// Border ring styles for overdue
const overdueBorderStyles: Record<Exclude<OverdueSeverity, null>, string> = {
  critical: 'ring-2 ring-red-500/50',
  warning: 'ring-2 ring-amber-500/50',
  attention: 'ring-1 ring-yellow-500/30',
  minor: '',
};

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

function getGlowClass(direction: CustomerTrend['trend_direction']): string {
  switch (direction) {
    case 'UP':
      return 'hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]';
    case 'DOWN':
      return 'hover:shadow-[0_0_30px_rgba(244,63,94,0.2)]';
    default:
      return 'hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]';
  }
}

function getSparklineColor(direction: CustomerTrend['trend_direction']): 'emerald' | 'rose' | 'amber' {
  switch (direction) {
    case 'UP':
      return 'emerald';
    case 'DOWN':
      return 'rose';
    default:
      return 'amber';
  }
}

// Truncate long names
function truncateName(name: string, maxLength = 25): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 3) + '...';
}

export function CustomerCard({ customer, index, onClick }: CustomerCardProps) {
  const { t } = useTranslation();
  const glowClass = getGlowClass(customer.trend_direction);
  const sparklineColor = getSparklineColor(customer.trend_direction);
  const tierStyle = tierColors[customer.tier];
  const flag = countryFlags[customer.country_code] || countryFlags.OTHER;
  const overdueSeverity = getOverdueSeverity(customer);
  const overdueRingClass = overdueSeverity ? overdueBorderStyles[overdueSeverity] : '';

  const handleClick = () => {
    if (onClick) {
      onClick(customer);
    }
  };

  // Format revenue
  const formatRevenue = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  // Format m²
  const formatM2 = (value: number) => {
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  // Days since last order label
  const getLastOrderLabel = () => {
    if (customer.days_since_last_order === null) return t('intelligence.customerCard.noOrders', 'Sin órdenes');
    if (customer.days_since_last_order === 0) return t('intelligence.customerCard.today', 'Hoy');
    if (customer.days_since_last_order === 1) return t('intelligence.customerCard.yesterday', 'Ayer');
    if (customer.days_since_last_order <= 7) return t('intelligence.customerCard.daysAgo', 'Hace {{count}}d', { count: customer.days_since_last_order });
    if (customer.days_since_last_order <= 30) return t('intelligence.customerCard.weeksAgo', 'Hace {{count}}sem', { count: Math.floor(customer.days_since_last_order / 7) });
    return t('intelligence.customerCard.monthsAgo', 'Hace {{count}}m', { count: Math.floor(customer.days_since_last_order / 30) });
  };

  // Format expected date
  const formatExpectedDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return formatDateUTC(dateStr, 'es-GT');
  };

  return (
    <div
      onClick={handleClick}
      className={`
        bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5
        transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1
        ${glowClass}
        ${overdueRingClass}
        ${onClick ? 'cursor-pointer' : ''}
      `}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Header: Status + Name + Tier + Country */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Status dot */}
          <StatusDot status={customer.status} size="md" />

          <div>
            <h3 className="text-white font-semibold" title={customer.customer_normalized}>
              {truncateName(customer.customer_normalized)}
            </h3>
            <p className="text-slate-500 text-xs flex items-center gap-1">
              <span>{flag}</span>
              <span>{customer.country_name}</span>
              <span className="text-slate-600">•</span>
              <span>#{customer.revenue_rank}</span>
            </p>
          </div>
        </div>

        {/* Tier badge */}
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierStyle.bg} ${tierStyle.text}`}>
          {t(`intelligence.customerCard.tier${customer.tier}`, tierStyle.label)}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{t('intelligence.customerCard.revenue', 'Ingresos')}</p>
          <p className="text-emerald-400 font-bold text-xl">
            {formatRevenue(customer.total_revenue_usd)}
          </p>
          <p className="text-slate-500 text-xs">
            {t('intelligence.customerCard.avgPerOrder', 'Prom. {{amount}}/orden', { amount: formatRevenue(customer.avg_order_revenue_usd) })}
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{t('intelligence.customerCard.volume', 'Volumen')}</p>
          <p className="text-indigo-400 font-bold text-xl">
            {formatM2(customer.total_m2)} m²
          </p>
          <p className="text-slate-500 text-xs">
            {customer.order_count} {t('intelligence.customerCard.orders', 'órdenes')}
          </p>
        </div>
      </div>

      {/* Pattern Info */}
      {(customer.avg_gap_days || customer.days_overdue > 0) && (
        <div className="mb-4 space-y-1">
          {customer.avg_gap_days && customer.order_count >= 2 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">📅</span>
              <span className="text-slate-400">
                {t('intelligence.customerPattern.ordersEvery', { days: Math.round(customer.avg_gap_days) })}
              </span>
              {customer.predictability && predictabilityLabels[customer.predictability] && (
                <span className={`${predictabilityLabels[customer.predictability].color} text-xs`}>
                  ({t(`intelligence.customerCard.predictability.${customer.predictability.toLowerCase()}`, predictabilityLabels[customer.predictability].label)})
                </span>
              )}
            </div>
          )}
          {customer.days_overdue > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className={overdueSeverity === 'critical' ? 'text-red-400' : 'text-amber-400'}>⚠️</span>
              <span className={overdueSeverity === 'critical' ? 'text-red-400' : 'text-amber-400'}>
                {t('intelligence.customerPattern.daysOverdue', { days: customer.days_overdue })}
                {customer.expected_next_date && (
                  <span className="text-slate-500 ml-1">
                    ({t('intelligence.customerPattern.expected')}: {formatExpectedDate(customer.expected_next_date)})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Sparkline */}
      <div className="mb-4">
        <Sparkline data={customer.sparkline} color={sparklineColor} height={50} />
      </div>

      {/* Top Products (if any) */}
      {customer.top_products.length > 0 && (
        <div className="mb-4">
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">{t('intelligence.customerCard.topProducts', 'Top Productos')}</p>
          <div className="flex flex-wrap gap-1">
            {customer.top_products.slice(0, 3).map((p) => (
              <span
                key={p.sku}
                className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-300"
              >
                {p.sku}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer: Trend + Last Order + Confidence */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
        <TrendArrow
          direction={customer.trend_direction}
          strength={customer.trend_strength}
          changePct={customer.velocity_change_pct}
        />
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-xs">
            {getLastOrderLabel()}
          </span>
          <ConfidenceBadge level={customer.confidence} showLabel={false} />
        </div>
      </div>
    </div>
  );
}
