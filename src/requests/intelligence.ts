import api from './api';

// ===================
// TYPES
// ===================

export type TrendDirection = 'UP' | 'DOWN' | 'STABLE';
export type TrendStrength = 'STRONG' | 'MODERATE' | 'WEAK';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type CustomerTier = 'A' | 'B' | 'C';
export type CustomerStatus = 'ACTIVE' | 'COOLING' | 'DORMANT';
export type Predictability = 'CLOCKWORK' | 'PREDICTABLE' | 'MODERATE' | 'ERRATIC';

export interface SparklinePoint {
  period: string;
  value: number;
}

export interface ProductTrend {
  product_id: string;
  sku: string;
  category: string;
  rotation: string | null;

  // Volume metrics
  total_m2: number;
  avg_weekly_m2: number;
  daily_velocity_m2: number;
  velocity_change_pct: number;

  // Stock metrics
  days_of_stock: number | null;
  current_stock_m2: number | null;
  in_transit_m2: number | null;
  days_with_transit: number | null;

  // Revenue metrics
  total_revenue_usd: number;
  avg_weekly_revenue_usd: number;

  // Trend analysis
  trend_direction: TrendDirection;
  trend_strength: TrendStrength;
  confidence: ConfidenceLevel;
  cv: number;

  // Visualization
  sparkline: SparklinePoint[];
  sample_weeks: number;
}

export interface CountryBreakdown {
  country_code: string;
  country_name: string;
  total_m2: number;
  total_revenue_usd: number;
  customer_count: number;
  pct_of_total: number;
}

export interface CountryTrend {
  country_code: string;
  country_name: string;

  // Volume
  total_m2: number;
  avg_weekly_m2: number;
  velocity_change_pct: number;

  // Revenue
  total_revenue_usd: number;
  pct_of_total_revenue: number;

  // Trend
  trend_direction: TrendDirection;
  trend_strength: TrendStrength;
  confidence: ConfidenceLevel;

  // Customers
  customer_count: number;
  top_customers: string[];

  // Visualization
  sparkline: SparklinePoint[];
}

export interface ProductPurchase {
  sku: string;
  category: string;
  total_m2: number;
  total_revenue_usd: number;
  purchase_count: number;
}

export interface ProductMixChange {
  sku: string;
  previous_pct: number;
  current_pct: number;
  change_pct: number;
}

export interface CustomerTrend {
  customer_normalized: string;
  country_code: string;
  country_name: string;

  // Classification
  tier: CustomerTier;
  status: CustomerStatus;

  // Volume
  total_m2: number;
  avg_order_m2: number;

  // Revenue
  total_revenue_usd: number;
  avg_order_revenue_usd: number;
  revenue_rank: number;

  // Activity
  order_count: number;
  first_order_date: string | null;
  last_order_date: string | null;
  days_since_last_order: number | null;

  // Trend
  trend_direction: TrendDirection;
  trend_strength: TrendStrength;
  confidence: ConfidenceLevel;
  velocity_change_pct: number;

  // Product mix
  top_products: ProductPurchase[];
  product_mix_changes: ProductMixChange[];

  // Visualization
  sparkline: SparklinePoint[];

  // Pattern data (from customer_patterns table)
  avg_gap_days: number | null;
  gap_std_days: number | null;
  coefficient_of_variation: number | null;
  predictability: Predictability | null;
  expected_next_date: string | null;
  days_overdue: number;
  avg_order_usd: number | null;
}

export interface IntelligenceDashboard {
  period_days: number;
  comparison_days: number;

  // Summary metrics
  total_revenue_usd: number;
  total_m2_sold: number;
  unique_customers: number;
  unique_products: number;

  // Breakdowns
  countries: CountryBreakdown[];
  top_products: ProductTrend[];
  top_customers: CustomerTrend[];
}

// ===================
// OVERDUE CUSTOMER TYPES
// ===================

export interface OverdueCustomer {
  customer_normalized: string;
  order_count: number;
  avg_gap_days: number | null;
  gap_std_days: number | null;
  coefficient_of_variation: number | null;
  first_order_date: string | null;
  last_order_date: string | null;
  expected_next_date: string | null;
  days_since_last: number;
  days_overdue: number;
  total_volume_m2: number;
  total_revenue_usd: number;
  avg_order_m2: number;
  avg_order_usd: number;
  tier: CustomerTier;
  predictability: Predictability;
}

export interface OverdueSummary {
  total_overdue: number;
  total_value_at_risk: number;
  tier_a_overdue: number;
  tier_b_overdue: number;
  tier_c_overdue: number;
  most_overdue: {
    customer: string;
    days_overdue: number;
  } | null;
}

