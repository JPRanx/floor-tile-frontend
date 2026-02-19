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
  carrier: string | null;
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
  skipped: number;
  skipped_rows: Array<{ row: number; reason: string }>;
  errors: string[];
}

export interface BoatPreviewRow {
  row_index: number;
  vessel_name: string | null;
  departure_date: string;
  arrival_date: string;
  transit_days: number;
  origin_port: string;
  destination_port: string;
  carrier: string | null;
  action: string;
}

export interface BoatPreview {
  preview_id: string;
  total_rows: number;
  new_boats: number;
  updated_boats: number;
  skipped_boats: number;
  earliest_departure: string | null;
  latest_departure: string | null;
  skipped_rows: Array<{ row: number; reason: string }>;
  warnings: string[];
  rows: BoatPreviewRow[];
  sample_rows: BoatPreviewRow[];
  expires_in_minutes: number;
}

export interface BoatModification {
  row_index: number;
  departure_date?: string;
  arrival_date?: string;
  vessel_name?: string;
  carrier?: string;
}

export interface BoatConfirmPayload {
  preview_id: string;
  modifications: BoatModification[];
  deletions: number[];
}

export interface BoatListResponse {
  data: BoatSchedule[];
  total: number;
}

export interface BoatScheduleCreate {
  vessel_name?: string;
  shipping_line?: string;
  departure_date: string;
  arrival_date: string;
  transit_days: number;
  origin_port?: string;
  destination_port?: string;
  carrier?: string;
}

export const boatsApi = {
  /**
   * Create a new boat schedule (used to materialize estimated boats)
   */
  create: async (data: BoatScheduleCreate): Promise<BoatSchedule> => {
    const response = await api.post('/boats', data);
    return response.data;
  },

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
   * Preview TIBA Excel file upload
   */
  preview: async (file: File): Promise<BoatPreview> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/boats/upload/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Confirm previewed boat upload with optional modifications/deletions
   */
  confirmUpload: async (
    previewId: string,
    payload?: { modifications: BoatModification[]; deletions: number[] }
  ): Promise<BoatUploadResult> => {
    const body = payload
      ? { preview_id: previewId, modifications: payload.modifications, deletions: payload.deletions }
      : undefined;
    const response = await api.post(`/boats/upload/confirm/${previewId}`, body);
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
