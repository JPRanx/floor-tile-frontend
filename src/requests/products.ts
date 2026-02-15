import api from './api';

// Types
export type InactiveReason = 'DISCONTINUED' | 'NO_STOCK' | 'SEASONAL' | 'REPLACED' | 'OTHER';
export type Category = 'MADERAS' | 'EXTERIORES' | 'MARMOLIZADOS' | 'OTHER' | 'FURNITURE' | 'SINK' | 'SURCHARGE';
export type Rotation = 'ALTA' | 'MEDIA-ALTA' | 'MEDIA' | 'BAJA';

export interface Product {
  id: string;
  sku: string;
  owner_code: string | null;
  factory_code: string | null;
  sac_sku: number | null;
  siesa_item: number | null;
  category: Category;
  rotation: Rotation | null;
  active: boolean;
  fob_cost_usd: number | null;
  inactive_reason: InactiveReason | null;
  inactive_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BulkStatusUpdateRequest {
  product_ids: string[];
  active: boolean;
  inactive_reason?: InactiveReason;
  inactive_date?: string;
}

export interface BulkStatusUpdateResponse {
  updated: number;
  failed: string[];
}

export interface ProductFilters {
  page?: number;
  page_size?: number;
  category?: Category;
  rotation?: Rotation;
  include_inactive?: boolean;
}

export interface LiquidationProduct {
  id: string;
  sku: string;
  category: Category;
  rotation: Rotation | null;
  inactive_reason: InactiveReason | null;
  inactive_date: string | null;
  warehouse_m2: number;
  factory_m2: number;
  days_since_last_sale: number | null;
}

// API functions
export const productsApi = {
  /**
   * Search products by SKU substring (for manual resolution dropdowns)
   */
  async searchProducts(query: string, limit: number = 10): Promise<Product[]> {
    const response = await api.get<Product[]>('/products/search', {
      params: { q: query, limit },
    });
    return response.data;
  },

  /**
   * Get list of products with optional filters
   */
  async getProducts(filters: ProductFilters = {}): Promise<ProductListResponse> {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.page_size) params.append('page_size', filters.page_size.toString());
    if (filters.category) params.append('category', filters.category);
    if (filters.rotation) params.append('rotation', filters.rotation);
    if (filters.include_inactive !== undefined) {
      params.append('include_inactive', filters.include_inactive.toString());
    }

    const response = await api.get<ProductListResponse>(`/products?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a single product by ID
   */
  async getProduct(id: string): Promise<Product> {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  },

  /**
   * Update a single product
   */
  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const response = await api.patch<Product>(`/products/${id}`, data);
    return response.data;
  },

  /**
   * Bulk update product status (activate/deactivate)
   */
  async bulkUpdateStatus(request: BulkStatusUpdateRequest): Promise<BulkStatusUpdateResponse> {
    const response = await api.patch<BulkStatusUpdateResponse>('/products/bulk/status', request);
    return response.data;
  },

  /**
   * Deactivate a single product
   */
  async deactivateProduct(id: string, reason: InactiveReason): Promise<Product> {
    return this.updateProduct(id, {
      active: false,
      inactive_reason: reason,
      inactive_date: new Date().toISOString().split('T')[0],
    } as Partial<Product>);
  },

  /**
   * Reactivate a single product
   */
  async reactivateProduct(id: string): Promise<Product> {
    return this.updateProduct(id, {
      active: true,
    } as Partial<Product>);
  },

  async getLiquidationProducts(): Promise<LiquidationProduct[]> {
    const response = await api.get<LiquidationProduct[]>('/products/liquidation');
    return response.data;
  },
};

// Reason display labels (for UI)
export const INACTIVE_REASON_LABELS: Record<InactiveReason, string> = {
  DISCONTINUED: 'Discontinued by Factory',
  NO_STOCK: 'No Stock Available',
  SEASONAL: 'Seasonal Product',
  REPLACED: 'Replaced by New Product',
  OTHER: 'Other Reason',
};
