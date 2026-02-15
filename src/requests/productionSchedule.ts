import api from './api';

export interface ProductionPreviewRow {
  referencia: string;
  sku: string | null;
  plant: string;
  requested_m2: number;
  completed_m2: number;
  status: string;
  estimated_delivery_date: string | null;
}

export interface ProductionPreview {
  preview_id: string;
  filename: string;
  source_month: string;
  total_rows: number;
  rows_with_data: number;
  matched_to_products: number;
  unmatched_count: number;
  unmatched_referencias: string[];
  total_requested_m2: number;
  total_completed_m2: number;
  status_breakdown: Record<string, number>;
  existing_records_to_delete: number;
  warnings: string[];
  sample_rows: ProductionPreviewRow[];
  expires_in_minutes: number;
}

export interface ProductionImportResult {
  filename: string;
  source_month: string;
  total_rows_parsed: number;
  rows_with_guatemala_data: number;
  inserted: number;
  updated: number;
  skipped: number;
  matched_to_products: number;
  unmatched_referencias: string[];
  completed_count: number;
  in_progress_count: number;
  scheduled_count: number;
  total_requested_m2: number;
  total_completed_m2: number;
  warnings: string[];
}

export const productionScheduleApi = {
  preview: async (file: File): Promise<ProductionPreview> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/production-schedule/upload-replace/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  confirmUpload: async (previewId: string): Promise<ProductionImportResult> => {
    const response = await api.post(`/production-schedule/upload-replace/confirm/${previewId}`);
    return response.data;
  },
};
