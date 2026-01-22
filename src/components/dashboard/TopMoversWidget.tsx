import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { intelligenceApi, type ProductTrend } from '../../requests/intelligence';
import { MiniSparkline } from './MiniSparkline';
import { TrendIndicator } from './TrendIndicator';

interface TopMoversWidgetProps {
  periodDays?: number;
}

export function TopMoversWidget({ periodDays = 365 }: TopMoversWidgetProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await intelligenceApi.getProducts(periodDays, periodDays);
        setProducts(data);
      } catch (err) {
        setError(t('dashboard.widgets.loadError'));
        console.error('Failed to fetch top movers:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [periodDays, t]);

  if (loading) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <span className="text-lg">📈</span>
            <span>{t('dashboard.widgets.topMovers.title')}</span>
          </h3>
        </div>
        <div className="flex items-center justify-center h-[200px]">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <span className="text-lg">📈</span>
            <span>{t('dashboard.widgets.topMovers.title')}</span>
          </h3>
        </div>
        <p className="text-slate-400 text-center py-8">{error}</p>
      </div>
    );
  }

  // Separate rising and falling products
  const risingProducts = products
    .filter(p => p.trend_direction === 'UP')
    .sort((a, b) => b.velocity_change_pct - a.velocity_change_pct)
    .slice(0, 3);

  const fallingProducts = products
    .filter(p => p.trend_direction === 'DOWN')
    .sort((a, b) => a.velocity_change_pct - b.velocity_change_pct)
    .slice(0, 2);

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <span className="text-lg">📈</span>
          <span>{t('dashboard.widgets.topMovers.title')}</span>
        </h3>
        <Link
          to="/intelligence?view=products"
          className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
        >
          {t('dashboard.widgets.topMovers.viewMore')} →
        </Link>
      </div>

      {/* Rising Section */}
      {risingProducts.length > 0 && (
        <div className="mb-4">
          <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wide mb-2">
            {t('dashboard.widgets.topMovers.rising')}
          </p>
          <div className="space-y-2">
            {risingProducts.map((product) => (
              <ProductRow
                key={product.product_id}
                product={product}
                trend="up"
              />
            ))}
          </div>
        </div>
      )}

      {/* Falling Section */}
      {fallingProducts.length > 0 && (
        <div>
          <p className="text-rose-400 text-xs font-semibold uppercase tracking-wide mb-2">
            {t('dashboard.widgets.topMovers.falling')}
          </p>
          <div className="space-y-2">
            {fallingProducts.map((product) => (
              <ProductRow
                key={product.product_id}
                product={product}
                trend="down"
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {risingProducts.length === 0 && fallingProducts.length === 0 && (
        <p className="text-slate-500 text-center py-8">
          {t('dashboard.widgets.topMovers.noData')}
        </p>
      )}
    </div>
  );
}

interface ProductRowProps {
  product: ProductTrend;
  trend: 'up' | 'down';
}

function ProductRow({ product, trend }: ProductRowProps) {
  const sparklineData = product.sparkline.map(p => p.value);

  return (
    <div className={`
      flex items-center justify-between gap-3 p-2 rounded-lg
      ${trend === 'up' ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'bg-rose-500/5 hover:bg-rose-500/10'}
      transition-colors cursor-pointer
    `}>
      {/* Product name - truncated */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">
          {product.sku}
        </p>
      </div>

      {/* Mini sparkline */}
      <div className="flex-shrink-0">
        <MiniSparkline
          data={sparklineData}
          trend={trend}
          width={50}
          height={16}
        />
      </div>

      {/* Trend indicator */}
      <div className="flex-shrink-0 w-16 text-right">
        <TrendIndicator
          direction={trend}
          changePct={product.velocity_change_pct}
        />
      </div>
    </div>
  );
}
