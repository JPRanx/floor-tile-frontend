import api from './api';

export interface DashboardSummary {
  total_products: number;
  critical_count: number;
  warning_count: number;
  ok_count: number;
  no_sales_count: number;
  total_warehouse_m2: number;
  total_in_transit_m2: number;
}

export interface ProductStockout {
  product_id: string;
  sku: string;
  category: string;
  rotation: string;
  warehouse_qty: number;
  in_transit_qty: number;
  daily_velocity: number;
  days_until_empty: number | null;
  stockout_date: string | null;
  status: 'CRITICAL' | 'WARNING' | 'OK' | 'NO_SALES';
}

export interface StockoutSummary {
  total_products: number;
  critical_count: number;
  warning_count: number;
  ok_count: number;
  no_sales_count: number;
  lead_time_days: number;
  warning_threshold_days: number;
  products: ProductStockout[];
}

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await api.get('/dashboard/summary');
    return response.data;
  },

  getStockoutList: async (): Promise<StockoutSummary> => {
    const response = await api.get('/dashboard/stockout');
    return response.data;
  },

  getCriticalProducts: async (): Promise<ProductStockout[]> => {
    const response = await api.get('/dashboard/stockout/critical');
    return response.data;
  },
};
