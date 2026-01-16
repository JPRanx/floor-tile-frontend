import api from './api';

export interface InventorySnapshot {
  id: string;
  product_id: string;
  warehouse_qty: number;
  in_transit_qty: number;
  snapshot_date: string;
  notes: string | null;
  created_at: string;
  // Joined product info
  sku?: string;
  category?: string;
  rotation?: string;
}

export interface LatestInventoryResponse {
  data: InventorySnapshot[];
  total: number;
  as_of: string;
}

export const inventoryApi = {
  /**
   * Get latest inventory snapshot for all products with metadata
   */
  getLatest: async (): Promise<LatestInventoryResponse> => {
    const response = await api.get('/inventory/current');
    return response.data;
  },

  /**
   * Update a single inventory snapshot
   */
  updateSnapshot: async (
    id: string,
    data: { warehouse_qty: number; notes?: string }
  ): Promise<InventorySnapshot> => {
    const response = await api.patch(`/inventory/${id}`, data);
    return response.data;
  },

  /**
   * Bulk update multiple inventory snapshots
   */
  bulkUpdate: async (
    updates: Array<{ id: string; warehouse_qty: number }>
  ): Promise<InventorySnapshot[]> => {
    const promises = updates.map((u) =>
      api.patch(`/inventory/${u.id}`, { warehouse_qty: u.warehouse_qty })
    );
    const results = await Promise.all(promises);
    return results.map((r) => r.data);
  },
};