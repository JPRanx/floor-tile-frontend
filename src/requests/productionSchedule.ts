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

export interface ProductionModification {
  row_index: number;
  requested_m2?: number;
  status?: string;
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
  rows: ProductionPreviewRow[];
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

  confirmUpload: async (
    previewId: string,
    manualMappings?: Array<{ original_key: string; mapped_product_id: string }>,
    modifications?: ProductionModification[],
    deletions?: number[],
  ): Promise<ProductionImportResult> => {
    const hasData = (manualMappings && manualMappings.length > 0) ||
      (modifications && modifications.length > 0) ||
      (deletions && deletions.length > 0);
    const body = hasData ? {
      manual_mappings: manualMappings || [],
      modifications: modifications || [],
      deletions: deletions || [],
    } : undefined;
    const response = await api.post(`/production-schedule/upload-replace/confirm/${previewId}`, body);
    return response.data;
  },

  /** Create production_schedule rows from OB factory request export (Section 3). */
  createFromOrderBuilder: async (
    items: Array<{ product_id: string; sku?: string; referencia?: string; requested_m2: number }>,
    boatDeparture?: string,
  ): Promise<{ created: number }> => {
    const response = await api.post('/production-schedule/from-order-builder', {
      items,
      boat_departure: boatDeparture,
    });
    return response.data;
  },

  /** Update production_schedule.requested_m2 for piggyback exports (Section 2). */
  updatePiggyback: async (
    items: Array<{ product_id: string; additional_m2: number }>,
  ): Promise<{ updated: number }> => {
    const response = await api.post('/production-schedule/piggyback-update', { items });
    return response.data;
  },

  /** Confirm piggyback for a single product: update requested_m2 and record in history. */
  confirmPiggyback: async (
    productId: string,
    additionalM2: number,
    notes?: string,
  ): Promise<{ success: boolean; new_requested_m2: number; history_id: string; message: string }> => {
    const response = await api.post('/production-schedule/piggyback-confirm', {
      product_id: productId,
      additional_m2: additionalM2,
      notes,
    });
    return response.data;
  },
};
