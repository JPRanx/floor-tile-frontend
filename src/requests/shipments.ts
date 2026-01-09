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
  etd?: string;
  eta?: string;
  origin_port_id: string;
  destination_port_id: string;
  created_at: string;
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
};