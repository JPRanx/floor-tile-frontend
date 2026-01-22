import type { CustomerTrend } from '../../requests/intelligence';
import { Sparkline } from './Sparkline';
import { ConfidenceBadge } from './ConfidenceBadge';
import { StatusDot } from './StatusDot';
import { TrendArrow } from './TrendArrow';

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
  const glowClass = getGlowClass(customer.trend_direction);
  const sparklineColor = getSparklineColor(customer.trend_direction);
  const tierStyle = tierColors[customer.tier];
  const flag = countryFlags[customer.country_code] || countryFlags.OTHER;

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
    if (customer.days_since_last_order === null) return 'Sin órdenes';
    if (customer.days_since_last_order === 0) return 'Hoy';
    if (customer.days_since_last_order === 1) return 'Ayer';
    if (customer.days_since_last_order <= 7) return `Hace ${customer.days_since_last_order}d`;
    if (customer.days_since_last_order <= 30) return `Hace ${Math.floor(customer.days_since_last_order / 7)}sem`;
    return `Hace ${Math.floor(customer.days_since_last_order / 30)}m`;
  };

  return (
    <div
      onClick={handleClick}
      className={`
        bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5
        transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1
        ${glowClass}
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
          {tierStyle.label}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Ingresos</p>
          <p className="text-emerald-400 font-bold text-xl">
            {formatRevenue(customer.total_revenue_usd)}
          </p>
          <p className="text-slate-500 text-xs">
            Prom. {formatRevenue(customer.avg_order_revenue_usd)}/orden
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Volumen</p>
          <p className="text-indigo-400 font-bold text-xl">
            {formatM2(customer.total_m2)} m²
          </p>
          <p className="text-slate-500 text-xs">
            {customer.order_count} orden{customer.order_count !== 1 ? 'es' : ''}
          </p>
        </div>
      </div>

      {/* Sparkline */}
      <div className="mb-4">
        <Sparkline data={customer.sparkline} color={sparklineColor} height={50} />
      </div>

      {/* Top Products (if any) */}
      {customer.top_products.length > 0 && (
        <div className="mb-4">
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Top Productos</p>
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
