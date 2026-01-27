import api from './api';

export type OrderBuilderAlertType = 'warning' | 'blocked' | 'suggestion';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type Priority = 'HIGH_PRIORITY' | 'CONSIDER' | 'WELL_COVERED' | 'YOUR_CALL';
export type Urgency = 'critical' | 'urgent' | 'soon' | 'ok';
export type TrendDirection = 'up' | 'down' | 'stable';
export type TrendStrength = 'strong' | 'moderate' | 'weak';
export type FactoryStatus = 'in_production' | 'not_scheduled';

export interface CalculationBreakdown {
  lead_time_days: number;
  ordering_cycle_days: number;
  daily_velocity_m2: number;
  base_quantity_m2: number;
  trend_adjustment_m2: number;
  trend_adjustment_pct: number;
  minus_current_stock_m2: number;
  minus_incoming_m2: number;
  final_suggestion_m2: number;
  final_suggestion_pallets: number;
}

// ===================
// REASONING TYPES
// ===================

export type PrimaryFactor =
  | 'LOW_STOCK'
  | 'TRENDING_UP'
  | 'OVERSTOCKED'
  | 'DECLINING'
  | 'NO_SALES'
  | 'NO_DATA'
  | 'STABLE';

export type ExclusionReason = 'OVERSTOCKED' | 'NO_SALES' | 'DECLINING' | 'NO_DATA';

export interface StockAnalysis {
  current_m2: number;
  days_of_stock: number | null;
  days_to_boat: number;
  gap_days: number | null; // Negative = stockout before boat
}

export interface DemandAnalysis {
  velocity_m2_day: number;
  trend_pct: number;
  trend_direction: string;
  sales_rank: number | null;
}

export interface QuantityReasoning {
  target_coverage_days: number;
  m2_needed: number;
  m2_in_transit: number;
  m2_in_stock: number;
  m2_to_order: number;
}

export interface ProductReasoning {
  primary_factor: PrimaryFactor;
  stock: StockAnalysis;
  demand: DemandAnalysis;
  quantity: QuantityReasoning;
  exclusion_reason: ExclusionReason | null;
}

export interface ExcludedProduct {
  sku: string;
  product_name: string | null;
  reason: ExclusionReason;
  days_of_stock: number | null;
  trend_pct: number | null;
  last_sale_days_ago: number | null;
}

export type OrderStrategy = 'STOCKOUT_PREVENTION' | 'DEMAND_CAPTURE' | 'BALANCED';

export interface OrderReasoning {
  // Core narrative sentences
  strategy_sentence: string;
  risk_sentence: string;
  constraint_sentence: string;
  customer_sentence: string | null;

  // Supporting facts for badges
  limiting_factor: 'warehouse' | 'boat' | 'bl_capacity' | 'none';
  deferred_count: number;
  customers_expecting: number;
  critical_count: number;
  highest_risk_sku: string | null;
  highest_risk_days: number | null;
}

// ===================
// PRIORITY SCORING (Layer 2 & 4)
// ===================

export type DominantFactor = 'stockout' | 'customer' | 'trend' | 'revenue';

export interface ProductScore {
  total: number;           // 0-100 composite score
  stockout_risk: number;   // 0-40 points
  customer_demand: number; // 0-30 points
  growth_trend: number;    // 0-20 points
  revenue_impact: number;  // 0-10 points
}

export interface ProductReasoningDisplay {
  why_product_sentence: string;    // "Out of stock · 2 customers waiting"
  why_quantity_sentence: string;   // "63d coverage × 30 m²/day"
  dominant_factor: DominantFactor; // Which factor contributed most
  would_include_if: string | null; // For excluded: "Stock drops below 60 days"
}

export interface OrderSummaryReasoning {
  strategy: OrderStrategy;
  days_to_boat: number;
  boat_date: string;
  boat_name: string;
  critical_count: number;
  urgent_count: number;
  stable_count: number;
  excluded_count: number;
  key_insights: string[]; // Legacy - being replaced by reasoning
  excluded_products: ExcludedProduct[];
  reasoning: OrderReasoning | null; // NEW: Structured narrative
}

export interface OrderBuilderProduct {
  // Product info
  product_id: string;
  sku: string;
  description: string | null;

  // Priority
  priority: Priority;
  action_type: string;

  // Coverage gap
  current_stock_m2: number;
  in_transit_m2: number;
  days_to_cover: number;
  total_demand_m2: number;
  coverage_gap_m2: number;
  coverage_gap_pallets: number;
  suggested_pallets: number;

  // Confidence
  confidence: ConfidenceLevel;
  confidence_reason: string;
  unique_customers: number;
  top_customer_name: string | null;
  top_customer_share: number | null;

  // Factory production status (from production_schedule)
  factory_status: FactoryStatus;
  factory_production_date: string | null;
  factory_production_m2: number | null;
  days_until_factory_ready: number | null;
  factory_ready_before_boat: boolean | null;
  factory_timing_message: string | null;

