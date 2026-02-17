import api from './api';

export interface Factory {
  id: string;
  name: string;
  country: string;
  origin_port: string;
  production_lead_days: number;
  piggyback_lead_days: number;
  transport_to_port_days: number;
  cutoff_day: string;
  monthly_quota_m2: number;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const factoriesApi = {
  getActive: async (): Promise<Factory[]> => {
    const response = await api.get<Factory[]>('/factories/active');
    return response.data;
  },

  getAll: async (): Promise<Factory[]> => {
    const response = await api.get<Factory[]>('/factories');
    return response.data;
  },

  getById: async (id: string): Promise<Factory> => {
    const response = await api.get<Factory>(`/factories/${id}`);
    return response.data;
  },
};
