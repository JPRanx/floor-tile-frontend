import api from './api';

export type OrderBuilderAlertType = 'warning' | 'blocked' | 'suggestion';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type Priority = 'HIGH_PRIORITY' | 'CONSIDER' | 'WELL_COVERED' | 'YOUR_CALL';
export type Urgency = 'critical' | 'urgent' | 'soon' | 'ok';
export type TrendDirection = 'up' | 'down' | 'stable';
export type TrendStrength = 'strong' | 'moderate' | 'weak';
export type FactoryStatus = 'in_production' | 'not_scheduled';
export type FactoryFillStatus = 'single_lot' | 'mixed_lots' | 'available' | 'needs_production' | 'partial_available' | 'no_stock' | 'not_needed' | 'unknown';
export type VelocityTrendSignal = 'growing' | 'stable' | 'declining';
export type ProductionStatus = 'scheduled' | 'in_progress' | 'completed' | 'not_scheduled';

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

// Availability breakdown for this boat
export interface AvailabilityBreakdown {
  siesa_now_m2: number;              // Current SIESA finished goods
  production_completing_m2: number;   // Production ready before deadline
  total_available_m2: number;         // siesa + production
  suggested_order_m2: number;         // What system recommends
  shortfall_m2: number;               // Gap if available < suggested
  can_fulfill: boolean;               // True if available >= suggested
  shortfall_note: string | null;      // Human-readable explanation
}

// ===================
// FULL CALCULATION BREAKDOWN (Transparency Layer)
// ===================

/** Coverage gap calculation — shows how we determine m² needed */
export interface CoverageCalculation {
  target_coverage_days: number;      // Target days of coverage (days_to_warehouse + buffer)
  days_to_warehouse: number;         // Days until product in warehouse
  buffer_days: number;               // Safety buffer days (default 30)
  velocity_m2_per_day: number;       // Daily velocity in m²
  velocity_source: string;           // Which velocity used: '90d', '180d', 'blended'
  need_for_target_m2: number;        // velocity × target_days = raw need
  trend_direction: string;           // up, down, stable
  velocity_change_pct: number;       // Raw velocity change: (90d - 180d) / 180d × 100 (e.g., -52%)
  trend_adjustment_pct: number;      // Order quantity adjustment (capped at ±20%)
  trend_adjustment_m2: number;       // trend_pct × need
  adjusted_need_m2: number;          // need + trend_adjustment
  warehouse_m2: number;              // Current warehouse stock
  in_transit_m2: number;             // Stock in transit
  pending_order_m2: number;          // Pending warehouse orders (awaiting shipment)
  coverage_gap_m2: number;           // adjusted_need - warehouse - in_transit - pending_orders
  coverage_gap_pallets: number;      // Gap converted to pallets
  suggested_pallets: number;         // Pallets suggested by coverage gap
  suggested_m2: number;              // m² suggested by coverage gap
}

/** Customer demand calculation — shows expected orders from customers due soon */
export interface CustomerDemandCalculation {
  customers_expecting_count: number;    // Number of customers due to order
  customers_list: string[];             // Names of customers expecting this product
  expected_orders_m2: number;           // Sum of expected m² from all customers
  expected_orders_pallets: number;      // Expected orders in pallets
  customer_breakdown: Array<{           // Per-customer breakdown
    name: string;
    tier?: string;
    days_overdue?: number;
  }>;
  suggested_pallets: number;            // Pallets suggested by customer demand
  customer_demand_score: number;        // Priority score from customer demand (0-300)
}

/** Selection calculation — shows how final selected_pallets was determined */
export interface SelectionCalculation {
  coverage_suggested_pallets: number;    // From CoverageCalculation
  customer_suggested_pallets: number;    // From CustomerDemandCalculation
  combined_pallets: number;              // max(coverage, customer) = base selection
  combination_reason: 'coverage_driven' | 'customer_driven' | 'equal';
  minimum_container_applied: boolean;    // Was minimum applied?
  minimum_container_pallets: number;     // 1 container = 14 pallets
  after_minimum_pallets: number;         // After applying minimum
  siesa_available_m2: number;            // Factory finished goods available
  siesa_available_pallets: number;       // SIESA in pallets
  siesa_limited: boolean;                // Was selection capped by SIESA?
  final_selected_pallets: number;        // Final selected_pallets value
  final_selected_m2: number;             // Final in m²
  selection_reason: string;              // E.g., 'Customer demand (18 expecting) + minimum container rule'
  constraint_notes: string[];            // Any constraints applied
}