// ===================
// API FUNCTIONS
// ===================

// Response wrapper types (what API actually returns)
interface DashboardResponse {
  total_revenue_usd: string;
  total_volume_m2: string;
  active_customers: number;
  active_products: number;
  top_growing_products: ApiProductTrend[];
  top_customers: ApiCustomerTrend[];
  country_breakdown: ApiCountryBreakdown[];
}

interface CountriesResponse {
  countries: ApiCountryBreakdown[];
  total_revenue_usd: string;
}

interface ApiProductTrend {
  product_id: string;
  sku: string;
  category: string;
  current_velocity_m2_day: string;
  previous_velocity_m2_day: string;
  velocity_change_pct: string;
  total_volume_m2: string;
  total_revenue_usd: string;
  direction: string;
  strength: string;
  coefficient_of_variation: string;
  confidence: string;
  sample_count: number;
  days_of_stock: number;
  current_stock_m2: string | null;
  in_transit_m2: string | null;
  days_with_transit: number | null;
  sparkline: { period: string; value: string }[];
}

interface ApiCountryBreakdown {
  country_code: string;
  country_name: string;
  total_revenue_usd: string;
  total_volume_m2: string;
  customer_count: number;
  order_count: number;
  revenue_share_pct: string;
  // New fields from enhanced backend
  velocity_change_pct: string;
  direction: string;
  strength: string;
  confidence: string;
  top_customers: string[];
  sparkline: { period: string; value: string }[];
}

interface ApiCustomerTrend {
  customer_normalized: string;
  customer_original: string;
  tier: string;
  status: string;
  country_code: string;
  total_revenue_usd: string;
  period_revenue_usd: string;
  revenue_change_pct: string;
  total_volume_m2: string;
  period_volume_m2: string;
  order_count: number;
  avg_order_value_usd: string;
  first_purchase: string | null;
  last_purchase: string | null;
  days_since_last_purchase: number | null;
  avg_days_between_orders: string;
  top_products: { product_id: string; sku: string; total_m2: string; total_usd: string; purchase_count: number }[];
  product_mix_changes: { sku: string; previous_share_pct: string; current_share_pct: string; change_pct: string }[];
  direction: string;
  confidence: string;
  sparkline: { period: string; value: string }[];
  // Pattern data (from customer_patterns join)
  avg_gap_days?: string | null;
  gap_std_days?: string | null;
  coefficient_of_variation?: string | null;
  predictability?: string | null;
  expected_next_date?: string | null;
  days_overdue?: number;
  avg_order_usd?: string | null;
}

// Transform functions
function transformProduct(p: ApiProductTrend): ProductTrend {
  const velocityChange = parseFloat(p.velocity_change_pct);
  const dailyVelocity = parseFloat(p.current_velocity_m2_day);
  return {
    product_id: p.product_id,
    sku: p.sku,
    category: p.category,
    rotation: null,
    total_m2: parseFloat(p.total_volume_m2),
    avg_weekly_m2: dailyVelocity * 7,
    daily_velocity_m2: dailyVelocity,
    velocity_change_pct: velocityChange,
    days_of_stock: p.days_of_stock != null && isFinite(p.days_of_stock) ? p.days_of_stock : null,
    current_stock_m2: p.current_stock_m2 ? parseFloat(p.current_stock_m2) : null,
    in_transit_m2: p.in_transit_m2 ? parseFloat(p.in_transit_m2) : null,
    days_with_transit: p.days_with_transit != null && isFinite(p.days_with_transit) ? p.days_with_transit : null,
    total_revenue_usd: parseFloat(p.total_revenue_usd),
    avg_weekly_revenue_usd: parseFloat(p.total_revenue_usd) / (p.sample_count || 1),
    trend_direction: p.direction.toUpperCase() as TrendDirection,
    trend_strength: p.strength.toUpperCase() as TrendStrength,
    confidence: p.confidence.toUpperCase() as ConfidenceLevel,
    cv: parseFloat(p.coefficient_of_variation),
    sparkline: p.sparkline.map(s => ({ period: s.period, value: parseFloat(s.value) })),
    sample_weeks: p.sample_count,
  };
}

