import api from './api';
import type { ParsedDocumentData, CandidateShipment } from './shipments';

export interface PendingDocument {
  id: string;
  created_at: string;
  document_type: string;
  parsed_data: ParsedDocumentData;
  pdf_storage_path: string;
  source: string;
  email_subject?: string;
  email_from?: string;
  attempted_booking?: string;
  attempted_shp?: string;
  attempted_containers: string[];
  status: 'pending' | 'resolved' | 'expired';
  resolved_at?: string;
  resolved_shipment_id?: string;
  resolved_action?: 'assigned' | 'created' | 'discarded';
  expires_at: string;
}

export interface PendingDocumentListResponse {
  data: PendingDocument[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PendingCountResponse {
  pending_count: number;
}

export interface ResolveRequest {
  action: 'assign' | 'create' | 'discard';
  target_shipment_id?: string;
  shp_number?: string;
  booking_number?: string;
}

export const pendingDocumentsApi = {
  async getCount(): Promise<PendingCountResponse> {
    const response = await api.get('/pending-documents/count');
    return response.data;
  },

  async list(page: number = 1, pageSize: number = 20): Promise<PendingDocumentListResponse> {
    const response = await api.get('/pending-documents', {
      params: { page, page_size: pageSize }
    });
    return response.data;
  },

  async getById(id: string): Promise<PendingDocument> {
    const response = await api.get(`/pending-documents/${id}`);
    return response.data;
  },

  async getCandidates(id: string, limit: number = 20): Promise<CandidateShipment[]> {
    const response = await api.get(`/pending-documents/${id}/candidates`, {
      params: { limit }
    });
    return response.data;
  },

  async resolve(id: string, request: ResolveRequest): Promise<PendingDocument> {
    const response = await api.post(`/pending-documents/${id}/resolve`, request);
    return response.data;
  },

  async getPdfUrl(id: string): Promise<{ url: string; expires_in: number }> {
    const response = await api.get(`/pending-documents/${id}/pdf-url`);
    return response.data;
  },
};