/** Complete calculation transparency for a product */
export interface FullCalculationBreakdown {
  coverage: CoverageCalculation;
  customer_demand: CustomerDemandCalculation;
  selection: SelectionCalculation;
  summary_sentence: string;              // One-line summary
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

  // Pending orders (already ordered, awaiting shipment)
  pending_order_m2: number;
  pending_order_pallets: number;
  pending_order_boat: string | null;

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

  // Factory availability (SIESA finished goods)
  factory_available_m2: number;
  factory_largest_lot_m2: number | null;
  factory_largest_lot_code: string | null;
  factory_lot_count: number;
  factory_fill_status: FactoryFillStatus;
  factory_fill_message: string | null;

  // Production schedule status (from Programa de Produccion Excel)
  production_status: ProductionStatus;
  production_requested_m2: number;
  production_completed_m2: number;
  production_can_add_more: boolean;
  production_estimated_ready: string | null;

  // Pre-production alert (when user should add more before production starts)
  production_add_more_m2: number;
  production_add_more_alert: string | null;

  // Trend data (from Intelligence system)
  urgency: Urgency;
  days_of_stock: number | null;
  trend_direction: TrendDirection;
  trend_strength: TrendStrength;
  velocity_change_pct: number;
  daily_velocity_m2: number;

  // Dual velocity system (90-day vs 6-month comparison)
  velocity_90d_m2: number;
  velocity_180d_m2: number;
  velocity_trend_signal: VelocityTrendSignal;
  velocity_trend_ratio: number;

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

  // Availability breakdown (what's available for this boat)
  availability_breakdown: AvailabilityBreakdown | null;

  // Full calculation breakdown (transparency layer)
  full_calculation_breakdown: FullCalculationBreakdown | null;

  // Committed orders visibility (5e)
  committed_orders_m2: number;
  committed_orders_customer?: string;
  committed_orders_count: number;

  // Unfulfilled demand visibility (5f)
  unfulfilled_demand_m2: number;
  has_unfulfilled_demand: boolean;

  // Forward simulation (multi-boat awareness)
  projected_stock_m2: number | null;
  earlier_drafts_consumed_m2: number | null;
  uses_forward_simulation: boolean;

  // Dynamic unit support (m² for tiles, uds for furniture)
  pallet_conversion_factor?: number;
}

export interface OrderBuilderBoat {
  boat_id: string;
  name: string;
  departure_date: string;
  arrival_date: string;
  days_until_departure: number;
  days_until_arrival: number;
  days_until_warehouse: number; // Lead time: days until product IN warehouse
  order_deadline: string; // Recommended order deadline (30 days before departure)
  days_until_order_deadline: number; // Can be negative if past deadline
  past_order_deadline: boolean; // True if past recommended order deadline
  booking_deadline: string;
  days_until_deadline: number;
  max_containers: number;
  carrier: string | null;
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

// ===================
// SECTION SUMMARIES (Three-Section Order Builder)
// ===================

export interface AddToProductionItem {
  product_id: string;
  sku: string;
  description: string | null;
  referencia: string;

  // Current production request
  current_requested_m2: number;

  // Order Builder suggestion
  suggested_total_m2: number;
  suggested_additional_m2: number;
  suggested_additional_pallets: number;

  // Timing
  estimated_ready_date: string | null;
  target_boat: string | null;
  target_boat_departure: string | null;

  // Priority
  score: number;
  is_critical: boolean;

  // Selection (pre-selected by default)
  is_selected: boolean;

  // Piggyback history
  piggyback_history: Array<{ product_id: string; additional_m2: number; created_at: string }>;
  total_piggybacked_m2: number;
  remaining_headroom_m2: number;
}

export interface FactoryRequestItem {
  product_id: string;
  sku: string;
  description: string | null;

  // Current coverage
  warehouse_m2: number;
  in_transit_m2: number;
  factory_available_m2: number;
  in_production_m2: number;

  // Need
  suggested_m2: number;
  gap_m2: number;
  gap_pallets: number;

  // Request
  request_m2: number;
  request_pallets: number;

