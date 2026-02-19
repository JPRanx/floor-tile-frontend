import api from './api';

export interface InventoryUploadResponse {
  success: boolean;
  records_created: number;
  message: string;
}

export interface SalesUploadResponse {
  created: number;
  records: Array<{
    id: string;
    product_id: string;
    week_start: string;
    quantity_m2: number;
  }>;
}

export interface UploadError {
  sheet: string;
  row: number;
  field?: string;
  error: string;
}

export interface InventoryPreviewRow {
  product_id: string;
  sku: string;
  warehouse_qty: number;
  in_transit_qty: number;
  snapshot_date: string;
}

export interface InventoryPreview {
  preview_id: string;
  row_count: number;
  product_count: number;
  snapshot_date: string;
  auto_created_products: string[];
  auto_created_count: number;
  zero_filled_count: number;
  zero_filled_products: string[];
  warnings: string[];
  rows: InventoryPreviewRow[];
  sample_rows: InventoryPreviewRow[];
  expires_in_minutes: number;
}

export interface InventoryModification {
  product_id: string;
  warehouse_qty?: number;
  in_transit_qty?: number;
}

export interface InventoryConfirmPayload {
  preview_id: string;
  modifications: InventoryModification[];
  deletions: string[];
}

export const uploadApi = {
  uploadInventory: async (file: File): Promise<InventoryUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/inventory/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadSales: async (file: File): Promise<SalesUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/sales/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  previewInventory: async (file: File): Promise<InventoryPreview> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/inventory/upload/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  confirmInventory: async (
    previewId: string,
    payload?: { modifications: InventoryModification[]; deletions: string[] }
  ): Promise<InventoryUploadResponse> => {
    const body = payload
      ? { preview_id: previewId, modifications: payload.modifications, deletions: payload.deletions }
      : undefined;
    const response = await api.post(`/inventory/upload/confirm/${previewId}`, body);
    return response.data;
  },
};
