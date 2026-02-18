import api from './api';

export type ConfidenceLevel = 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
export type DraftStatus = 'drafting' | 'action_needed' | 'ordered' | 'confirmed';

export interface UrgencyBreakdown {
  critical: number;
  urgent: number;
  soon: number;
  ok: number;
}

export interface ProductProjection {
  product_id: string;
  sku: string;
  daily_velocity_m2: number;
  current_stock_m2: number;
  projected_stock_m2: number;
  days_of_stock_at_arrival: number;
  urgency: 'critical' | 'urgent' | 'soon' | 'ok';
  coverage_gap_m2: number;
  suggested_pallets: number;
}

export interface DraftBLItem {
  product_id: string;
  sku: string;
  selected_pallets: number;
  bl_number: number;
}

export interface BoatProjection {
  boat_id: string;
  boat_name: string;
  departure_date: string;
  arrival_date: string;
  days_until_departure: number;
  origin_port: string;
  confidence: ConfidenceLevel;
  projected_pallets_min: number;
  projected_pallets_max: number;
  urgency_breakdown: UrgencyBreakdown;
  draft_status: DraftStatus | null;
  draft_id: string | null;
  is_active: boolean;
  order_by_date: string | null;
  days_until_order_deadline: number | null;
  product_details: ProductProjection[];
  draft_bl_items: DraftBLItem[];
  has_bl_allocation: boolean;
  is_estimated: boolean;
  carrier: string | null;
}

export interface PlanningHorizonResponse {
  factory_id: string;
  factory_name: string;
  horizon_months: number;
  generated_at: string;
  projections: BoatProjection[];
}

export const planningApi = {
  getHorizon: async (factoryId: string, months?: number): Promise<PlanningHorizonResponse> => {
    const params = months ? { months } : undefined;
    const response = await api.get<PlanningHorizonResponse>(
      `/planning/horizon/${factoryId}`,
      { params }
    );
    return response.data;
  },

  getDefaultHorizon: async (months?: number): Promise<PlanningHorizonResponse> => {
    const params = months ? { months } : undefined;
    const response = await api.get<PlanningHorizonResponse>(
      '/planning/horizon',
      { params }
    );
    return response.data;
  },
};
