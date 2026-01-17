import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { analyticsApi } from '../../requests/analytics';
import type { CustomerSummary } from '../../requests/analytics';

function truncateName(name: string, maxLength = 30): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 3) + '...';
}

export function TopCustomersPanel() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await analyticsApi.getCustomers(5);
        setCustomers(response.data);
      } catch (err) {
        setError(t('analytics.loadError'));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [t]);

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-white font-semibold mb-4">{t('analytics.topCustomers')}</h3>
        <div className="flex items-center justify-center h-[200px]">
          <div className="text-slate-400">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (error || customers.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-white font-semibold mb-4">{t('analytics.topCustomers')}</h3>
        <p className="text-slate-400">{error || t('analytics.noData')}</p>
      </div>
    );
  }

  const maxRevenue = parseFloat(customers[0]?.total_revenue_usd || '0');

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
      <h3 className="text-white font-semibold mb-4">{t('analytics.topCustomers')}</h3>
      <div className="space-y-4">
        {customers.map((customer, index) => {
          const revenue = parseFloat(customer.total_revenue_usd);
          const barWidth = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;

          return (
            <div
              key={customer.customer_normalized}
              className="group hover:bg-slate-700/30 rounded-lg p-2 -mx-2 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-500 w-8">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-slate-200 font-medium truncate">
                      {truncateName(customer.customer_normalized)}
                    </span>
                    <span className="text-emerald-400 font-semibold ml-2">
                      ${revenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
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
                      {customer.order_count} {t('analytics.orders')}
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
