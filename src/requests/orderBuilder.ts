import api from './api';

export type OrderBuilderMode = 'minimal' | 'standard' | 'optimal';
export type OrderBuilderAlertType = 'warning' | 'blocked' | 'suggestion';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type Priority = 'HIGH_PRIORITY' | 'CONSIDER' | 'WELL_COVERED' | 'YOUR_CALL';

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
};