function transformCountry(c: ApiCountryBreakdown, _totalRevenue: number): CountryTrend {
  return {
    country_code: c.country_code,
    country_name: c.country_name,
    total_m2: parseFloat(c.total_volume_m2),
    avg_weekly_m2: parseFloat(c.total_volume_m2) / 52,
    velocity_change_pct: parseFloat(c.velocity_change_pct),
    total_revenue_usd: parseFloat(c.total_revenue_usd),
    pct_of_total_revenue: parseFloat(c.revenue_share_pct),
    trend_direction: c.direction.toUpperCase() as TrendDirection,
    trend_strength: c.strength.toUpperCase() as TrendStrength,
    confidence: c.confidence.toUpperCase() as ConfidenceLevel,
    customer_count: c.customer_count,
    top_customers: c.top_customers,
    sparkline: c.sparkline.map(s => ({ period: s.period, value: parseFloat(s.value) })),
  };
}

function transformCustomer(c: ApiCustomerTrend, index: number): CustomerTrend {
  const velocityChange = parseFloat(c.revenue_change_pct);
  return {
    customer_normalized: c.customer_normalized,
    country_code: c.country_code,
    country_name: c.country_code === 'GT' ? 'Guatemala' : c.country_code === 'SV' ? 'El Salvador' : c.country_code,
    tier: c.tier.toUpperCase() as CustomerTier,
    status: c.status.toUpperCase() as CustomerStatus,
    total_m2: parseFloat(c.total_volume_m2),
    avg_order_m2: parseFloat(c.total_volume_m2) / (c.order_count || 1),
    total_revenue_usd: parseFloat(c.total_revenue_usd),
    avg_order_revenue_usd: parseFloat(c.avg_order_value_usd),
    revenue_rank: index + 1,
    order_count: c.order_count,
    first_order_date: c.first_purchase,
    last_order_date: c.last_purchase,
    days_since_last_order: c.days_since_last_purchase,
    trend_direction: c.direction?.toUpperCase() as TrendDirection || 'STABLE',
    trend_strength: velocityChange > 20 ? 'STRONG' : velocityChange > 5 ? 'MODERATE' : 'WEAK',
    confidence: c.confidence?.toUpperCase() as ConfidenceLevel || 'MEDIUM',
    velocity_change_pct: velocityChange,
    top_products: c.top_products.map(p => ({
      sku: p.sku,
      category: '',
      total_m2: parseFloat(p.total_m2),
      total_revenue_usd: parseFloat(p.total_usd),
      purchase_count: p.purchase_count,
    })),
    product_mix_changes: c.product_mix_changes.map(m => ({
      sku: m.sku,
      previous_pct: parseFloat(m.previous_share_pct),
      current_pct: parseFloat(m.current_share_pct),
      change_pct: parseFloat(m.change_pct),
    })),
    sparkline: c.sparkline.map(s => ({ period: s.period, value: parseFloat(s.value) })),
    // Pattern data
    avg_gap_days: c.avg_gap_days ? parseFloat(c.avg_gap_days) : null,
    gap_std_days: c.gap_std_days ? parseFloat(c.gap_std_days) : null,
    coefficient_of_variation: c.coefficient_of_variation ? parseFloat(c.coefficient_of_variation) : null,
    predictability: c.predictability?.toUpperCase() as Predictability || null,
    expected_next_date: c.expected_next_date || null,
    days_overdue: c.days_overdue ?? 0,
    avg_order_usd: c.avg_order_usd ? parseFloat(c.avg_order_usd) : null,
  };
}

// Sort options for products
export type ProductSortBy = 'velocity' | 'revenue' | 'volume';

// ===================
// CATEGORY TYPES
// ===================

export type InsightType = 'IMBALANCE' | 'GROWTH_OPPORTUNITY' | 'RISK' | 'LOW_COVERAGE';
export type InsightSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface CategoryMetrics {
  category: string;
  warehouse_m2: number;
  warehouse_pct: number;
  product_count: number;
  total_velocity_m2_day: number;
  avg_velocity_m2_day: number;
  velocity_change_pct: number;
  trend_direction: TrendDirection;
  trend_strength: TrendStrength;
  avg_warehouse_days: number | null;
  products_at_risk: number;
}

export interface CategoryInsight {
  category: string;
  insight_type: InsightType;
  message: string;
  severity: InsightSeverity;
}

interface ApiCategoryMetrics {
  category: string;
  warehouse_m2: string;
  warehouse_pct: string;
  product_count: number;
  total_velocity_m2_day: string;
  avg_velocity_m2_day: string;
  velocity_change_pct: string;
  trend_direction: string;
  trend_strength: string;
  avg_warehouse_days: string | null;
  products_at_risk: number;
}

interface ApiCategoryInsight {
  category: string;
  insight_type: string;
  message: string;
  severity: string;
}

