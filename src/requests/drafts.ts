import api from './api';

export type DraftStatus = 'drafting' | 'action_needed' | 'ordered' | 'confirmed';

export interface DraftItem {
  id: string;
  draft_id: string;
  product_id: string;
  selected_pallets: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Draft {
  id: string;
  boat_id: string;
  factory_id: string;
  status: DraftStatus;
  notes: string | null;
  last_edited_at: string | null;
  ordered_at: string | null;
  items: DraftItem[];
  created_at: string;
  updated_at: string;
}

export interface DraftItemCreate {
  product_id: string;
  selected_pallets: number;
  notes?: string | null;
}

export interface DraftSaveRequest {
  boat_id: string;
  factory_id: string;
  notes?: string | null;
  items: DraftItemCreate[];
}

export const draftsApi = {
  getDraft: async (boatId: string, factoryId: string): Promise<Draft | null> => {
    try {
      const response = await api.get<Draft>(`/drafts/${boatId}/${factoryId}`);
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 404) return null;
      throw err;
    }
  },

  listForBoat: async (boatId: string): Promise<Draft[]> => {
    const response = await api.get<Draft[]>(`/drafts/boat/${boatId}`);
    return response.data;
  },

  save: async (data: DraftSaveRequest): Promise<Draft> => {
    const response = await api.post<Draft>('/drafts', data);
    return response.data;
  },

  updateStatus: async (draftId: string, status: DraftStatus): Promise<Draft> => {
    const response = await api.patch<Draft>(`/drafts/${draftId}/status`, { status });
    return response.data;
  },

  delete: async (draftId: string): Promise<void> => {
    await api.delete(`/drafts/${draftId}`);
  },
};