  // Trend data (from Intelligence system)
  urgency: Urgency;
  days_of_stock: number | null;
  trend_direction: TrendDirection;
  trend_strength: TrendStrength;
  velocity_change_pct: number;
  daily_velocity_m2: number;
  calculation_breakdown: CalculationBreakdown | null;

  // Reasoning (explains WHY this recommendation)
  reasoning: ProductReasoning | null;

  // Priority score (Layer 2 scoring system)
  score: ProductScore | null;

  // Display reasoning (Layer 4 per-product explanation)
  reasoning_display: ProductReasoningDisplay | null;

  // Weight data (for container optimization)
  weight_per_m2_kg: number;
  total_weight_kg: number;

  // Customer demand signal (for intelligent prioritization)
  customer_demand_score: number;
  customers_expecting_count: number;

  // Selection state
  is_selected: boolean;
  selected_pallets: number;
}

export interface OrderBuilderBoat {
  boat_id: string;
  name: string;
  departure_date: string;
  arrival_date: string;
  days_until_departure: number;
  days_until_arrival: number;
  days_until_warehouse: number; // Lead time: days until product IN warehouse
  booking_deadline: string;
  days_until_deadline: number;
  max_containers: number;
}

export interface OrderBuilderAlert {
  type: OrderBuilderAlertType;
  icon: string;
  product_sku: string | null;
  message: string;
}

export interface OrderBuilderSummary {
  // Current selection totals
  total_pallets: number;
  total_containers: number;
  total_m2: number;

  // Weight-based container calculation
  total_weight_kg: number;
  containers_by_pallets: number;
  containers_by_weight: number;
  weight_is_limiting: boolean;

  // Boat capacity
  boat_max_containers: number;
  boat_remaining_containers: number;

  // Warehouse capacity
  warehouse_current_pallets: number;
  warehouse_capacity: number;
  warehouse_after_delivery: number;
  warehouse_utilization_after: number;

  // Alerts
  alerts: OrderBuilderAlert[];
}

export type LimitingFactor = 'none' | 'warehouse' | 'boat' | 'mode';

export type LiquidationReason = 'declining_overstocked' | 'no_sales' | 'extreme_overstock';

export interface LiquidationCandidate {
  product_id: string;
  sku: string;
  description: string | null;

  // Current stock
  current_m2: number;
  current_pallets: number;

  // Stock metrics
  days_of_stock: number | null;
  trend_direction: string;
  trend_pct: number;
  daily_velocity_m2: number;

  // Liquidation reason
  reason: LiquidationReason;
  reason_display: string;

  // Space that could be freed
  potential_space_freed_m2: number;
  potential_space_freed_pallets: number;
}

export interface ConstraintAnalysis {
  // Total demand
  total_needed_pallets: number;
  total_needed_m2: number;

  // Available capacity
  warehouse_available_pallets: number;
  boat_capacity_pallets: number;
  mode_limit_pallets: number;

  // Limiting factor
  limiting_factor: LimitingFactor;
  effective_limit_pallets: number;

  // What fits vs what doesn't
  can_order_pallets: number;
  deferred_pallets: number;
  deferred_skus: string[];

  // Utilization
  constraint_utilization_pct: number;

  // Liquidation insight
  liquidation_candidates: LiquidationCandidate[];
  total_liquidation_potential_pallets: number;
  total_liquidation_potential_m2: number;

  // Helpful flags
  liquidation_needed: boolean;
  liquidation_could_fit_deferred: boolean;
}

export interface OrderBuilderResponse {
  // Boat info
  boat: OrderBuilderBoat;
  next_boat: OrderBuilderBoat | null;

  // BL count (determines capacity)
  num_bls: number;

  // Products grouped by priority
  high_priority: OrderBuilderProduct[];
  consider: OrderBuilderProduct[];
  well_covered: OrderBuilderProduct[];
  your_call: OrderBuilderProduct[];

  // Summary
  summary: OrderBuilderSummary;

  // Constraint analysis (explains capacity limits)
  constraint_analysis: ConstraintAnalysis | null;

  // Reasoning (explains WHY this order strategy)
  summary_reasoning: OrderSummaryReasoning | null;
}

export interface OrderBuilderParams {
  boat_id?: string;
  num_bls?: number;  // 1-5, determines capacity: num_bls × 5 × 14 pallets
}

export interface ExportProductItem {
  sku: string;
  pallets: number;
}

export interface ExportOrderRequest {
  products: ExportProductItem[];
  boat_departure: string;
}

// ===================
// DEMAND FORECAST TYPES
// ===================

export type OverdueSeverity = 'critical' | 'warning' | 'attention' | 'minor';
export type Predictability = 'CLOCKWORK' | 'PREDICTABLE' | 'MODERATE' | 'ERRATIC';

export interface CustomerProduct {
  sku: string;
  avg_m2_per_order: number;
  purchase_count: number;
  share_pct: number;
}

export interface CustomerDue {
  customer_normalized: string;
  tier: string;
  days_overdue: number;
  expected_date: string | null;
  predictability: Predictability | null;
  avg_order_m2: number;
  avg_order_usd: number;
  last_order_date: string | null;
  trend_direction: TrendDirection;
  top_products: CustomerProduct[];
}

