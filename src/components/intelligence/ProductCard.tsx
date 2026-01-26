import type { ProductTrend } from '../../requests/intelligence';
import { Sparkline } from './Sparkline';
import { ConfidenceBadge } from './ConfidenceBadge';
import { TrendArrow } from './TrendArrow';
import { StockCoverage } from '../shared';

interface ProductCardProps {
  product: ProductTrend;
  index: number;
  rank: number;
  onClick?: (product: ProductTrend) => void;
}

// Rotation badge colors
const rotationColors: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  B: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  C: { bg: 'bg-rose-500/20', text: 'text-rose-400' },
};

// Category icons
const categoryIcons: Record<string, string> = {
  pisos: '🏠',
  azulejos: '🔲',
  porcelanato: '✨',
  default: '📦',
};

function getGlowClass(direction: ProductTrend['trend_direction']): string {
  switch (direction) {
    case 'UP':
      return 'hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]';
    case 'DOWN':
      return 'hover:shadow-[0_0_30px_rgba(244,63,94,0.2)]';
    default:
      return 'hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]';
  }
}

function getSparklineColor(direction: ProductTrend['trend_direction']): 'emerald' | 'rose' | 'amber' {
  switch (direction) {
    case 'UP':
      return 'emerald';
    case 'DOWN':
      return 'rose';
    default:
      return 'amber';
  }
}

export function ProductCard({ product, index, rank, onClick }: ProductCardProps) {
  const glowClass = getGlowClass(product.trend_direction);
  const sparklineColor = getSparklineColor(product.trend_direction);
  const rotationStyle = rotationColors[product.rotation || 'C'] || rotationColors.C;
  const categoryIcon = categoryIcons[product.category?.toLowerCase()] || categoryIcons.default;

  const handleClick = () => {
    if (onClick) {
      onClick(product);
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
      {/* Header: Rank + SKU + Rotation Badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Rank badge */}
          <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
            <span className="text-slate-400 font-bold text-sm">#{rank}</span>
          </div>
          <div>
            <h3 className="text-white font-semibold">{product.sku}</h3>
            <p className="text-slate-500 text-xs flex items-center gap-1">
              <span>{categoryIcon}</span>
              <span>{product.category}</span>
            </p>
          </div>
        </div>

        {/* Rotation badge */}
        {product.rotation && (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${rotationStyle.bg} ${rotationStyle.text}`}>
            Rot. {product.rotation}
          </span>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Ingresos</p>
          <p className="text-emerald-400 font-bold text-lg">
            {formatRevenue(product.total_revenue_usd)}
          </p>
          <p className="text-slate-500 text-xs">
            ~{formatRevenue(product.avg_weekly_revenue_usd)}/sem
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Velocidad</p>
          <p className="text-indigo-400 font-bold text-lg">
            {formatM2(product.daily_velocity_m2)} m²
          </p>
          <p className="text-slate-500 text-xs">
            /día
          </p>
        </div>
      </div>

      {/* Stock Coverage Bars */}
      <div className="mb-4">
        <StockCoverage
          variant="bars"
          warehouseDays={product.days_of_stock}
          withTransitDays={product.days_with_transit}
          inTransitDays={
            product.days_with_transit != null && product.days_of_stock != null
              ? product.days_with_transit - product.days_of_stock
              : null
          }
        />
      </div>

      {/* Sparkline */}
      <div className="mb-4">
        <Sparkline data={product.sparkline} color={sparklineColor} height={50} />
      </div>

      {/* Footer: Trend + Weeks + Confidence */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
        <TrendArrow
          direction={product.trend_direction}
          strength={product.trend_strength}
          changePct={product.velocity_change_pct}
        />
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-xs">
            {product.sample_weeks} semanas
          </span>
          <ConfidenceBadge level={product.confidence} showLabel={false} />
        </div>
      </div>
    </div>
  );
}
