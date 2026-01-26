import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { OrderSummaryReasoning, ExcludedProduct } from '../requests/orderBuilder';

interface OrderBuilderStrategyProps {
  reasoning: OrderSummaryReasoning | null;
}

const STRATEGY_CONFIG = {
  STOCKOUT_PREVENTION: {
    icon: '🛡️',
    colorClass: 'text-red-400',
    bgClass: 'bg-red-500/10',
  },
  DEMAND_CAPTURE: {
    icon: '📈',
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10',
  },
  BALANCED: {
    icon: '⚖️',
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10',
  },
};

const EXCLUSION_REASON_CONFIG: Record<string, { icon: string; colorClass: string }> = {
  OVERSTOCKED: { icon: '📦', colorClass: 'text-amber-400' },
  NO_SALES: { icon: '💤', colorClass: 'text-slate-400' },
  DECLINING: { icon: '📉', colorClass: 'text-orange-400' },
  NO_DATA: { icon: '❓', colorClass: 'text-slate-500' },
};

function ExcludedProductItem({ product }: { product: ExcludedProduct }) {
  const { t } = useTranslation();
  const config = EXCLUSION_REASON_CONFIG[product.reason] || EXCLUSION_REASON_CONFIG.NO_DATA;

  // Convert trend_pct to number (backend sends as string from Decimal)
  const trendPct = product.trend_pct !== null ? Number(product.trend_pct) : null;

  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-slate-800/30 rounded-lg">
      <span className="text-lg">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">
          {product.sku}
        </p>
        <p className={`text-xs ${config.colorClass}`}>
          {t(`orderBuilder.exclusionReason.${product.reason}`)}
          {product.days_of_stock !== null && (
            <span className="text-slate-500 ml-1">
              · {Math.round(Number(product.days_of_stock))} {t('orderBuilder.daysStock')}
            </span>
          )}
          {trendPct !== null && trendPct !== 0 && (
            <span className="text-slate-500 ml-1">
              · {trendPct > 0 ? '+' : ''}{trendPct.toFixed(0)}%
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export function OrderBuilderStrategy({ reasoning }: OrderBuilderStrategyProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showExcluded, setShowExcluded] = useState(false);

  if (!reasoning) {
    return null;
  }

  const strategyConfig = STRATEGY_CONFIG[reasoning.strategy] || STRATEGY_CONFIG.BALANCED;
  const hasExcluded = reasoning.excluded_products.length > 0;

  return (
    <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Header - Always visible, clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{strategyConfig.icon}</span>
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              {t(`orderBuilder.strategy.${reasoning.strategy}`)}
            </h3>
            <p className="text-sm text-slate-400">
              {t('orderBuilder.strategyFor', { boat: reasoning.boat_name })}
            </p>
          </div>
        </div>
        <span className={`text-slate-400 text-sm transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-700/30">
          {/* Count Badges */}
          <div className="flex flex-wrap gap-2 pt-4">
            {reasoning.critical_count > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                {reasoning.critical_count} {t('orderBuilder.critical')}
              </span>
            )}
            {reasoning.urgent_count > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                {reasoning.urgent_count} {t('orderBuilder.urgent')}
              </span>
            )}
            {reasoning.stable_count > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {reasoning.stable_count} {t('orderBuilder.stable')}
              </span>
            )}
            {reasoning.excluded_count > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30">
                {reasoning.excluded_count} {t('orderBuilder.excluded')}
              </span>
            )}
          </div>

          {/* Narrative Reasoning */}
          {reasoning.reasoning ? (
            <div className="space-y-3">
              {/* Strategy sentence */}
              <p className="text-sm text-slate-300 leading-relaxed">
                <span className="text-emerald-400 font-medium">
                  {reasoning.reasoning.strategy_sentence}
                </span>
              </p>

              {/* Risk sentence */}
              <p className="text-sm text-slate-400 leading-relaxed">
                {reasoning.reasoning.risk_sentence}
              </p>

              {/* Constraint sentence */}
              {reasoning.reasoning.limiting_factor !== 'none' && (
                <p className="text-sm text-amber-400/90 leading-relaxed">
                  {reasoning.reasoning.constraint_sentence}
                </p>
              )}
              {reasoning.reasoning.limiting_factor === 'none' && (
                <p className="text-sm text-slate-500 leading-relaxed">
                  {reasoning.reasoning.constraint_sentence}
                </p>
              )}

              {/* Customer sentence (if available) */}
              {reasoning.reasoning.customer_sentence && (
                <p className="text-sm text-blue-400/90 leading-relaxed">
                  <span className="text-blue-400">👥</span>{' '}
                  {reasoning.reasoning.customer_sentence}
                </p>
              )}

              {/* Supporting badges */}
              {(reasoning.reasoning.deferred_count > 0 || reasoning.reasoning.limiting_factor !== 'none') && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {reasoning.reasoning.limiting_factor !== 'none' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {reasoning.reasoning.limiting_factor === 'warehouse' && '🏭'}
                      {reasoning.reasoning.limiting_factor === 'boat' && '🚢'}
                      {reasoning.reasoning.limiting_factor === 'mode' && '⚙️'}
                      {t(`orderBuilder.limitingFactor.${reasoning.reasoning.limiting_factor}`)}
                    </span>
                  )}
                  {reasoning.reasoning.deferred_count > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                      📦 {reasoning.reasoning.deferred_count} {t('orderBuilder.palletsDeferredShort')}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Fallback to legacy key_insights */
            reasoning.key_insights.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <span>💡</span>
                  {t('orderBuilder.keyInsights')}
                </h4>
                <ul className="space-y-1.5">
                  {reasoning.key_insights.map((insight, index) => (
                    <li
                      key={index}
                      className="text-sm text-slate-400 flex items-start gap-2"
                    >
                      <span className="text-slate-600 mt-0.5">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}

          {/* Excluded Products (Collapsible) */}
          {hasExcluded && (
            <div className="border-t border-slate-700/30 pt-4">
              <button
                onClick={() => setShowExcluded(!showExcluded)}
                className="w-full flex items-center justify-between text-left group"
              >
                <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <span>🚫</span>
                  {t('orderBuilder.excludedProducts')} ({reasoning.excluded_products.length})
                </h4>
                <span className={`text-slate-500 text-xs transition-transform duration-200 group-hover:text-slate-400 ${showExcluded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {showExcluded && (
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                  {reasoning.excluded_products.map((product) => (
                    <ExcludedProductItem key={product.sku} product={product} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
