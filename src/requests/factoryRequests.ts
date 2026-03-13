import api from './api';

export interface FactoryRequestProduct {
  product_id: string;
  sku: string;
  total_factory_need_pallets: number;
  total_factory_need_m2: number;
  first_gap_boat: string;
  first_gap_boat_id: string;
  first_gap_departure: string;
  ships_on_boat: string | null;
  ships_on_boat_id: string | null;
  ships_on_departure: string | null;
  estimated_ready_date: string;
  daily_velocity_m2: number;
  days_of_stock_at_first_gap: number;
  urgency: 'overdue' | 'order_now' | 'upcoming';
  trend_direction: string;
  trend_adjustment_pct: number;
}

export interface FactoryRequestSummary {
  total_products: number;
  total_pallets: number;
  total_m2: number;
  total_containers: number;
  overdue_count: number;
  order_now_count: number;
}

export interface UpcomingBoat {
  boat_name: string;
  departure_date: string;
  arrival_date: string;
  days_until_departure: number;
  is_estimated: boolean;
  can_receive_production: boolean;
}

export interface FactoryRequestHorizonResponse {
  factory_id: string;
  factory_name: string;
  production_lead_days: number;
  transport_to_port_days: number;
  monthly_quota_m2: number;
  estimated_ready_date: string;
  products: FactoryRequestProduct[];
  upcoming_boats: UpcomingBoat[];
  factory_order_signal: Record<string, unknown> | null;
  summary: FactoryRequestSummary;
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
