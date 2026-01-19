import api from './api';

export interface PipelineOrderItem {
  id: string;
  pv_number: string | null;
  order_date: string | null;
  status: string;
  created_at: string;
  total_m2: number;
  item_count: number;
  products_preview: string | null;
}

export interface PipelineShipmentItem extends PipelineOrderItem {
  factory_order_id: string;
  shipment_id: string;
  booking_number: string | null;
  vessel_name: string | null;
  voyage_number: string | null;
  etd: string | null;
  eta: string | null;
  shipment_status: string;
  delivered_date?: string | null;
}

export interface PipelineStages {
  ordered: PipelineOrderItem[];
  shipped: PipelineShipmentItem[];
  in_transit: PipelineShipmentItem[];
  delivered: PipelineShipmentItem[];
}

export interface PipelineCounts {
  ordered: number;
  shipped: number;
  in_transit: number;
  delivered: number;
  total: number;
}

export interface PipelineData {
  stages: PipelineStages;
  counts: PipelineCounts;
}

export const pipelineApi = {
  getOverview: async (): Promise<PipelineData> => {
    const response = await api.get<PipelineData>('/pipeline/overview');
    return response.data;
  },
};
