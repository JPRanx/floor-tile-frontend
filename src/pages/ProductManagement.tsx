import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { productsApi, INACTIVE_REASON_LABELS } from '../requests/products';
import type { Product, InactiveReason, Category, LiquidationProduct } from '../requests/products';
import { LiquidationSection } from '../components/products/LiquidationSection';

// Category display labels
const CATEGORY_LABELS: Record<Category, string> = {
  MADERAS: 'Maderas',
  EXTERIORES: 'Exteriores',
  MARMOLIZADOS: 'Marmolizados',
  OTHER: 'Other',
  FURNITURE: 'Furniture',
  SINK: 'Sink',
  SURCHARGE: 'Surcharge',
};

export function ProductManagement() {
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [liquidationProducts, setLiquidationProducts] = useState<LiquidationProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  // Filters
  const [showInactive, setShowInactive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'deactivate' | 'reactivate'>('deactivate');
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [selectedReason, setSelectedReason] = useState<InactiveReason>('DISCONTINUED');
  const [processingAction, setProcessingAction] = useState(false);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const result = await productsApi.getProducts({
        page,
        page_size: pageSize,
        include_inactive: showInactive,
      });
      setProducts(result.data);
      setTotalPages(result.total_pages);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      setError('Failed to load products');
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, [page, showInactive]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch liquidation products
  useEffect(() => {
    const fetchLiquidation = async () => {
      try {
        const data = await productsApi.getLiquidationProducts();
        setLiquidationProducts(data);
      } catch (err) {
        console.error('Failed to load liquidation products:', err);
      }
    };
    fetchLiquidation();
  }, []);

  // Filter products by search
  const filteredProducts = products.filter((p) =>
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle single product deactivation
  const handleDeactivate = (product: Product) => {
    setModalProduct(product);
    setModalMode('deactivate');
    setSelectedReason('DISCONTINUED');
    setModalOpen(true);
  };

  // Handle single product reactivation
  const handleReactivate = (product: Product) => {
    setModalProduct(product);
    setModalMode('reactivate');
    setModalOpen(true);
  };

  // Handle bulk deactivation
  const handleBulkDeactivate = () => {
    setModalProduct(null);
    setModalMode('deactivate');
    setSelectedReason('DISCONTINUED');
    setModalOpen(true);
  };

  // Handle bulk reactivation
  const handleBulkReactivate = () => {
    setModalProduct(null);
    setModalMode('reactivate');
    setModalOpen(true);
  };

  // Confirm action
  const confirmAction = async () => {
    setProcessingAction(true);
    try {
      if (modalProduct) {
        // Single product action
        if (modalMode === 'deactivate') {
          await productsApi.deactivateProduct(modalProduct.id, selectedReason);
        } else {
          await productsApi.reactivateProduct(modalProduct.id);
        }
      } else {
        // Bulk action
        const ids = Array.from(selectedIds);
        if (modalMode === 'deactivate') {
          await productsApi.bulkUpdateStatus({
            product_ids: ids,
            active: false,
            inactive_reason: selectedReason,
          });
        } else {
          await productsApi.bulkUpdateStatus({
            product_ids: ids,
            active: true,
          });
        }
        setSelectedIds(new Set());
      }

      setModalOpen(false);
      await fetchProducts();
    } catch (err) {
      console.error('Action failed:', err);
      setError('Failed to update product(s)');
    } finally {
      setProcessingAction(false);
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  // Select all visible
  const selectAll = () => {
    const allIds = new Set(filteredProducts.map((p) => p.id));
    setSelectedIds(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Get selected products for bulk action display
  const getSelectedActiveCount = () =>
    filteredProducts.filter((p) => selectedIds.has(p.id) && p.active).length;
  const getSelectedInactiveCount = () =>
    filteredProducts.filter((p) => selectedIds.has(p.id) && !p.active).length;

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Product Management</h1>
            <p className="text-slate-400 mt-1">
              {total} products total ({products.filter((p) => p.active).length} active,{' '}
              {products.filter((p) => !p.active).length} inactive)
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Controls Bar */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-md">
              <input
                type="text"
                placeholder="Search by SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => {
                    setShowInactive(e.target.checked);
                    setPage(1);
                  }}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                />
                Show Inactive
              </label>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">{selectedIds.size} selected</span>
                {getSelectedActiveCount() > 0 && (
                  <button
                    onClick={handleBulkDeactivate}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Deactivate ({getSelectedActiveCount()})
                  </button>
                )}
                {getSelectedInactiveCount() > 0 && (
                  <button
                    onClick={handleBulkReactivate}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Reactivate ({getSelectedInactiveCount()})
                  </button>
                )}
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                    onChange={() =>
                      selectedIds.size === filteredProducts.length ? clearSelection() : selectAll()
                    }
                    className="w-4 h-4 rounded bg-slate-600 border-slate-500 text-blue-500 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">SKU</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Rotation</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Reason</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Date</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className={`hover:bg-slate-750 ${!product.active ? 'bg-slate-800/50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelection(product.id)}
                      className="w-4 h-4 rounded bg-slate-600 border-slate-500 text-blue-500 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${product.active ? 'text-white' : 'text-slate-400'}`}>
                      {product.sku}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-sm">
                    {CATEGORY_LABELS[product.category] || product.category}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-sm">
                    {product.rotation || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {product.active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/50 text-emerald-400 border border-emerald-500/30">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-400 border border-red-500/30">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">
                    {product.inactive_reason
                      ? INACTIVE_REASON_LABELS[product.inactive_reason]
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">
                    {product.inactive_date || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {product.active ? (
                      <button
                        onClick={() => handleDeactivate(product)}
                        className="px-3 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-sm rounded border border-amber-500/30 transition-colors"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(product)}
                        className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm rounded border border-emerald-500/30 transition-colors"
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-between items-center">
            <p className="text-slate-400 text-sm">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Liquidation Section */}
        {liquidationProducts.length > 0 && (
          <div className="mt-6">
            <LiquidationSection products={liquidationProducts} />
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">
                {modalMode === 'deactivate' ? 'Deactivate Product(s)' : 'Reactivate Product(s)'}
              </h2>

              {modalProduct ? (
                <p className="text-slate-300 mb-4">
                  {modalMode === 'deactivate'
                    ? `Are you sure you want to deactivate "${modalProduct.sku}"?`
                    : `Are you sure you want to reactivate "${modalProduct.sku}"?`}
                </p>
              ) : (
                <p className="text-slate-300 mb-4">
                  {modalMode === 'deactivate'
                    ? `You are about to deactivate ${getSelectedActiveCount()} product(s).`
                    : `You are about to reactivate ${getSelectedInactiveCount()} product(s).`}
                </p>
              )}

              {modalMode === 'deactivate' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Reason for Deactivation
                  </label>
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value as InactiveReason)}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                  >
                    {Object.entries(INACTIVE_REASON_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setModalOpen(false)}
                  disabled={processingAction}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  disabled={processingAction}
                  className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                    modalMode === 'deactivate'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {processingAction ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      Processing...
                    </span>
                  ) : modalMode === 'deactivate' ? (
                    'Deactivate'
                  ) : (
                    'Reactivate'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
