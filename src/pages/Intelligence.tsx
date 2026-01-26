import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  intelligenceApi,
  type IntelligenceDashboard,
  type ProductTrend,
  type CountryTrend,
  type CustomerTrend,
  type ProductSortBy,
  type CategoryMetrics,
  type CategoryInsight,
} from '../requests/intelligence';
import { MetricBox } from '../components/intelligence/MetricBox';
import { CountryCard } from '../components/intelligence/CountryCard';
import { ProductCard } from '../components/intelligence/ProductCard';
import { CustomerCard } from '../components/intelligence/CustomerCard';
import { ProductDetailPanel } from '../components/intelligence/ProductDetailPanel';
import { CustomerDetailPanel } from '../components/intelligence/CustomerDetailPanel';
import { Breadcrumb } from '../components/intelligence/Breadcrumb';
import { CategoryCard } from '../components/intelligence/CategoryCard';

type ViewType = 'region' | 'products' | 'customers' | 'categories';

export function Intelligence() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse URL parameters
  const urlView = searchParams.get('view') as ViewType | null;
  const urlCountry = searchParams.get('country');
  const urlStatus = searchParams.get('status');
  const urlProduct = searchParams.get('product');
  const urlCustomer = searchParams.get('customer');

  // State
  const [view, setView] = useState<ViewType>(urlView || 'region');
  const [periodDays, setPeriodDays] = useState(90);
  const [sortBy, setSortBy] = useState<ProductSortBy>('velocity');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [countryFilter, setCountryFilter] = useState<string | null>(urlCountry);
  const [statusFilter, setStatusFilter] = useState<string | null>(urlStatus);

  // Data states
  const [dashboard, setDashboard] = useState<IntelligenceDashboard | null>(null);
  const [products, setProducts] = useState<ProductTrend[]>([]);
  const [countries, setCountries] = useState<CountryTrend[]>([]);
  const [customers, setCustomers] = useState<CustomerTrend[]>([]);
  const [categories, setCategories] = useState<CategoryMetrics[]>([]);
  const [categoryInsights, setCategoryInsights] = useState<CategoryInsight[]>([]);

  // Panel states
  const [selectedProduct, setSelectedProduct] = useState<ProductTrend | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerTrend | null>(null);
  const [productPanelOpen, setProductPanelOpen] = useState(false);
  const [customerPanelOpen, setCustomerPanelOpen] = useState(false);

  // Update URL when state changes
  const updateUrl = useCallback((newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);

    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  // Sync URL params on initial load
  useEffect(() => {
    if (urlView && urlView !== view) {
      setView(urlView);
    }
    if (urlCountry !== countryFilter) {
      setCountryFilter(urlCountry);
    }
    if (urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
  }, []);

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
          const productData = await intelligenceApi.getProducts(periodDays, periodDays, sortBy);
          setProducts(productData);

          // If URL has product param, find and open panel
          if (urlProduct) {
            const product = productData.find(p => p.product_id === urlProduct);
            if (product) {
              setSelectedProduct(product);
              setProductPanelOpen(true);
            }
          }
        } else if (view === 'customers') {
          const customerData = await intelligenceApi.getCustomers(periodDays, periodDays);
          setCustomers(customerData);

          // If URL has customer param, find and open panel
          if (urlCustomer) {
            const customer = customerData.find(c => c.customer_normalized === urlCustomer);
            if (customer) {
              setSelectedCustomer(customer);
              setCustomerPanelOpen(true);
            }
          }
        } else if (view === 'categories') {
          const [categoryData, insightsData] = await Promise.all([
            intelligenceApi.getCategories(periodDays),
            intelligenceApi.getCategoryInsights(periodDays),
          ]);
          setCategories(categoryData);
          setCategoryInsights(insightsData);
        }
      } catch (err) {
        console.error('Failed to fetch intelligence data:', err);
        setError(t('intelligence.loadError'));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [view, periodDays, sortBy, t, urlProduct, urlCustomer]);

  // Filter customers based on country/status filters
  const filteredCustomers = customers.filter(c => {
    if (countryFilter && c.country_code !== countryFilter) return false;
    if (statusFilter && c.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    return true;
  });

  // Handlers
  const handleViewChange = (newView: ViewType) => {
    setView(newView);
    // Clear filters when changing view
    setCountryFilter(null);
    setStatusFilter(null);
    updateUrl({ view: newView, country: null, status: null, product: null, customer: null });
  };

  const handleCountryClick = (countryCode: string) => {
    setView('customers');
    setCountryFilter(countryCode);
    setStatusFilter(null);
    updateUrl({ view: 'customers', country: countryCode, status: null });
  };

  const handleProductClick = (product: ProductTrend) => {
    setSelectedProduct(product);
    setProductPanelOpen(true);
    updateUrl({ product: product.product_id });
  };

  const handleCustomerClick = (customer: CustomerTrend) => {
    setSelectedCustomer(customer);
    setCustomerPanelOpen(true);
    updateUrl({ customer: customer.customer_normalized });
  };

  const handleProductPanelClose = () => {
    setProductPanelOpen(false);
    setSelectedProduct(null);
    updateUrl({ product: null });
  };

  const handleCustomerPanelClose = () => {
    setCustomerPanelOpen(false);
    setSelectedCustomer(null);
    updateUrl({ customer: null });
  };

  const handleBreadcrumbBack = () => {
    setView('region');
    setCountryFilter(null);
    setStatusFilter(null);
    updateUrl({ view: 'region', country: null, status: null });
  };

  // View toggle buttons
  const viewOptions: { key: ViewType; label: string; icon: string }[] = [
    { key: 'region', label: t('intelligence.regionView'), icon: '🌎' },
    { key: 'products', label: t('intelligence.productsView'), icon: '📦' },
    { key: 'customers', label: t('intelligence.customersView'), icon: '👥' },
    { key: 'categories', label: t('intelligence.categoriesView', 'Categorías'), icon: '🏷️' },
  ];

  // Period options (30/60/90 days for trend analysis)
  const periodOptions = [
    { days: 30, label: '30d' },
    { days: 60, label: '60d' },
    { days: 90, label: '90d' },
  ];

  // Sort options for products view
  const sortOptions: { key: ProductSortBy; label: string; icon: string }[] = [
    { key: 'velocity', label: t('intelligence.sortVelocity', 'Velocidad'), icon: '📈' },
    { key: 'revenue', label: t('intelligence.sortRevenue', 'Ventas'), icon: '💰' },
  ];

  // Show breadcrumb when viewing filtered customers
  const showBreadcrumb = view === 'customers' && (countryFilter || statusFilter);

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

          {/* Period and Sort selectors */}
          <div className="flex items-center gap-4">
            {/* Period selector */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500 mr-1">{t('intelligence.period', 'Período')}:</span>
              {periodOptions.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => setPeriodDays(opt.days)}
                  className={`
                    px-2.5 py-1 rounded-lg text-sm font-medium transition-all
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

            {/* Sort selector (only in products view) */}
            {view === 'products' && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 mr-1">{t('intelligence.sortBy', 'Ordenar')}:</span>
                {sortOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSortBy(opt.key)}
                    className={`
                      px-2.5 py-1 rounded-lg text-sm font-medium transition-all flex items-center gap-1
                      ${sortBy === opt.key
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                      }
                    `}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
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
              onClick={() => handleViewChange(opt.key)}
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

        {/* Breadcrumb for filtered views */}
        {showBreadcrumb && (
          <Breadcrumb
            currentView={view}
            filterLabel={countryFilter || statusFilter || undefined}
            onBack={handleBreadcrumbBack}
          />
        )}

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
              onClick={() => handleViewChange(view)}
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
                  <CountryCard
                    key={country.country_code}
                    country={country}
                    index={index}
                    onClick={handleCountryClick}
                  />
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
                    onClick={handleProductClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Customers View */}
        {!loading && !error && view === 'customers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <span>👥</span>
                <span>{t('intelligence.byCustomer')}</span>
                {(countryFilter || statusFilter) && (
                  <span className="text-slate-400 text-sm font-normal">
                    ({filteredCustomers.length} de {customers.length})
                  </span>
                )}
              </h2>

              {/* Status filter pills (when not filtered by country) */}
              {!countryFilter && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setStatusFilter(null);
                      updateUrl({ status: null });
                    }}
                    className={`
                      px-3 py-1 rounded-full text-xs font-medium transition-all
                      ${!statusFilter
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                      }
                    `}
                  >
                    {t('intelligence.filters.allStatuses')}
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('active');
                      updateUrl({ status: 'active' });
                    }}
                    className={`
                      px-3 py-1 rounded-full text-xs font-medium transition-all
                      ${statusFilter === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-emerald-500/10'
                      }
                    `}
                  >
                    Activos
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('cooling');
                      updateUrl({ status: 'cooling' });
                    }}
                    className={`
                      px-3 py-1 rounded-full text-xs font-medium transition-all
                      ${statusFilter === 'cooling'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-amber-500/10'
                      }
                    `}
                  >
                    Enfriándose
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('dormant');
                      updateUrl({ status: 'dormant' });
                    }}
                    className={`
                      px-3 py-1 rounded-full text-xs font-medium transition-all
                      ${statusFilter === 'dormant'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-rose-500/10'
                      }
                    `}
                  >
                    Dormidos
                  </button>
                </div>
              )}
            </div>

            {filteredCustomers.length === 0 ? (
              <p className="text-slate-500 text-center py-10">{t('intelligence.noData')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomers.map((customer, index) => (
                  <CustomerCard
                    key={customer.customer_normalized}
                    customer={customer}
                    index={index}
                    onClick={handleCustomerClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories View */}
        {!loading && !error && view === 'categories' && (
          <div className="space-y-6">
            {/* Insights Banner */}
            {categoryInsights.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <span>💡</span>
                  <span>{t('intelligence.insights', 'Insights')}</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryInsights.map((insight, index) => (
                    <div
                      key={`${insight.category}-${insight.insight_type}-${index}`}
                      className={`
                        p-4 rounded-xl border transition-all
                        ${insight.severity === 'CRITICAL'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          : insight.severity === 'WARNING'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">
                          {insight.severity === 'CRITICAL' ? '🚨' : insight.severity === 'WARNING' ? '⚠️' : '💡'}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{insight.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {insight.insight_type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Categories Grid */}
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                <span>🏷️</span>
                <span>{t('intelligence.byCategory', 'Por Categoría')}</span>
              </h2>
              {categories.length === 0 ? (
                <p className="text-slate-500 text-center py-10">{t('intelligence.noData')}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {categories.map((category, index) => (
                    <CategoryCard
                      key={category.category}
                      category={category}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Product Detail Panel */}
      <ProductDetailPanel
        product={selectedProduct}
        isOpen={productPanelOpen}
        onClose={handleProductPanelClose}
      />

      {/* Customer Detail Panel */}
      <CustomerDetailPanel
        customer={selectedCustomer}
        isOpen={customerPanelOpen}
        onClose={handleCustomerPanelClose}
      />
    </div>
  );
}
