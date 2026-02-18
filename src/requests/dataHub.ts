import api from './api';

export interface DataSourceFreshness {
  last_updated: string | null;
  record_count: number;
  status: 'fresh' | 'stale' | 'very_stale';
}

export interface DataFreshnessResponse {
  sales: DataSourceFreshness;
  inventory: DataSourceFreshness;
  boats: DataSourceFreshness;
}

export interface SACUploadResponse {
  success: boolean;
  total_rows: number;
  processed_rows: number;
  skipped_non_tile: number;
  skipped_errors: number;
  errors: Array<{
    row: number;
    field: string;
    error: string;
    value?: string;
  }>;
  sales_created: number;
  sales_updated: number;
  unique_customers: number;
  total_m2: number;
  total_revenue_usd: number;
  date_range_start: string;
  date_range_end: string;
  top_product_sku: string | null;
  top_product_m2: number | null;
  non_tile_products: string[];
}

export interface SACPreviewRow {
  sku: string;
  sale_date: string;
  quantity_m2: number;
  customer: string | null;
  matched_by: string;
}

export interface SACPreview {
  preview_id: string;
  row_count: number;
  total_m2: number;
  date_range_start: string | null;
  date_range_end: string | null;
  matched_by_sac_sku: number;
  matched_by_name: number;
  unmatched_count: number;
  match_rate_pct: number;
  unmatched_products: string[];
  unique_customers: number;
  unique_products: number;
  top_product: string | null;
  skipped_non_tile: number;
  skipped_products: string[];
  warnings: string[];
  sample_rows: SACPreviewRow[];
  expires_in_minutes: number;
}

export interface SIESAUploadResponse {
  success: boolean;
  snapshot_date: string;
  total_rows: number;
  processed_rows: number;
  skipped_errors: number;
  errors: Array<{
    row: number;
    field: string;
    error: string;
    value?: string;
  }>;
  lots_created: number;
  unique_products: number;
  total_m2_available: number;
  total_weight_kg: number;
  container_limit_kg: number;
  containers_needed: number;
  container_utilization_pct: number;
  matched_by_siesa_item: number;
  matched_by_name: number;
  unmatched_count: number;
  match_rate_pct: number;
  unmatched_products: string[];
  warehouses: Array<{
    code: string;
    name: string;
    total_m2: number;
    total_weight_kg: number;
    lot_count: number;
  }>;
}

export interface SalesPreviewRow {
  sku: string;
  week_start: string;
  quantity_m2: number;
  customer: string | null;
}

export interface SalesPreview {
  preview_id: string;
  row_count: number;
  product_count: number;
  total_m2: number;
  date_range_start: string;
  date_range_end: string;
  warnings: string[];
  sample_rows: SalesPreviewRow[];
  expires_in_minutes: number;
}

export interface VerificationCheck {
  excel: number;
  db: number;
  match: boolean;
}

export interface SalesMismatch {
  sku: string;
  excel_m2: number;
  db_m2: number;
  diff: number;
}

export interface SalesVerification {
  status: string;
  row_count: VerificationCheck;
  total_m2: VerificationCheck;
  products: VerificationCheck;
  mismatches: SalesMismatch[];
}

export interface OwnerSalesUploadResponse {
  success: boolean;
  inserted: number;
  deleted: number;
  date_range: { start: string; end: string } | null;
  verification: SalesVerification | null;
  warnings: string[];
}

export interface InTransitUploadDetail {
  sku: string;
  in_transit_m2: number;
}

export interface ReconciliationItem {
  sku: string;
  dispatch_m2: number;
  draft_m2: number;
  diff_m2: number;
  status: 'match' | 'mismatch' | 'dispatch_only' | 'draft_only';
  boat_name?: string;
}

export interface ReconciliationSummary {
  matched: number;
  mismatched: number;
  dispatch_only: number;
  draft_only: number;
  items: ReconciliationItem[];
}

export interface InTransitUploadResponse {
  success: boolean;
  snapshot_date: string;
  products_updated: number;
  products_reset: number;
  total_in_transit_m2: number;
  excluded_orders: string[];
  unmatched_skus: string[];
  details: InTransitUploadDetail[];
  reconciliation?: ReconciliationSummary;
}

export interface SIESAPreviewLot {
  sku: string;
  warehouse_name: string | null;
  lot_number: string;
  quantity_m2: number;
  weight_kg: number | null;
}

export interface SIESAPreview {
  preview_id: string;
  snapshot_date: string;
  total_rows: number;
  lots_count: number;
  unique_products: number;
  total_m2_available: number;
  total_weight_kg: number;
  containers_needed: number;
  container_utilization_pct: number;
  matched_by_siesa_item: number;
  matched_by_name: number;
  unmatched_count: number;
  match_rate_pct: number;
  unmatched_products: string[];
  warehouses: Array<{
    code: string;
    name: string;
    total_m2: number;
    total_weight_kg: number;
    lot_count: number;
  }>;
  warnings: string[];
  sample_lots: SIESAPreviewLot[];
  expires_in_minutes: number;
}

export interface UploadHistoryItem {
  upload_type: string;
  label: string;
  filename: string;
  row_count: number;
  uploaded_at: string;
}

export interface UploadHistoryResponse {
  items: UploadHistoryItem[];
}

export const dataHubApi = {
  getFreshness: async (): Promise<DataFreshnessResponse> => {
    const response = await api.get('/data-freshness');
    return response.data;
  },

  uploadSAC: async (file: File): Promise<SACUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/sales/upload-sac', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  previewSACUpload: async (file: File): Promise<SACPreview> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/sales/upload-sac/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  confirmSACUpload: async (previewId: string): Promise<SACUploadResponse> => {
    const response = await api.post(`/sales/upload-sac/confirm/${previewId}`);
    return response.data;
  },

  previewSalesUpload: async (file: File): Promise<SalesPreview> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/sales/upload/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  confirmSalesUpload: async (previewId: string): Promise<OwnerSalesUploadResponse> => {
    const response = await api.post(`/sales/upload/confirm/${previewId}`);
    return response.data;
  },

  uploadSIESA: async (file: File, snapshotDate?: string): Promise<SIESAUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const params = snapshotDate ? { snapshot_date: snapshotDate } : {};
    const response = await api.post('/inventory/siesa/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params,
    });
    return response.data;
  },

  previewSIESA: async (file: File, snapshotDate?: string): Promise<SIESAPreview> => {
    const formData = new FormData();
    formData.append('file', file);
    const params = snapshotDate ? { snapshot_date: snapshotDate } : {};
    const response = await api.post('/inventory/siesa/upload/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params,
    });
    return response.data;
  },

  confirmSIESA: async (
    previewId: string,
    manualMappings?: Array<{ original_key: string; mapped_product_id: string }>,
  ): Promise<SIESAUploadResponse> => {
    const body = manualMappings?.length ? { manual_mappings: manualMappings } : undefined;
    const response = await api.post(`/inventory/siesa/upload/confirm/${previewId}`, body);
    return response.data;
  },

  uploadInTransit: async (
    file: File,
  ): Promise<InTransitUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(
      '/inventory/in-transit/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  getUploadHistory: async (limit = 20): Promise<UploadHistoryResponse> => {
    const response = await api.get('/data-freshness/upload-history', { params: { limit } });
    return response.data;
  },
};
