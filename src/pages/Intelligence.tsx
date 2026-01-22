import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  intelligenceApi,
  type IntelligenceDashboard,
  type ProductTrend,
  type CountryTrend,
  type CustomerTrend,
} from '../requests/intelligence';
import { MetricBox } from '../components/intelligence/MetricBox';
import { CountryCard } from '../components/intelligence/CountryCard';
import { ProductCard } from '../components/intelligence/ProductCard';
import { CustomerCard } from '../components/intelligence/CustomerCard';

type ViewType = 'region' | 'products' | 'customers';

export function Intelligence() {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewType>('region');
  const [periodDays, setPeriodDays] = useState(365); // Default to 365 for more data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [dashboard, setDashboard] = useState<IntelligenceDashboard | null>(null);
  const [products, setProducts] = useState<ProductTrend[]>([]);
  const [countries, setCountries] = useState<CountryTrend[]>([]);
  const [customers, setCustomers] = useState<CustomerTrend[]>([]);

  // Fetch data based on view
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Always fetch dashboard for summary metrics
        const dashboardData = await intelligenceApi.getDashboard(periodDays, periodDays);
        setDashboard(dashboardData);

        // Fetch view-specific data
        if (view === 'region') {
          const countryData = await intelligenceApi.getCountries(periodDays, periodDays);
          setCountries(countryData);
        } else if (view === 'products') {
          const productData = await intelligenceApi.getProducts(periodDays, periodDays);
          setProducts(productData);
        } else if (view === 'customers') {
          const customerData = await intelligenceApi.getCustomers(periodDays, periodDays);
          setCustomers(customerData);
        }
      } catch (err) {
        console.error('Failed to fetch intelligence data:', err);
        setError(t('intelligence.loadError'));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [view, periodDays, t]);

  // View toggle buttons
  const viewOptions: { key: ViewType; label: string; icon: string }[] = [
    { key: 'region', label: t('intelligence.regionView'), icon: '🌎' },
    { key: 'products', label: t('intelligence.productsView'), icon: '📦' },
    { key: 'customers', label: t('intelligence.customersView'), icon: '👥' },
  ];

  // Period options
  const periodOptions = [
    { days: 90, label: '90 días' },
    { days: 180, label: '6 meses' },
    { days: 365, label: '1 año' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {t('intelligence.title')}
            </h1>
            <p className="text-slate-400 mt-1">{t('intelligence.subtitle')}</p>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-2">
            {periodOptions.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setPeriodDays(opt.days)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${periodDays === opt.days
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Metrics */}
        {dashboard && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <MetricBox
              label={t('intelligence.totalRevenue')}
              value={dashboard.total_revenue_usd}
              format="currency"
              glowColor="emerald"
            />
            <MetricBox
              label={t('intelligence.totalVolume')}
              value={dashboard.total_m2_sold}
              format="m2"
              glowColor="indigo"
            />
            <MetricBox
              label={t('intelligence.uniqueCustomers')}
              value={dashboard.unique_customers}
              format="number"
              glowColor="amber"
            />
            <MetricBox
              label={t('intelligence.uniqueProducts')}
              value={dashboard.unique_products}
              format="number"
              glowColor="rose"
            />
          </div>
        )}

        {/* View Toggle */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {viewOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setView(opt.key)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${view === opt.key
                  ? 'bg-slate-800 text-white border border-slate-600 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                  : 'bg-slate-800/30 text-slate-400 border border-slate-700/50 hover:bg-slate-800/50 hover:text-white'
                }
              `}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-400">{t('common.loading')}</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-rose-400 mb-4">{error}</p>
            <button
              onClick={() => setView(view)} // Re-trigger fetch
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {/* Region View */}
        {!loading && !error && view === 'region' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <span>🌎</span>
              <span>{t('intelligence.byCountry')}</span>
            </h2>
            {countries.length === 0 ? (
              <p className="text-slate-500 text-center py-10">{t('intelligence.noData')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {countries.map((country, index) => (
                  <CountryCard key={country.country_code} country={country} index={index} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Products View */}
        {!loading && !error && view === 'products' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <span>📦</span>
              <span>{t('intelligence.byProduct')}</span>
            </h2>
            {products.length === 0 ? (
              <p className="text-slate-500 text-center py-10">{t('intelligence.noData')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product, index) => (
                  <ProductCard
                    key={product.product_id}
                    product={product}
                    index={index}
                    rank={index + 1}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Customers View */}
        {!loading && !error && view === 'customers' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <span>👥</span>
              <span>{t('intelligence.byCustomer')}</span>
            </h2>
            {customers.length === 0 ? (
              <p className="text-slate-500 text-center py-10">{t('intelligence.noData')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customers.map((customer, index) => (
                  <CustomerCard
                    key={customer.customer_normalized}
                    customer={customer}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
