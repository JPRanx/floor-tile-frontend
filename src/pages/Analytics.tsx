import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SummaryCard } from '../components/analytics/SummaryCard';
import { SankeyDiagram } from '../components/analytics/SankeyDiagram';
import { LeaderboardPanel } from '../components/analytics/LeaderboardPanel';
import { ShipmentCostsPanel } from '../components/analytics/ShipmentCostsPanel';
import { analyticsApi } from '../requests/analytics';
import type { FinancialOverview } from '../requests/analytics';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function Analytics() {
  const { t } = useTranslation();
  const [data, setData] = useState<FinancialOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'customer' | 'product'>('customer');

  useEffect(() => {
    async function fetchData() {
      try {
        const overview = await analyticsApi.getOverview();
        setData(overview);
      } catch (err) {
        setError(t('analytics.loadError'));
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  // Parse values (API returns strings for Decimal)
  const revenue = parseFloat(data?.revenue || '0');
  const costs = parseFloat(data?.costs || '0');
  const marginPct = parseFloat(data?.margin_pct || '0');

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <h1 className="text-3xl font-bold text-white mb-8">
          {t('analytics.title')}
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SummaryCard
            title={t('analytics.revenue')}
            value={revenue}
            format="currency"
            glowColor="green"
          />
          <SummaryCard
            title={t('analytics.costs')}
            value={costs}
            format="currency"
            glowColor="blue"
          />
          <SummaryCard
            title={t('analytics.margin')}
            value={marginPct}
            format="percent"
            glowColor="gold"
          />
        </div>

        {/* Money Flow Sankey Diagram */}
        <div className="mb-8">
          <SankeyDiagram groupBy={groupBy} onGroupByChange={setGroupBy} />
        </div>

        {/* Bottom Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LeaderboardPanel groupBy={groupBy} />
          <ShipmentCostsPanel />
        </div>
      </div>
    </div>
  );
}
