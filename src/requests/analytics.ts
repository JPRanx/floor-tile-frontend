import api from './api';

// Types matching backend models
export interface CustomerSummary {
  customer_normalized: string;
  total_revenue_usd: string;
  total_quantity_m2: string;
  order_count: number;
  first_purchase: string | null;
  last_purchase: string | null;
  avg_order_value_usd: string;
}

export interface CostSummary {
  total_fob_usd: string;
  total_freight_usd: string;
  total_customs_usd: string;
  total_duties_usd: string;
  total_insurance_usd: string;
  total_demurrage_usd: string;
  total_other_usd: string;
  total_costs_usd: string;
  shipment_count: number;
}

export interface FinancialOverview {
  revenue: string;
  costs: string;
  margin: string;
  margin_pct: string;
  top_customers: CustomerSummary[];
  cost_breakdown: CostSummary;
}

export interface MoneyFlowInflow {
  source: string;
  amount: string;
}

export interface MoneyFlowOutflow {
  category: string;
  amount: string;
}

export interface MoneyFlowResponse {
  inflows: MoneyFlowInflow[];
  outflows: MoneyFlowOutflow[];
  total_revenue: string;
  total_costs: string;
  margin: string;
}

export interface CustomerAnalyticsResponse {
  data: CustomerSummary[];
  total_customers: number;
  total_revenue_usd: string;
  period_start: string | null;
  period_end: string | null;
}

export interface ProductSummary {
  sku: string;
  total_revenue_usd: string;
  quantity_sold_m2: number;
}

export const analyticsApi = {
  getOverview: async (): Promise<FinancialOverview> => {
    const response = await api.get('/analytics/overview');
    return response.data;
  },

  getMoneyFlow: async (groupBy: 'customer' | 'product' = 'customer'): Promise<MoneyFlowResponse> => {
    const response = await api.get('/analytics/money-flow', {
      params: { group_by: groupBy }
    });
    return response.data;
  },

  getCustomers: async (limit = 20): Promise<CustomerAnalyticsResponse> => {
    const response = await api.get('/analytics/customers', { params: { limit } });
    return response.data;
  },

  getCosts: async (): Promise<CostSummary> => {
    const response = await api.get('/analytics/costs');
    return response.data;
  },

  getTopProducts: async (limit = 5): Promise<{ data: ProductSummary[] }> => {
    const response = await api.get('/analytics/products', { params: { limit } });
    return response.data;
  },
};
