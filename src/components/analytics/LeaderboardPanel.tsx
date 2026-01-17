import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { analyticsApi } from '../../requests/analytics';
import type { CustomerSummary, ProductSummary } from '../../requests/analytics';

function truncateName(name: string, maxLength = 30): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 3) + '...';
}

interface LeaderboardItem {
  id: string;
  name: string;
  value: number;
  subtitle: string;
}

interface LeaderboardPanelProps {
  groupBy: 'customer' | 'product';
}

export function LeaderboardPanel({ groupBy }: LeaderboardPanelProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        if (groupBy === 'customer') {
          const response = await analyticsApi.getCustomers(100);
          setItems(response.data.map((c: CustomerSummary) => ({
            id: c.customer_normalized,
            name: c.customer_normalized,
            value: parseFloat(c.total_revenue_usd),
            subtitle: `${c.order_count} ${t('analytics.orders')}`
          })));
        } else {
          const response = await analyticsApi.getTopProducts(100);
          setItems(response.data.map((p: ProductSummary) => ({
            id: p.sku,
            name: p.sku,
            value: parseFloat(p.total_revenue_usd),
            subtitle: `${p.quantity_sold_m2.toLocaleString()} m²`
          })));
        }
      } catch (err) {
        setError(t('analytics.loadError'));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [groupBy, t]);

  const title = groupBy === 'customer'
    ? t('analytics.topCustomers')
    : t('analytics.topProducts');

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-white font-semibold mb-4">{title}</h3>
        <div className="flex items-center justify-center h-[200px]">
          <div className="text-slate-400">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-white font-semibold mb-4">{title}</h3>
        <p className="text-slate-400">{error || t('analytics.noData')}</p>
      </div>
    );
  }

  const maxValue = items[0]?.value || 0;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <div
        className="space-y-3 max-h-[400px] overflow-y-auto pr-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 #1e293b' }}
      >
        {items.map((item, index) => {
          const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

          return (
            <div
              key={item.id}
              className="group hover:bg-slate-700/30 rounded-lg p-2 -mx-2 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-500 w-8">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-slate-200 font-medium truncate">
                      {truncateName(item.name)}
                    </span>
                    <span className="text-emerald-400 font-semibold ml-2">
                      ${item.value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500/60 rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-slate-500 text-xs whitespace-nowrap">
                      {item.subtitle}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
