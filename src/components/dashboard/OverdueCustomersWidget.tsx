import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { intelligenceApi, type OverdueSummary, type OverdueCustomer } from '../../requests/intelligence';

interface Props {
  limit?: number;
}

export function OverdueCustomersWidget({ limit = 5 }: Props) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<OverdueSummary | null>(null);
  const [topOverdue, setTopOverdue] = useState<OverdueCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [summaryData, overdueData] = await Promise.all([
          intelligenceApi.getOverdueSummary(),
          intelligenceApi.getOverdueCustomers(1, undefined, limit),
        ]);
        setSummary(summaryData);
        setTopOverdue(overdueData);
      } catch (err) {
        console.error('Failed to fetch overdue data:', err);
        setError(t('dashboard.overdueLoadError'));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [limit, t]);

  // Tier badge styles
  const tierStyles: Record<string, string> = {
    A: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    B: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    C: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
  };

  // Severity based on days overdue
  const getSeverity = (daysOverdue: number): 'danger' | 'warning' | 'info' => {
    if (daysOverdue > 60) return 'danger';
    if (daysOverdue > 30) return 'warning';
    return 'info';
  };

  const severityStyles = {
    danger: { dot: 'bg-rose-500', text: 'text-rose-400' },
    warning: { dot: 'bg-amber-500', text: 'text-amber-400' },
    info: { dot: 'bg-sky-500', text: 'text-sky-400' },
  };

  if (loading) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <span className="text-rose-400">!</span>
            {t('dashboard.overdueCustomers')}
          </h3>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <span className="text-rose-400">!</span>
            {t('dashboard.overdueCustomers')}
          </h3>
        </div>
        <div className="text-center text-slate-400 py-8">
          <p>{error || t('dashboard.noOverdueData')}</p>
        </div>
      </div>
    );
  }

  return (
    <Link
      to="/intelligence"
      className="block bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5 shadow-[0_0_30px_rgba(239,68,68,0.1)] hover:border-rose-500/30 transition-all duration-300 group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <span className="text-rose-400">!</span>
          {t('dashboard.overdueCustomers')}
        </h3>
        <span className="text-slate-400 text-sm group-hover:text-rose-400 transition-colors">
          {t('dashboard.viewAll')} →
        </span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="text-3xl font-bold text-rose-400">{summary.total_overdue}</div>
          <div className="text-slate-400 text-sm">{t('dashboard.overdueCount')}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-amber-400">
            ${summary.total_value_at_risk.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-slate-400 text-sm">{t('dashboard.valueAtRisk')}</div>
        </div>
      </div>

      {/* Tier Breakdown */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 bg-slate-800/50 rounded-lg px-3 py-2 text-center">
          <span className="text-amber-400 font-semibold">{summary.tier_a_overdue}</span>
          <span className="text-slate-500 text-sm ml-1">Tier A</span>
        </div>
        <div className="flex-1 bg-slate-800/50 rounded-lg px-3 py-2 text-center">
          <span className="text-slate-300 font-semibold">{summary.tier_b_overdue}</span>
          <span className="text-slate-500 text-sm ml-1">Tier B</span>
        </div>
        <div className="flex-1 bg-slate-800/50 rounded-lg px-3 py-2 text-center">
          <span className="text-slate-400 font-semibold">{summary.tier_c_overdue}</span>
          <span className="text-slate-500 text-sm ml-1">Tier C</span>
        </div>
      </div>

      {/* Top Overdue List */}
      {topOverdue.length > 0 && (
        <div className="space-y-2">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">
            {t('dashboard.topOverdue')}
          </div>
          {topOverdue.map((customer) => {
            const severity = getSeverity(customer.days_overdue);
            const styles = severityStyles[severity];
            return (
              <div
                key={customer.customer_normalized}
                className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full ${styles.dot} flex-shrink-0`}></span>
                  <span className="text-slate-200 text-sm truncate">
                    {customer.customer_normalized}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${tierStyles[customer.tier]}`}>
                    {customer.tier}
                  </span>
                </div>
                <div className={`text-sm font-medium ${styles.text} flex-shrink-0 ml-2`}>
                  {customer.days_overdue}d
                </div>
              </div>
            );
          })}
        </div>
      )}

      {topOverdue.length === 0 && summary.total_overdue === 0 && (
        <div className="text-center py-4">
          <span className="text-emerald-400 text-lg">✓</span>
          <p className="text-slate-400 text-sm mt-1">{t('dashboard.noOverdueCustomers')}</p>
        </div>
      )}
    </Link>
  );
}