  // Timing (legacy + dynamic)
  estimated_ready: string;
  avg_production_days: number;
  estimated_ready_date: string | null;
  target_boat: string | null;
  target_boat_departure: string | null;
  arrival_date: string | null;
  days_until_arrival: number | null;

  // Velocity and consumption
  velocity_m2_day: number;
  consumption_until_arrival_m2: number;

  // Projection
  pipeline_m2: number;
  projected_stock_at_arrival_m2: number;
  calculated_need_m2: number;

  // Low-volume detection
  days_to_consume_container: number | null;
  is_low_volume: boolean;
  low_volume_reason: string | null;
  should_request: boolean;
  skip_reason: string | null;

  // Priority
  urgency: Urgency;
  score: number;

  // Minimum enforcement (1 container = 14 pallets = 1,881.6 m²)
  minimum_applied: boolean;
  minimum_note: string | null;

  // Selection (pre-selected by default)
  is_selected: boolean;
}

export interface WarehouseOrderSummary {
  product_count: number;
  selected_count: number;
  total_m2: number;
  total_pallets: number;
  total_containers: number;
  total_weight_kg: number;

  // BL allocation
  bl_count: number;

  // Boat
  boat_name: string | null;
  boat_departure: string | null;
}

export interface AddToProductionSummary {
  product_count: number;
  total_additional_m2: number;
  total_additional_pallets: number;

  // Items eligible for adding more
  items: AddToProductionItem[];

  // Timing
  estimated_ready_range: string;

  // Alert flag
  has_critical_items: boolean;

  // ACTION REQUIRED deadline
  action_deadline: string | null;
  action_deadline_display: string;
}

export interface FactoryRequestSummary {
  product_count: number;
  total_request_m2: number;
  total_request_pallets: number;

  // Items needing new requests
  items: FactoryRequestItem[];

  // Quota tracking (Guatemala: 60k m²/month)
  limit_m2: number;
  utilization_pct: number;
  remaining_m2: number;

  // Timing
  estimated_ready: string;

  // Submit deadline
  submit_deadline: string | null;
  submit_deadline_display: string;
}

export interface LiquidationClearanceProduct {
  product_id: string;
  sku: string;
  description: string | null;
  factory_available_m2: number;
  factory_lot_count: number;
  warehouse_m2: number;
  suggested_pallets: number;
  suggested_m2: number;
  days_since_last_sale: number | null;
  inactive_reason: string | null;
  inactive_date: string | null;
}

export interface ShippingCostConfig {
  freight_per_container_usd: number;
  destination_per_container_usd: number;
  trucking_per_container_usd: number;
  other_per_container_usd: number;
  bl_fixed_costs_usd: number;
  m2_per_container: number;
  per_container_total_usd: number;
}

export interface OrderBuilderResponse {
  // Boat info
  boat: OrderBuilderBoat;
  next_boat: OrderBuilderBoat | null;

  // BL count (determines capacity)
  num_bls: number;

  // Recommended BL count (based on TRUE NEED: coverage gap - in transit - in production)
  recommended_bls: number;
  // Available BL count (what can ship now based on factory stock)
  available_bls: number;
  // Message showing both need and available
  recommended_bls_reason: string;

  // Shippable BLs (what can actually fill gaps = min(gap, available) per product)
  shippable_bls: number;
  shippable_m2: number;

  // Products grouped by priority
  high_priority: OrderBuilderProduct[];
  consider: OrderBuilderProduct[];
  well_covered: OrderBuilderProduct[];
  your_call: OrderBuilderProduct[];

  // Summary
  summary: OrderBuilderSummary;

  // Three-section summaries (NEW)
  warehouse_order_summary: WarehouseOrderSummary | null;
  add_to_production_summary: AddToProductionSummary | null;
  factory_request_summary: FactoryRequestSummary | null;

  // Constraint analysis (explains capacity limits)
  constraint_analysis: ConstraintAnalysis | null;

  // Reasoning (explains WHY this order strategy)
  summary_reasoning: OrderSummaryReasoning | null;

  // Unable to Ship alerts (products that need ordering but can't ship now)
  unable_to_ship: UnableToShipSummary | null;

  // Stability forecast (when cycle will be stable)
  stability_forecast: StabilityForecast | null;

  // Liquidation clearance (deactivated products with factory stock)
  liquidation_clearance: LiquidationClearanceProduct[];

