import api from './api';

export interface ProductTypeConfig {
  id: string;
  category_group: string;
  display_name: string;
  m2_per_pallet: string;
  weight_per_m2_kg: string;
  is_m2_based: boolean;
  unit_label: string;
  notes: string | null;
}

export interface ConfigResponse {
  global: Record<string, string>;
  product_types: Record<string, ProductTypeConfig>;
}

export interface ProductTypeCreate {
  category_group: string;
  display_name: string;
  m2_per_pallet: number;
  weight_per_m2_kg: number;
  is_m2_based: boolean;
  unit_label: string;
  notes?: string;
}

export const configApi = {
  async getConfig(): Promise<ConfigResponse> {
    const response = await api.get('/config');
    return response.data;
  },

  async updateSetting(key: string, value: string): Promise<void> {
    await api.put(`/config/settings/${key}`, { value });
  },

  async updateProductType(categoryGroup: string, data: Partial<ProductTypeCreate>): Promise<ProductTypeConfig> {
    const response = await api.put(`/config/product-types/${categoryGroup}`, data);
    return response.data;
  },

  async createProductType(data: ProductTypeCreate): Promise<ProductTypeConfig> {
    const response = await api.post('/config/product-types', data);
    return response.data;
  },

  async reloadConfig(): Promise<void> {
    await api.post('/config/reload');
  },
};
