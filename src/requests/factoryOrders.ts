import api from './api';

export interface FactoryOrderItemCreate {
  product_id: string;
  quantity_ordered: number; // in m²
  estimated_ready_date?: string;
}

export interface FactoryOrderCreate {
  order_date: string; // YYYY-MM-DD
  boat_schedule_id?: string;
  notes?: string;
  items: FactoryOrderItemCreate[];
}

export interface FactoryOrderItem {
  id: string;
  factory_order_id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_produced: number;
  estimated_ready_date: string | null;
  actual_ready_date: string | null;
  created_at: string;
  product_sku: string | null;
}

export interface FactoryOrder {
  id: string;
  pv_number: string | null;
  order_date: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY' | 'SHIPPED';
  notes: string | null;
  active: boolean;
  total_m2: number | null;
  item_count: number | null;
  created_at: string;
  updated_at: string | null;
  items?: FactoryOrderItem[];
}

export interface FactoryOrderListResponse {
  data: FactoryOrder[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const factoryOrdersApi = {
  create: async (data: FactoryOrderCreate): Promise<FactoryOrder> => {
    const response = await api.post('/factory-orders', data);
    return response.data;
  },

  getByPv: async (pvNumber: string): Promise<FactoryOrder> => {
    const response = await api.get(`/factory-orders/pv/${pvNumber}`);
    return response.data;
  },

  getById: async (orderId: string): Promise<FactoryOrder> => {
    const response = await api.get(`/factory-orders/${orderId}`);
    return response.data;
  },

  list: async (
    page = 1,
    pageSize = 20,
    status?: string
  ): Promise<FactoryOrderListResponse> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    if (status) {
      params.append('status', status);
    }
    const response = await api.get(`/factory-orders?${params.toString()}`);
    return response.data;
  },

  search: async (
    query: string,
    limit = 10,
    excludeShipped = true
  ): Promise<FactoryOrder[]> => {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('limit', limit.toString());
    params.append('exclude_shipped', excludeShipped.toString());
    const response = await api.get(`/factory-orders/search?${params.toString()}`);
    return response.data;
  },

  updateStatus: async (orderId: string, status: string): Promise<FactoryOrder> => {
    const response = await api.patch(`/factory-orders/${orderId}/status`, { status });
    return response.data;
  },
};