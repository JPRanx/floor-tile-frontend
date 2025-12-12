import api from './api';

// Boat-based priority system
export type StockoutStatus =
  | 'HIGH_PRIORITY'  // Will stock out before next boat arrives
  | 'CONSIDER'       // Will stock out before second boat arrives
  | 'WELL_COVERED'   // Won't stock out for 2+ boat cycles
  | 'YOUR_CALL';     // No data / needs manual review

export interface DashboardSummary {
  total_products: number;
  high_priority_count: number;
  consider_count: number;
  well_covered_count: number;
  your_call_count: number;
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
  total_qty: number;
  avg_daily_sales: number;
  weekly_sales: number;
  weeks_of_data: number;
  days_to_stockout: number | null;
  stockout_date: string | null;
  status: StockoutStatus;
  status_reason: string;
}

export interface StockoutSummary {
  total_products: number;
  high_priority_count: number;
  consider_count: number;
  well_covered_count: number;
  your_call_count: number;
  next_boat_arrival: string | null;
  second_boat_arrival: string | null;
  days_to_next_boat: number | null;
  days_to_second_boat: number | null;
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

  getHighPriorityProducts: async (): Promise<ProductStockout[]> => {
    const response = await api.get('/dashboard/stockout/high-priority');
    return response.data;
  },
};