export interface OverdueAlert {
  customer_normalized: string;
  tier: string;
  days_overdue: number;
  severity: OverdueSeverity;
  avg_order_usd: number;
  last_order_date: string | null;
  message: string;
}

export interface ProductDemand {
  sku: string;
  velocity_demand_m2: number;
  pattern_demand_m2: number;
  recommended_m2: number;
  customers_expecting: number;
  customer_names: string[];
}

export interface DemandForecastResponse {
  velocity_based_demand_m2: number;
  pattern_based_demand_m2: number;
  recommended_demand_m2: number;
  lead_time_days: number;
  customers_due_soon: CustomerDue[];
  overdue_alerts: OverdueAlert[];
  demand_by_product: ProductDemand[];
}

// ===================
// PRODUCTION SCHEDULE TYPES
// ===================

export interface MatchSuggestion {
  product_id: string;
  sku: string;
  score: number;
  match_reason: string;
}

export interface UnmappedProduct {
  factory_code: string;
  factory_name: string;
  total_m2: number;
  production_dates: string[];
  row_count: number;
  suggested_matches: MatchSuggestion[];
}

export interface UploadResult {
  total_rows: number;
  matched_count: number;
  unmatched_count: number;
  schedule_date: string;
  schedule_version: string | null;
  filename: string;
  unmatched_products: UnmappedProduct[];
  warnings: string[];
}

export interface MapProductRequest {
  factory_code: string;
  product_id: string;
}

export interface MapProductResponse {
  factory_code: string;
  product_id: string;
  product_sku: string;
  rows_updated: number;
}

// ===================
// BL ALLOCATION TYPES
// ===================

/**
 * Critical threshold for BL spreading.
 * Products with score >= 85 are spread across BLs for safety.
 */
export const CRITICAL_THRESHOLD = 85;

export interface BLProductAllocation {
  product_id: string;
  sku: string;
  description: string | null;
  pallets: number;
  m2: number;
  weight_kg: number;
  primary_customer: string | null;
  score: number;
  is_critical: boolean;
}

export interface BLAllocation {
  bl_number: number;
  primary_customers: string[];
  products: BLProductAllocation[];
  total_pallets: number;
  total_containers: number;
  total_m2: number;
  total_weight_kg: number;
  critical_product_count: number;
}

export interface BLAllocationReport {
  generated_at: string;
  boat_departure: string;
  boat_name: string;
  num_bls: number;
  total_containers: number;
  total_pallets: number;
  total_m2: number;
  total_weight_kg: number;
  total_critical_products: number;
  allocations: BLAllocation[];
  warnings: string[];
  risk_distribution_even: boolean;
  max_critical_pct: number;
}

export interface BLAllocationRequest {
  num_bls: number;
  boat_id?: string;
  products?: Array<{ sku: string; pallets: number }>;
}

export interface BLAllocationResponse {
  allocation: BLAllocationReport;
  download_url: string | null;
}

export interface ProductFactoryStatus {
  product_id: string;
  sku: string;
  status: FactoryStatus;
  production_date: string | null;
  production_m2: number | null;
  days_until_ready: number | null;
  ready_before_boat: boolean | null;
  timing_message: string | null;
}

export const orderBuilderApi = {
  get: async (params?: OrderBuilderParams): Promise<OrderBuilderResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.boat_id) {
      queryParams.append('boat_id', params.boat_id);
    }
    // Always send num_bls (default to 1 if not provided)
    // This ensures the backend uses BL capacity, not boat capacity
    const numBLs = params?.num_bls ?? 1;
    queryParams.append('num_bls', numBLs.toString());
    const queryString = queryParams.toString();
    const url = `/order-builder${queryString ? `?${queryString}` : ''}`;
    const response = await api.get<OrderBuilderResponse>(url);
    return response.data;
  },

  exportOrder: async (request: ExportOrderRequest): Promise<Blob> => {
    const response = await api.post('/order-builder/export', request, {
      responseType: 'blob',
    });
    return response.data;
  },

  getDemandForecast: async (boatId?: string): Promise<DemandForecastResponse> => {
    const queryParams = new URLSearchParams();
    if (boatId) {
      queryParams.append('boat_id', boatId);
    }
    const queryString = queryParams.toString();
    const url = `/order-builder/demand-forecast${queryString ? `?${queryString}` : ''}`;
    const response = await api.get<DemandForecastResponse>(url);
    return response.data;
  },

  /**
   * Generate BL allocation for the current order selection.
   * Returns allocation report with products grouped by BL.
   */
  generateBLAllocation: async (request: BLAllocationRequest): Promise<BLAllocationResponse> => {
    const response = await api.post<BLAllocationResponse>(
      '/order-builder/generate-bl-allocation',
      request
    );
    return response.data;
  },

  /**
   * Export BL allocation as Excel file.
   * Returns Excel file with summary + per-BL sheets.
   */
  exportBLAllocation: async (request: BLAllocationRequest): Promise<Blob> => {
    const response = await api.post('/order-builder/export-bl-allocation', request, {
      responseType: 'blob',
    });
    return response.data;
  },
};