function transformCategoryMetrics(c: ApiCategoryMetrics): CategoryMetrics {
  return {
    category: c.category,
    warehouse_m2: parseFloat(c.warehouse_m2),
    warehouse_pct: parseFloat(c.warehouse_pct),
    product_count: c.product_count,
    total_velocity_m2_day: parseFloat(c.total_velocity_m2_day),
    avg_velocity_m2_day: parseFloat(c.avg_velocity_m2_day),
    velocity_change_pct: parseFloat(c.velocity_change_pct),
    trend_direction: c.trend_direction.toUpperCase() as TrendDirection,
    trend_strength: c.trend_strength.toUpperCase() as TrendStrength,
    avg_warehouse_days: c.avg_warehouse_days ? parseFloat(c.avg_warehouse_days) : null,
    products_at_risk: c.products_at_risk,
  };
}

export const intelligenceApi = {
  getDashboard: async (periodDays = 90, comparisonDays = 90): Promise<IntelligenceDashboard> => {
    const response = await api.get<DashboardResponse>('/intelligence/dashboard', {
      params: { period_days: periodDays, comparison_days: comparisonDays }
    });
    const d = response.data;
    return {
      period_days: periodDays,
      comparison_days: comparisonDays,
      total_revenue_usd: parseFloat(d.total_revenue_usd),
      total_m2_sold: parseFloat(d.total_volume_m2),
      unique_customers: d.active_customers,
      unique_products: d.active_products,
      countries: d.country_breakdown.map(c => ({
        country_code: c.country_code,
        country_name: c.country_name,
        total_m2: parseFloat(c.total_volume_m2),
        total_revenue_usd: parseFloat(c.total_revenue_usd),
        customer_count: c.customer_count,
        pct_of_total: parseFloat(c.revenue_share_pct),
      })),
      top_products: d.top_growing_products.map(transformProduct),
      top_customers: d.top_customers.map(transformCustomer),
    };
  },

  getProducts: async (periodDays = 90, comparisonDays = 90, sortBy: ProductSortBy = 'velocity'): Promise<ProductTrend[]> => {
    const response = await api.get<ApiProductTrend[]>('/intelligence/products', {
      params: { period_days: periodDays, comparison_days: comparisonDays, sort_by: sortBy }
    });
    return response.data.map(transformProduct);
  },

  getCountries: async (periodDays = 90, comparisonDays = 90): Promise<CountryTrend[]> => {
    const response = await api.get<CountriesResponse>('/intelligence/countries', {
      params: { period_days: periodDays, comparison_days: comparisonDays }
    });
    const totalRevenue = parseFloat(response.data.total_revenue_usd);
    return response.data.countries.map(c => transformCountry(c, totalRevenue));
  },

  getCustomers: async (periodDays = 90, comparisonDays = 90): Promise<CustomerTrend[]> => {
    const response = await api.get<ApiCustomerTrend[]>('/intelligence/customers', {
      params: { period_days: periodDays, comparison_days: comparisonDays }
    });
    return response.data.map(transformCustomer);
  },

  // ===================
  // OVERDUE CUSTOMERS
  // ===================

  getOverdueSummary: async (): Promise<OverdueSummary> => {
    const response = await api.get<OverdueSummary>('/intelligence/patterns/overdue/summary');
    return response.data;
  },

  getOverdueCustomers: async (minDays = 1, tier?: string, limit = 50): Promise<OverdueCustomer[]> => {
    const response = await api.get<OverdueCustomer[]>('/intelligence/patterns/overdue', {
      params: { min_days: minDays, tier, limit }
    });
    return response.data;
  },

  refreshPatterns: async (): Promise<{ success: boolean; patterns_updated: number }> => {
    const response = await api.post<{ success: boolean; patterns_updated: number }>('/intelligence/patterns/refresh');
    return response.data;
  },

  // ===================
  // CATEGORY ANALYSIS
  // ===================

  getCategories: async (periodDays = 90): Promise<CategoryMetrics[]> => {
    const response = await api.get<ApiCategoryMetrics[]>('/intelligence/categories', {
      params: { period_days: periodDays }
    });
    return response.data.map(transformCategoryMetrics);
  },

  getCategoryInsights: async (periodDays = 90): Promise<CategoryInsight[]> => {
    const response = await api.get<ApiCategoryInsight[]>('/intelligence/categories/insights', {
      params: { period_days: periodDays }
    });
    return response.data.map(i => ({
      category: i.category,
      insight_type: i.insight_type as InsightType,
      message: i.message,
      severity: i.severity as InsightSeverity,
    }));
  },
};