  // Shipping cost config (for shipping estimate calculations)
  shipping_cost_config?: ShippingCostConfig;

  // Dynamic unit support (m² for tiles, uds for furniture)
  unit_label?: string;
  is_unit_based?: boolean;

  // V2: Factory-scoped fields (present when factory_id query param is used)
  factory_id?: string;
  factory_name?: string;
  factory_timeline?: {
    milestones: Array<{
      key: string;
      label: string;
      date: string;
      passed: boolean;
      is_current: boolean;
    }>;
    current_milestone: string;
  };
}

// Unable to Ship items (products that need ordering but can't ship)
export interface UnableToShipItem {
  sku: string;
  description: string | null;
  coverage_gap_m2: number;
  coverage_gap_pallets: number;
  days_of_stock: number | null;
  stockout_date: string | null;
  reason: string;
  production_status: string | null;
  production_estimated_ready: string | null;
  suggested_action: string;
  priority: string;
  priority_score: number;
}

export interface UnableToShipSummary {
  count: number;
  total_gap_m2: number;
  total_gap_pallets: number;
  message: string;
  items: UnableToShipItem[];
}

// ===================
// STABILITY FORECAST TYPES
// ===================

export type StabilityStatus = 'stable' | 'recovering' | 'unstable' | 'blocked';
export type SupplySource = 'siesa' | 'production' | 'none';
export type RecoveryStatus = 'shipping' | 'in_production' | 'blocked';

/** Recovery plan for a single unstable product */
export interface ProductRecovery {
  sku: string;
  product_name: string | null;
  current_coverage_days: number;
  stockout_date: string | null;

  // Supply info
  supply_source: SupplySource;
  supply_amount_m2: number;
  supply_ready_date: string | null;

  // Shipping info
  ship_boat_name: string | null;
  ship_boat_departure: string | null;
  arrival_date: string | null;

  // Status
  status: RecoveryStatus;
  status_note: string;
}

/** Product blocking stability (no supply scheduled) */
export interface StabilityBlocker {
  sku: string;
  product_name: string | null;
  current_coverage_days: number;
  stockout_date: string | null;
  velocity_m2_per_day: number;
  reason: string;
  suggested_action: string;
}

/** Snapshot of stability at a point in time */
export interface StabilityTimeline {
  date: string;
  event: string;
  resolved_count: number;
  remaining_unstable: number;
  resolved_skus: string[];
}

/** Complete stability forecast for the cycle */
export interface StabilityForecast {
  // Overall status
  status: StabilityStatus;
  status_message: string;

  // Counts
  total_products: number;
  stable_count: number;
  unstable_count: number;
  blocker_count: number;

  // Recovery info
  stable_date: string | null;
  stable_date_note: string | null;

  // Timeline
  timeline: StabilityTimeline[];

  // Product details
  recovering_products: ProductRecovery[];
  blockers: StabilityBlocker[];

  // Progress (for progress bar)
  recovery_progress_pct: number;
}

export interface OrderBuilderParams {
  boat_id?: string;
  num_bls?: number;  // 1-5, determines capacity: num_bls × 5 × 14 pallets
  factory_id?: string;  // Factory UUID — filters products/boats to this factory
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
    if (params?.factory_id) {
      queryParams.append('factory_id', params.factory_id);
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

  /**
   * Recalculate Order Builder with excluded products.
   * Performs a full re-optimization using freed capacity.
   */
  recalculate: async (request: RecalculateRequest): Promise<OrderBuilderResponse> => {
    const response = await api.post<OrderBuilderResponse>(
      '/order-builder/recalculate',
      request
    );
    return response.data;
  },

  /**
   * Generate comprehensive order report explaining WHY recommendations were made.
   * Returns Excel file with 6 sheets.
   */
  generateReport: async (request: GenerateReportRequest): Promise<Blob> => {
    const response = await api.post('/order-builder/generate-report', request, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Request type for recalculate endpoint
export interface RecalculateRequest {
  boat_id?: string;
  num_bls: number;
  excluded_skus: string[];
}

// Request type for report generation
export interface GenerateReportItem {
  product_id: string;
  sku: string;
  pallets: number;
}

export interface GenerateReportRequest {
  boat_id?: string;
  num_bls: number;
  warehouse_items: GenerateReportItem[];
  add_to_production_items: GenerateReportItem[];
  factory_request_items: GenerateReportItem[];
}
