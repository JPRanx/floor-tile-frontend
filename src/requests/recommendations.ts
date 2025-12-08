import api from './api';

export type RecommendationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type WarningType = 'OVER_STOCKED' | 'NO_SALES_DATA' | 'LOW_VELOCITY';

export interface WarehouseStatus {
  total_capacity_pallets: number;
  total_capacity_m2: number;
  total_allocated_pallets: number;
  total_allocated_m2: number;
  total_current_pallets: number;
  total_current_m2: number;
  utilization_percent: number;
  allocation_scaled: boolean;
  scale_factor: number | null;
}

export interface ProductRecommendation {
  product_id: string;
  sku: string;
  category: string | null;
  rotation: string | null;
  target_pallets: number;
  target_m2: number;
  warehouse_pallets: number;
  warehouse_m2: number;
  in_transit_pallets: number;
  in_transit_m2: number;
  current_pallets: number;
  current_m2: number;
  gap_pallets: number;
  gap_m2: number;
  daily_velocity: number;
  days_until_empty: number | null;
  stockout_date: string | null;
  order_arrives_date: string;
  arrives_before_stockout: boolean;
  priority: RecommendationPriority;
  action: string;
  reason: string;
}

export interface RecommendationWarning {
  product_id: string;
  sku: string;
  type: WarningType;
  message: string;
  details: Record<string, unknown> | null;
}

export interface OrderRecommendations {
  warehouse_status: WarehouseStatus;
  lead_time_days: number;
  calculation_date: string;
  recommendations: ProductRecommendation[];
  total_recommended_pallets: number;
  total_recommended_m2: number;
  warnings: RecommendationWarning[];
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

export const recommendationsApi = {
  getOrders: async (): Promise<OrderRecommendations> => {
    const response = await api.get<OrderRecommendations>('/recommendations/orders');
    return response.data;
  },
};
