import api from './api';

// ── Types ────────────────────────────────────────────────────────────────

export interface HorizonProduct {
  product_id: string;
  sku: string;
  daily_velocity_m2: number;
  current_stock_m2: number;
  running_stock_m2: number;
  days_of_stock: number;
  urgency: 'critical' | 'urgent' | 'soon' | 'ok';
  days_to_next_resupply: number;
  stock_at_next_resupply: number;
  coverage_gap_m2: number;
  suggested_pallets: number;
  can_ship_pallets: number;
  allocated_pallets: number;
  factory_available_m2: number;
  factory_max_pallets: number;
  is_draft_committed: boolean;
}

export interface BoatProjection {
  boat_id: string;
  boat_name: string;
  departure_date: string;
  arrival_date: string;
  days_until_departure: number;
  carrier: string;
  state: 'ORDERED' | 'PLANNING' | 'FUTURE';
  draft_status: string | null;
  draft_id: string | null;
  total_pallets: number;
  total_containers: number;
  total_m2: number;
  urgency_breakdown: {
    critical: number;
    urgent: number;
    soon: number;
    ok: number;
  };
  skip_recommended: boolean;
  skip_reason: string | null;
  product_count: number;
  products: HorizonProduct[];
}

export interface CompletedBoat {
  boat_id: string;
  boat_name: string;
  departure_date: string;
  arrival_date: string;
  carrier: string;
  state: string;
  draft_status: string | null;
  items: Array<{
    product_id: string;
    sku: string;
    shipped_m2?: number;
    shipped_pallets?: number;
    selected_pallets?: number;
  }>;
}

export interface ProductionRequest {
  product_id: string;
  sku: string;
  urgency: string;
  is_piggyback: boolean;
  scheduled_m2: number;
  additional_m2: number;
  stockout_date: string | null;
  gap_boat_departure: string;
}

export interface ProductionPipelineItem {
  product_id: string;
  sku: string;
  status: 'in_progress' | 'scheduled';
  total_m2: number;
  completed_m2: number;
  progress_pct: number;
  earliest_date: string | null;
  covers_gap: boolean;
  gap_m2: number;
}

export interface FactoryOrderSignal {
  needs_scheduling: boolean;
  product_count: number;
  piggyback_count: number;
  new_count: number;
  limiting_product_sku: string;
}

export interface HorizonResponse {
  factory_id: string;
  factory_name: string;
  generated_at: string;
  production_lead_days: number;
  transport_to_port_days: number;
  monthly_quota_m2: number | null;
  anchor_boat_id: string | null;
  projections: BoatProjection[];
  completed: CompletedBoat[];
  production_requests: ProductionRequest[];
  production_pipeline: ProductionPipelineItem[];
  skip_recommendations: Array<{
    boat_id: string;
    boat_name: string;
    reason: string;
    consolidate_onto: string | null;
  }>;
  factory_order_signal: FactoryOrderSignal | null;
  data_as_of: Record<string, unknown>;
}

export interface HorizonDetailResponse {
  factory_id: string;
  factory_name: string;
  generated_at: string;
  boat: BoatProjection;
  next_boat: { boat_id: string; boat_name: string; departure_date: string; arrival_date: string } | null;
  production_requests: ProductionRequest[];
  factory_order_signal: FactoryOrderSignal | null;
  data_as_of: Record<string, unknown>;
  _debug: unknown;
}

// ── API ──────────────────────────────────────────────────────────────────

export const horizonApi = {
  getHorizon: async (factoryId: string): Promise<HorizonResponse> => {
    const response = await api.get(`/v2/horizon/${factoryId}`);
    return response.data;
  },

  getBoatDetail: async (factoryId: string, boatId: string): Promise<HorizonDetailResponse> => {
    const response = await api.get(`/v2/horizon/${factoryId}/${boatId}`);
    return response.data;
  },
};
