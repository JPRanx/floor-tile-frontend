import api from './api';

export interface ParsedFieldConfidence {
  value: string;
  confidence: number;
  source_text?: string;
}

export interface ParsedDocumentData {
  document_type: string;
  document_type_confidence: number;
  shp_number: ParsedFieldConfidence | null;
  booking_number: ParsedFieldConfidence | null;
  pv_number: ParsedFieldConfidence | null;
  containers: string[];
  containers_confidence: number;
  etd: ParsedFieldConfidence | null;
  eta: ParsedFieldConfidence | null;
  atd: ParsedFieldConfidence | null;
  ata: ParsedFieldConfidence | null;
  pol: ParsedFieldConfidence | null;
  pod: ParsedFieldConfidence | null;
  vessel: ParsedFieldConfidence | null;
  raw_text: string;
  overall_confidence: number;
}

export interface IngestResponse {
  success: boolean;
  message: string;
  shipment_id: string | null;
  shp_number: string | null;
  action: 'parsed_pending_confirmation' | 'created' | 'updated';
  parsed_data?: ParsedDocumentData;
}

export interface ConfirmIngestRequest {
  document_type: string;
  shp_number?: string;
  booking_number?: string;
  pv_number?: string;
  containers?: string[];
  etd?: string;
  eta?: string;
  atd?: string;
  ata?: string;
  pol?: string;
  pod?: string;
  vessel?: string;
  source: string;
  notes?: string;
}

export interface Shipment {
  id: string;
  shp_number: string;
  booking_number?: string;
  status: string;
  vessel_name?: string;
  voyage_number?: string;
  etd?: string;
  eta?: string;
  actual_departure?: string;
  actual_arrival?: string;
  origin_port_id?: string;
  destination_port_id?: string;
  bill_of_lading?: string;
  free_days?: number;
  free_days_expiry?: string;
  freight_cost_usd?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface Container {
  id: string;
  shipment_id: string;
  container_number?: string;
  seal_number?: string;
  total_pallets?: number;
  total_weight_kg?: number;
  total_m2?: number;
  fill_percentage?: number;
  created_at: string;
}

export interface ContainerListResponse {
  data: Container[];
  total: number;
}

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  status: string;
  occurred_at: string;
  notes?: string;
  created_at: string;
}

export interface ShipmentEventListResponse {
  data: ShipmentEvent[];
  total: number;
}

export interface Port {
  id: string;
  name: string;
  country: string;
  type: 'ORIGIN' | 'DESTINATION';
  unlocode?: string;
  avg_processing_days?: number;
}

export const shipmentsApi = {
  async uploadPdf(file: File): Promise<IngestResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/shipments/ingest/pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  async confirmIngest(data: ConfirmIngestRequest): Promise<IngestResponse> {
    const response = await api.post('/shipments/ingest/confirm', data);
    return response.data;
  },

  async list(): Promise<Shipment[]> {
    const response = await api.get('/shipments');
    return response.data.data || [];
  },

  async getById(id: string): Promise<Shipment> {
    const response = await api.get(`/shipments/${id}`);
    return response.data;
  },

  async getContainers(shipmentId: string): Promise<Container[]> {
    const response = await api.get(`/shipments/${shipmentId}/containers`);
    return response.data.data || [];
  },

  async getEvents(shipmentId: string): Promise<ShipmentEvent[]> {
    const response = await api.get(`/shipments/${shipmentId}/events`);
    return response.data.data || [];
  },

  async updateStatus(shipmentId: string, status: string): Promise<Shipment> {
    const response = await api.patch(`/shipments/${shipmentId}/status`, { status });
    return response.data;
  },
};

export const portsApi = {
  async list(): Promise<Port[]> {
    const response = await api.get('/ports');
    return response.data;
  },

  async getById(id: string): Promise<Port> {
    const response = await api.get(`/ports/${id}`);
    return response.data;
  },
};