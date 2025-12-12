import api from './api';

export type RecommendationPriority = 'HIGH_PRIORITY' | 'CONSIDER' | 'WELL_COVERED' | 'YOUR_CALL';
export type ActionType = 'ORDER_NOW' | 'ORDER_SOON' | 'WELL_STOCKED' | 'SKIP_ORDER' | 'REVIEW';
export type WarningType = 'OVER_STOCKED' | 'NO_SALES_DATA' | 'LOW_VELOCITY';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface WarehouseStatus {
  total_capacity_pallets: number;
  total_capacity_m2: number;
  total_allocated_pallets: number;
  total_allocated_m2: number;
  total_current_pallets: number;
  total_current_m2: number;
  total_in_transit_pallets: number;
  total_in_transit_m2: number;
  utilization_percent: number;
  allocation_scaled: boolean;
  scale_factor: number | null;
}

export interface ProductRecommendation {
  product_id: string;
  sku: string;
  category: string | null;
  rotation: string | null;
  // Allocation (for inventory health)
  target_pallets: number;
  target_m2: number;
  warehouse_pallets: number;
  warehouse_m2: number;
  in_transit_pallets: number;
  in_transit_m2: number;
  current_pallets: number;
  current_m2: number;
  gap_pallets: number;  // allocation gap (target - current)
  gap_m2: number;
  // Coverage gap (demand until next boat - available)
  days_to_cover: number | null;
  total_demand_m2: number | null;
  coverage_gap_m2: number | null;
  coverage_gap_pallets: number | null;
  // Timing
  daily_velocity: number;
  days_until_empty: number | null;
  stockout_date: string | null;
  order_arrives_date: string;
  arrives_before_stockout: boolean;
  // Confidence score
  confidence: ConfidenceLevel;
  confidence_reason: string;
  weeks_of_data: number;
  velocity_cv: number | null;
  // Customer analysis (for confidence)
  unique_customers: number;
  top_customer_name: string | null;
  top_customer_share: number | null;
  recurring_customers: number;
  recurring_share: number | null;
  // Priority and action
  priority: RecommendationPriority;
  action_type: ActionType;
  action: string;
  reason: string;
}

export interface RecommendationWarning {
  product_id: string;
  sku: string;
  type: WarningType;
  action_type: ActionType;
  message: string;
  details: Record<string, unknown> | null;
}

export interface OrderRecommendations {
  warehouse_status: WarehouseStatus;
  lead_time_days: number;
  calculation_date: string;
  // Boat arrival info
  next_boat_arrival: string | null;
  days_to_next_boat: number | null;
  // Recommendations
  recommendations: ProductRecommendation[];
  total_recommended_pallets: number;
  total_recommended_m2: number;
  // Coverage gap totals
  total_coverage_gap_pallets: number;
  total_coverage_gap_m2: number;
  // Warnings
  warnings: RecommendationWarning[];
  // Priority counts
  high_priority_count: number;
  consider_count: number;
  well_covered_count: number;
  your_call_count: number;
  // Action counts
  order_now_count: number;
  order_soon_count: number;
  well_stocked_count: number;
  skip_order_count: number;
  review_count: number;
}

export const recommendationsApi = {
  getOrders: async (): Promise<OrderRecommendations> => {
    const response = await api.get<OrderRecommendations>('/recommendations/orders');
    return response.data;
  },
};
