import api from './api';

// ===================
// TYPES
// ===================

export type WarehouseOrderStatus = 'pending' | 'shipped' | 'received' | 'cancelled';
export type Priority = 'HIGH_PRIORITY' | 'CONSIDER' | 'WELL_COVERED' | 'YOUR_CALL';

export interface WarehouseOrderItemCreate {
  product_id?: string;
  sku: string;
  description?: string;
  pallets: number;
  m2: number;
  weight_kg?: number;
  score?: number;
  priority?: Priority;
  is_critical?: boolean;
  primary_customer?: string;
  bl_number?: number;
}

export interface WarehouseOrderCreate {
  boat_id: string;
  items: WarehouseOrderItemCreate[];
  notes?: string;
  exported_by?: string;
  excel_filename?: string;
  boat_departure_date?: string;
  boat_arrival_date?: string;
  estimated_warehouse_date?: string;
  boat_name?: string;
}

export interface WarehouseOrderItem {
  id: string;
  warehouse_order_id: string;
  product_id: string | null;
  sku: string;
  description: string | null;
  pallets: number;
  m2: number;
  weight_kg: number;
  score: number | null;
  priority: Priority | null;
  is_critical: boolean;
  primary_customer: string | null;
  bl_number: number | null;
  created_at: string;
}

export interface WarehouseOrder {
  id: string;
  boat_id: string | null;
  status: WarehouseOrderStatus;
  created_at: string;
  updated_at: string | null;
  shipped_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  boat_departure_date: string | null;
  boat_arrival_date: string | null;
  estimated_warehouse_date: string | null;
  boat_name: string | null;
  export_date: string | null;
  exported_by: string | null;
  excel_filename: string | null;
  total_pallets: number;
  total_m2: number;
  total_containers: number;
  total_weight_kg: number;
  notes: string | null;
  item_count: number | null;
  items?: WarehouseOrderItem[];
}

export interface WarehouseOrderListResponse {
  data: WarehouseOrder[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PendingOrdersForBoat {
  boat_id: string;
  boat_departure_date: string;
  total_pallets: number;
  total_m2: number;
  order_count: number;
}

export interface PendingOrdersBySku {
  sku: string;
  product_id: string | null;
  total_pallets: number;
  total_m2: number;
  order_count: number;
  boat_ids: string[];
}

// ===================
// API CLIENT
// ===================

export const warehouseOrdersApi = {
  /**
   * Create a new warehouse order.
   * Re-export logic: If a PENDING order exists for the same boat,
   * it will be automatically cancelled and replaced.
   */
  create: async (data: WarehouseOrderCreate): Promise<WarehouseOrder> => {
    const response = await api.post('/warehouse-orders', data);
    return response.data;
  },

  /**
   * Get a warehouse order by ID.
   */
  getById: async (orderId: string): Promise<WarehouseOrder> => {
    const response = await api.get(`/warehouse-orders/${orderId}`);
    return response.data;
  },

  /**
   * List warehouse orders with optional filters.
   */
  list: async (
    page = 1,
    pageSize = 20,
    status?: WarehouseOrderStatus,
    boatId?: string
  ): Promise<WarehouseOrderListResponse> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    if (status) {
      params.append('status', status);
    }
    if (boatId) {
      params.append('boat_id', boatId);
    }
    const response = await api.get(`/warehouse-orders?${params.toString()}`);
    return response.data;
  },

  /**
   * Get all orders for a specific boat.
   */
  getByBoat: async (boatId: string, status?: WarehouseOrderStatus): Promise<WarehouseOrder[]> => {
    const params = new URLSearchParams();
    if (status) {
      params.append('status', status);
    }
    const response = await api.get(`/warehouse-orders/boat/${boatId}?${params.toString()}`);
    return response.data;
  },

  /**
   * Get pending orders for a specific boat (aggregated).
   * Used to show what's already ordered for this boat.
   */
  getPendingForBoat: async (boatId: string): Promise<PendingOrdersForBoat | null> => {
    const response = await api.get(`/warehouse-orders/pending/by-boat/${boatId}`);
    return response.data;
  },

  /**
   * Get pending orders grouped by SKU.
   * Used in coverage calculation: coverage_gap = need - stock - in_transit - pending_orders
   */
  getPendingBySku: async (): Promise<PendingOrdersBySku[]> => {
    const response = await api.get('/warehouse-orders/pending/by-sku');
    return response.data;
  },

  /**
   * Update warehouse order status.
   * Valid transitions: pending -> shipped -> received, pending -> cancelled
   */
  updateStatus: async (orderId: string, status: WarehouseOrderStatus): Promise<WarehouseOrder> => {
    const response = await api.patch(`/warehouse-orders/${orderId}/status`, { status });
    return response.data;
  },

  /**
   * Cancel a warehouse order.
   * Only PENDING orders can be cancelled.
   */
  cancel: async (orderId: string, reason?: string): Promise<void> => {
    const params = new URLSearchParams();
    if (reason) {
      params.append('reason', reason);
    }
    await api.post(`/warehouse-orders/${orderId}/cancel?${params.toString()}`);
  },

  /**
   * Get order count.
   */
  count: async (status?: WarehouseOrderStatus, boatId?: string): Promise<number> => {
    const params = new URLSearchParams();
    if (status) {
      params.append('status', status);
    }
    if (boatId) {
      params.append('boat_id', boatId);
    }
    const response = await api.get(`/warehouse-orders/count/total?${params.toString()}`);
    return response.data.count;
  },
};
