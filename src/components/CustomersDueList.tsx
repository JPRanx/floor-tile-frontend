import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CustomerDue } from '../requests/orderBuilder';

interface CustomersDueListProps {
  customers: CustomerDue[];
  loading: boolean;
}

// Tier badge colors
const tierColors: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  B: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  C: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
};

// Predictability colors
const predictabilityColors: Record<string, string> = {
  CLOCKWORK: 'text-emerald-400',
  PREDICTABLE: 'text-green-400',
  MODERATE: 'text-yellow-400',
  ERRATIC: 'text-orange-400',
};

// Trend icons
const trendIcons: Record<string, { icon: string; color: string }> = {
  up: { icon: '↗', color: 'text-emerald-400' },
  down: { icon: '↘', color: 'text-rose-400' },
  stable: { icon: '→', color: 'text-amber-400' },
};

export function CustomersDueList({ customers, loading }: CustomersDueListProps) {
  const { t } = useTranslation();
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            👥
          </span>
          {t('customersDue.title')}
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-slate-700/30 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            👥
          </span>
          {t('customersDue.title')}
        </h3>
        <p className="text-slate-400 text-sm">{t('customersDue.noCustomers')}</p>
      </div>
    );
  }

  const displayCustomers = showAll ? customers : customers.slice(0, 5);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const formatM2 = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K m²`;
    }
    return `${Math.round(value)} m²`;
  };

  const getOverdueLabel = (daysOverdue: number) => {
    if (daysOverdue < 0) {
      return { text: t('customersDue.dueIn', { days: Math.abs(daysOverdue) }), color: 'text-slate-400' };
    }
    if (daysOverdue === 0) {
      return { text: t('customersDue.dueToday'), color: 'text-amber-400' };
    }
    if (daysOverdue <= 14) {
      return { text: t('customersDue.overdue', { days: daysOverdue }), color: 'text-amber-400' };
    }
    if (daysOverdue <= 60) {
      return { text: t('customersDue.overdue', { days: daysOverdue }), color: 'text-orange-400' };
    }
    return { text: t('customersDue.overdue', { days: daysOverdue }), color: 'text-red-400' };
  };

  const toggleCustomer = (customerName: string) => {
    setExpandedCustomer(expandedCustomer === customerName ? null : customerName);
  };

  return (
    <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5 shadow-xl">
      {/* Header */}
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
          👥
        </span>
        {t('customersDue.title')}
        <span className="ml-auto text-sm font-normal text-slate-400">
          {customers.length} {t('customersDue.customers')}
        </span>
      </h3>

      {/* Customer List */}
      <div className="space-y-2">
        {displayCustomers.map((customer) => {
          const tierStyle = tierColors[customer.tier] || tierColors.C;
          const overdueLabel = getOverdueLabel(customer.days_overdue);
          const trend = trendIcons[customer.trend_direction] || trendIcons.stable;
          const isExpanded = expandedCustomer === customer.customer_normalized;

          return (
            <div
              key={customer.customer_normalized}
              className={`
                rounded-xl border transition-all duration-200 cursor-pointer
                ${isExpanded
                  ? 'bg-slate-700/40 border-slate-600/50'
                  : 'bg-slate-700/20 border-slate-700/30 hover:bg-slate-700/30'
                }
              `}
              onClick={() => toggleCustomer(customer.customer_normalized)}
            >
              {/* Main Row */}
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Tier badge */}
                    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${tierStyle.bg} ${tierStyle.text}`}>
                      {customer.tier}
                    </span>
                    {/* Customer name */}
                    <span className="text-white font-medium truncate">
                      {customer.customer_normalized}
                    </span>
                    {/* Trend */}
                    <span className={`${trend.color} text-sm`}>{trend.icon}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${overdueLabel.color}`}>
                      {overdueLabel.text}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span>Avg: {formatM2(customer.avg_order_m2)}</span>
                  <span>~{formatCurrency(customer.avg_order_usd)}</span>
                  {customer.predictability && (
                    <span className={predictabilityColors[customer.predictability]}>
                      {customer.predictability}
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Products */}
              {isExpanded && customer.top_products.length > 0 && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-700/30">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                    {t('customersDue.topProducts')}
                  </p>
                  <div className="space-y-1">
                    {customer.top_products.slice(0, 5).map((product) => (
                      <div
                        key={product.sku}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-slate-300">{product.sku}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-400">
                            ~{formatM2(product.avg_m2_per_order)}/orden
                          </span>
                          <span className="text-slate-500">
                            {product.share_pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show More/Less */}
      {customers.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-3 py-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {showAll
            ? t('customersDue.showLess')
            : t('customersDue.showMore', { count: customers.length - 5 })
          }
        </button>
      )}
    </div>
  );
}
