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
};
