import api from './api';

export interface PlanLine {
  product_id: string;
  sku: string;
  pallets: number;
  m2: number;
  velocity_m2_wk: number;
  siesa_m2: number;
  coverage_weeks: number;
  is_urgent: boolean;
  note_es: string;
}

export interface PlanBoat {
  boat_id: string;
  vessel_name: string;
  departure_date: string;
  arrival_date: string;
  max_containers: number;
  max_pallets: number;
  total_pallets: number;
  total_m2: number;
  containers_used: number;
  lines: PlanLine[];
}

export interface RankingRow {
  sku: string;
  velocity_m2_wk: number;
  siesa_pallets: number;
  siesa_m2: number;
  coverage_weeks: number;
  is_urgent: boolean;
}

export interface SkippedRow {
  sku: string;
  siesa_pallets: number;
  siesa_m2: number;
  reason_es: string;
}

export interface WarehouseCapacity {
  current_pallets: number;
  incoming_pallets: number;
  plan_pallets: number;
  outflow_pallets: number;
  peak_pallets: number;
  max_pallets: number;
  utilization_pct: number;
  is_safe: boolean;
}

export interface PlanResponse {
  boats: PlanBoat[];
  velocity_ranking: RankingRow[];
  skipped: SkippedRow[];
  warehouse_capacity: WarehouseCapacity;
  total_siesa_pallets: number;
  plan_total_pallets: number;
  narrative: string;
  generated_at: string;
}

export interface AdjustedLine {
  product_id: string;
  sku: string;
  pallets: number;
}

export interface AdjustedBoat {
  boat_id: string;
  vessel_name: string;
  departure_date: string;
  arrival_date: string;
  max_containers: number;
  lines: AdjustedLine[];
}

export type BoatStatus = 'available' | 'committed' | 'before_committed';

export interface AvailableBoat {
  boat_id: string;
  vessel_name: string;
  departure_date: string;
  arrival_date: string;
  committed_pallets: number;
  status: BoatStatus;
  reason: string | null;
}

export const orderPlanApi = {
  listBoats: async (): Promise<AvailableBoat[]> => {
    const { data } = await api.get<AvailableBoat[]>('/order-plan/available-boats');
    return data;
  },

  generate: async (
    boat_ids: string[],
    max_containers: number,
    warehouse_buffer_pct: number,
    include_production: boolean,
    factory_id?: string,
  ): Promise<PlanResponse> => {
    const { data } = await api.post<PlanResponse>('/order-plan/generate', {
      boat_ids,
      max_containers,
      warehouse_buffer_pct,
      include_production,
      factory_id,
    });
    return data;
  },

  exportPdf: async (
    boats: AdjustedBoat[],
    narrative: string,
    original_plan: PlanResponse,
  ): Promise<Blob> => {
    const res = await api.post(
      '/order-plan/export-pdf',
      { boats, narrative, original_plan },
      { responseType: 'blob' },
    );
    return res.data as Blob;
  },
};
