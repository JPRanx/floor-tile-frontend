import api from './api';

export type ConfidenceLevel = 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
export type DraftStatus = 'drafting' | 'action_needed' | 'ordered' | 'confirmed';

export interface UrgencyBreakdown {
  critical: number;
  urgent: number;
  soon: number;
  ok: number;
}

export interface SupplySource {
  warehouse_m2: number;
  factory_siesa_m2: number;
  production_pipeline_m2: number;
  in_transit_m2: number;
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
  supply_breakdown: SupplySource | null;
  is_draft_committed: boolean;
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
  shipping_book_by_date: string | null;
  days_until_shipping_deadline: number | null;
  product_details: ProductProjection[];
  draft_bl_items: DraftBLItem[];
  has_bl_allocation: boolean;
  is_estimated: boolean;
  carrier: string | null;
  is_draft_locked: boolean;
  blocking_boat_name: string | null;
  has_earlier_drafts: boolean;
  needs_review: boolean;
  review_reason: string | null;
  earlier_draft_context: string | null;
  has_factory_siesa_supply: boolean;
  has_production_supply: boolean;
  factory_siesa_total_m2: number;
  production_total_m2: number;
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
