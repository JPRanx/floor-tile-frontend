import api from './api';

// Types matching backend models
export type BoatStatus = 'available' | 'booked' | 'departed' | 'arrived';
export type RouteType = 'direct' | 'with_stops';

export interface BoatSchedule {
  id: string;
  vessel_name: string | null;
  shipping_line: string | null;
  departure_date: string;
  arrival_date: string;
  transit_days: number;
  origin_port: string;
  destination_port: string;
  route_type: RouteType | null;
  booking_deadline: string;
  status: BoatStatus;
  source_file: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields from backend
  days_until_departure: number | null;
  days_until_deadline: number | null;
  is_past_deadline: boolean;
}

export interface BoatUploadResult {
  imported: number;
  updated: number;
  errors: Array<{
    row: number;
    field: string;
    error: string;
  }>;
}

export interface BoatListResponse {
  data: BoatSchedule[];
  total: number;
}

export const boatsApi = {
  /**
   * Get all boat schedules with optional filters
   */
  getAll: async (params?: {
    status?: BoatStatus;
    from_date?: string;
    to_date?: string;
  }): Promise<BoatListResponse> => {
    const response = await api.get('/boats', { params });
    return response.data;
  },

  /**
   * Get available boats (not yet departed)
   */
  getAvailable: async (): Promise<BoatListResponse> => {
    const response = await api.get('/boats/available');
    return response.data;
  },

  /**
   * Get next available boat
   */
  getNext: async (): Promise<BoatSchedule | null> => {
    const response = await api.get('/boats/next');
    return response.data;
  },

  /**
   * Get single boat by ID
   */
  getById: async (id: string): Promise<BoatSchedule> => {
    const response = await api.get(`/boats/${id}`);
    return response.data;
  },

  /**
   * Upload TIBA Excel file
   */
  upload: async (file: File): Promise<BoatUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/boats/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Update boat status
   */
  updateStatus: async (id: string, status: BoatStatus): Promise<BoatSchedule> => {
    const response = await api.patch(`/boats/${id}/status`, { status });
    return response.data;
  },

  /**
   * Delete a boat schedule
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/boats/${id}`);
  },
};
