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
};
