import type { CategoryMetrics } from '../../requests/intelligence';
import { TrendArrow } from './TrendArrow';

interface CategoryCardProps {
  category: CategoryMetrics;
  index: number;
}

// Category icons/emojis
const categoryIcons: Record<string, string> = {
  MADERAS: '🌲',
  EXTERIORES: '🏡',
  MARMOLIZADOS: '🪨',
  OTHER: '📦',
};

// Glow colors based on trend
function getGlowClass(direction: CategoryMetrics['trend_direction']): string {
  switch (direction) {
    case 'UP':
      return 'hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]';
    case 'DOWN':
      return 'hover:shadow-[0_0_30px_rgba(244,63,94,0.2)]';
    default:
      return 'hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]';
  }
}

// Format numbers
const formatM2 = (value: number) => {
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K m²`;
  return `${value.toFixed(0)} m²`;
};

export function CategoryCard({ category, index }: CategoryCardProps) {
  const icon = categoryIcons[category.category] || categoryIcons.OTHER;
  const glowClass = getGlowClass(category.trend_direction);

  // Calculate a "health" indicator based on coverage and risk
  const hasRisk = category.products_at_risk > 0;
  const lowCoverage = category.avg_warehouse_days !== null && category.avg_warehouse_days < 45;

  return (
    <div
      className={`
        bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5
        transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1
        ${glowClass}
      `}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Header: Icon + Name + Trend */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <h3 className="text-white font-semibold text-lg">{category.category}</h3>
            <p className="text-slate-400 text-sm">
              {category.product_count} producto{category.product_count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <TrendArrow
          direction={category.trend_direction}
          strength={category.trend_strength}
          changePct={category.velocity_change_pct}
        />
      </div>

      {/* Warehouse Percentage - Big Visual */}
      <div className="mb-4">
        <div className="flex items-end justify-between mb-2">
          <p className="text-slate-500 text-xs uppercase tracking-wide">% Bodega</p>
          <p className="text-indigo-400 font-bold text-2xl">
            {category.warehouse_pct.toFixed(1)}%
          </p>
        </div>
        {/* Progress bar */}
        <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`
              h-full rounded-full transition-all duration-500
              ${category.trend_direction === 'UP' ? 'bg-emerald-500' :
                category.trend_direction === 'DOWN' ? 'bg-rose-500' : 'bg-amber-500'}
            `}
            style={{ width: `${Math.min(category.warehouse_pct, 100)}%` }}
          />
        </div>
        <p className="text-slate-500 text-xs mt-1">
          {formatM2(category.warehouse_m2)} en bodega
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Velocidad</p>
          <p className="text-emerald-400 font-bold text-lg">
            {category.avg_velocity_m2_day.toFixed(1)}
          </p>
          <p className="text-slate-500 text-xs">m²/día prom</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Cobertura</p>
          {category.avg_warehouse_days !== null ? (
            <>
              <p className={`font-bold text-lg ${
                category.avg_warehouse_days < 30 ? 'text-rose-400' :
                category.avg_warehouse_days < 60 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {category.avg_warehouse_days.toFixed(0)}
              </p>
              <p className="text-slate-500 text-xs">días prom</p>
            </>
          ) : (
            <p className="text-slate-500 text-sm">Sin datos</p>
          )}
        </div>
      </div>

      {/* Risk Indicators */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-700/50">
        {hasRisk ? (
          <span className="px-2 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-medium">
            {category.products_at_risk} en riesgo
          </span>
        ) : (
          <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium">
            Stock saludable
          </span>
        )}
        {lowCoverage && (
          <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium">
            Baja cobertura
          </span>
        )}
      </div>
    </div>
  );
}
