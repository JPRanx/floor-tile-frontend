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
  urgency: 'sin_stock' | 'critico' | 'pedir_ahora' | 'planificar';
  trend_direction: string;
  trend_adjustment_pct: number;
  act_by_date: string | null;
}

export interface FactoryRequestSummary {
  total_products: number;
  total_pallets: number;
  total_m2: number;
  total_containers: number;
  sin_stock_count: number;
  critico_count: number;
}

export interface UpcomingBoat {
  boat_name: string;
  departure_date: string;
  arrival_date: string;
  days_until_departure: number;
  is_estimated: boolean;
  can_receive_production: boolean;
}

export interface InProductionItem {
  product_id: string;
  sku: string;
  production_status: 'scheduled' | 'in_progress' | 'completed';
  requested_m2: number;
  completed_m2: number;
  scheduled_date: string | null;
  target_boat: string | null;
  target_boat_departure: string | null;
  daily_velocity_m2: number | null;
  days_of_stock_at_first_gap: number | null;
  urgency: string | null;
  piggyback_m2: number | null;
}

export interface BoatProductionGroup {
  boat_name: string;
  departure_date: string;
  arrival_date: string;
  products: Array<{ sku: string; m2: number; source: 'production' | 'blind_spot' }>;
  total_m2: number;
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
  in_production: InProductionItem[];
  by_boat: BoatProductionGroup[];
}

export interface FactoryRequestSubmissionItem {
  product_id: string;
  sku: string;
  pallets: number;
  m2: number;
  urgency: string;
}

export interface FactoryRequestSubmissionCreate {
  factory_id: string;
  factory_name: string;
  items: FactoryRequestSubmissionItem[];
  total_pallets: number;
  total_m2: number;
  total_containers: number;
  notes?: string;
}

export interface FactoryRequestSubmissionResponse {
  id: string;
  factory_id: string;
  factory_name: string;
  total_pallets: number;
  total_m2: number;
  total_containers: number;
  product_count: number;
  submitted_at: string;
  notes?: string;
}

export interface FactoryRequestLastSubmission {
  id: string;
  submitted_at: string;
  total_pallets: number;
  total_m2: number;
  total_containers: number;
  product_count: number;
  days_ago: number;
}

export const factoryRequestsApi = {
  getHorizon: async (factoryId: string): Promise<FactoryRequestHorizonResponse> => {
    const response = await api.get<FactoryRequestHorizonResponse>(
      `/factory-requests/horizon/${factoryId}`
    );
    return response.data;
  },

  recordSubmission: async (data: FactoryRequestSubmissionCreate): Promise<FactoryRequestSubmissionResponse> => {
    const response = await api.post<FactoryRequestSubmissionResponse>(
      '/factory-requests/submissions',
      data
    );
    return response.data;
  },

  getLastSubmission: async (factoryId: string): Promise<FactoryRequestLastSubmission | null> => {
    try {
      const response = await api.get<FactoryRequestLastSubmission>(
        `/factory-requests/submissions/last/${factoryId}`
      );
      return response.data;
    } catch {
      return null; // 404 = no submissions yet
    }
  },
};
