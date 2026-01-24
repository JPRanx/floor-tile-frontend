import api from './api';

export type OrderBuilderMode = 'minimal' | 'standard' | 'optimal';
export type OrderBuilderAlertType = 'warning' | 'blocked' | 'suggestion';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type Priority = 'HIGH_PRIORITY' | 'CONSIDER' | 'WELL_COVERED' | 'YOUR_CALL';
export type Urgency = 'critical' | 'urgent' | 'soon' | 'ok';
export type TrendDirection = 'up' | 'down' | 'stable';
export type TrendStrength = 'strong' | 'moderate' | 'weak';

export interface CalculationBreakdown {
  lead_time_days: number;
  safety_stock_days: number;
  daily_velocity_m2: number;
  base_quantity_m2: number;
  trend_adjustment_m2: number;
  trend_adjustment_pct: number;
  minus_current_stock_m2: number;
  minus_incoming_m2: number;
  final_suggestion_m2: number;
  final_suggestion_pallets: number;
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

  // Factory (MVP: placeholder)
  factory_available: number | null;
  factory_status: string;

  // Trend data (from Intelligence system)
  urgency: Urgency;
  days_of_stock: number | null;
  trend_direction: TrendDirection;
  trend_strength: TrendStrength;
  velocity_change_pct: number;
  daily_velocity_m2: number;
  calculation_breakdown: CalculationBreakdown | null;

  // Weight data (for container optimization)
  weight_per_m2_kg: number;
  total_weight_kg: number;

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

export interface OrderBuilderResponse {
  // Boat info
  boat: OrderBuilderBoat;
  next_boat: OrderBuilderBoat | null;

  // Mode
  mode: OrderBuilderMode;

  // Products grouped by priority
  high_priority: OrderBuilderProduct[];
  consider: OrderBuilderProduct[];
  well_covered: OrderBuilderProduct[];
  your_call: OrderBuilderProduct[];

  // Summary
  summary: OrderBuilderSummary;
}

export interface OrderBuilderParams {
  boat_id?: string;
  mode?: OrderBuilderMode;
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

export const orderBuilderApi = {
  get: async (params?: OrderBuilderParams): Promise<OrderBuilderResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.boat_id) {
      queryParams.append('boat_id', params.boat_id);
    }
    if (params?.mode) {
      queryParams.append('mode', params.mode);
    }
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
};
