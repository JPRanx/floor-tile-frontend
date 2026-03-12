import api from './api';

export interface FactoryRequestCycleItem {
  product_id: string;
  sku: string;
  description: string | null;
  gap_m2: number;
  gap_pallets: number;
  request_m2: number;
  request_pallets: number;
  velocity_m2_day: number;
  coverage_days: number;
  estimated_ready_date: string | null;
  target_boat: string | null;
  target_boat_departure: string | null;
  urgency: string;
  should_request: boolean;
  is_low_volume: boolean;
  low_volume_reason: string | null;
}

export interface FactoryRequestCycle {
  month: string;
  month_display: string;
  product_count: number;
  total_m2: number;
  total_pallets: number;
  capacity_limit_m2: number;
  capacity_used_m2: number;
  capacity_remaining_m2: number;
  utilization_pct: number;
  deadline: string | null;
  days_until_deadline: number | null;
  signal_type: string;
  target_boats: string[];
  items: FactoryRequestCycleItem[];
}

export interface FactoryRequestHorizonResponse {
  factory_id: string;
  factory_name: string;
  cycles: FactoryRequestCycle[];
  generated_at: string;
}

export const factoryRequestsApi = {
  getHorizon: async (factoryId: string): Promise<FactoryRequestHorizonResponse> => {
    const response = await api.get<FactoryRequestHorizonResponse>(
      `/factory-requests/horizon/${factoryId}`
    );
    return response.data;
  },
};
