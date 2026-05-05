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
  OTHER: 'Otros',
  FURNITURE: 'Muebles',
  SINK: 'Lavamanos',
  SURCHARGE: 'Recargos',
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

  // Filter and sort products: by tier (A first), then SKU
  const tierOrder: Record<string, number> = { A: 0, B: 1, C: 2 };
  const filteredProducts = products
    .filter((p) => p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (tierOrder[a.tier ?? ''] ?? 3) - (tierOrder[b.tier ?? ''] ?? 3) || a.sku.localeCompare(b.sku));

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-base)' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-lg font-medium tracking-[0.15em] uppercase"
            style={{ color: 'var(--color-text-primary)' }}
          >
            productos
          </h1>
          <p className="text-xs mt-1 tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
            {total} productos · {products.filter((p) => p.active).length} activos · {products.filter((p) => !p.active).length} inactivos
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="mb-4 p-4"
            style={{
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--color-error)',
            }}
          >
            {error}
          </div>
        )}

        {/* Controls Bar */}
        <div
          className="p-4 mb-6"
          style={{
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-subtle)',
            backgroundColor: 'var(--color-bg-surface)',
          }}
        >
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-md">
              <input
                type="text"
                placeholder="Buscar por SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm focus:outline-none"
                style={{
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => {
                    setShowInactive(e.target.checked);
                    setPage(1);
                  }}
                  className="w-4 h-4"
                />
                Mostrar Inactivos
              </label>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                  {selectedIds.size} seleccionados
                </span>
                {getSelectedActiveCount() > 0 && (
                  <button
                    onClick={handleBulkDeactivate}
                    className="px-3 py-1.5 text-xs uppercase tracking-widest transition-colors"
                    style={{
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(251, 191, 36, 0.15)',
                      color: '#fbbf24',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                    }}
                  >
                    Desactivar ({getSelectedActiveCount()})
                  </button>
                )}
                {getSelectedInactiveCount() > 0 && (
                  <button
                    onClick={handleBulkReactivate}
                    className="px-3 py-1.5 text-xs uppercase tracking-widest transition-colors"
                    style={{
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(74, 222, 128, 0.15)',
                      color: '#4ade80',
                      border: '1px solid rgba(74, 222, 128, 0.3)',
                    }}
                  >
                    Reactivar ({getSelectedInactiveCount()})
                  </button>
                )}
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 text-xs uppercase tracking-widest"
                  style={{
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Limpiar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div
          className="overflow-hidden"
          style={{
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-subtle)',
            backgroundColor: 'var(--color-bg-surface)',
          }}
        >
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
              <tr>
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                    onChange={() =>
                      selectedIds.size === filteredProducts.length ? clearSelection() : selectAll()
                    }
                    className="w-4 h-4"
                  />
                </th>
                {['SKU', 'Categoría', 'Rotación', 'Tier', 'Estado', 'Razón', 'Fecha', 'Acciones'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[10px] font-medium uppercase tracking-widest ${
                      h === 'Tier' || h === 'Estado' ? 'text-center' :
                      h === 'Acciones' ? 'text-right' : 'text-left'
                    }`}
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className={!product.active ? 'opacity-60' : ''}
                  style={{ borderTop: '1px solid var(--color-border-subtle)' }}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelection(product.id)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium" style={{ color: 'var(--color-text-primary)' }} translate="no">
                      {product.sku}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                    {CATEGORY_LABELS[product.category] || product.category}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                    {product.rotation || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {product.tier ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                        style={{
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor:
                            product.tier === 'A' ? 'rgba(251, 191, 36, 0.12)' :
                            product.tier === 'B' ? 'rgba(96, 165, 250, 0.12)' :
                            'var(--color-bg-elevated)',
                          color:
                            product.tier === 'A' ? '#fbbf24' :
                            product.tier === 'B' ? '#60a5fa' :
                            'var(--color-text-muted)',
                        }}
                      >
                        {product.tier}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-widest"
                      style={{
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: product.active ? 'rgba(74, 222, 128, 0.12)' : 'rgba(248, 113, 113, 0.12)',
                        color: product.active ? '#4ade80' : '#f87171',
                      }}
                    >
                      {product.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>
                    {product.inactive_reason ? INACTIVE_REASON_LABELS[product.inactive_reason] : '-'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>
                    {product.inactive_date || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {product.active ? (
                      <button
                        onClick={() => handleDeactivate(product)}
                        className="px-3 py-1 text-[11px] uppercase tracking-widest transition-colors"
                        style={{
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(251, 191, 36, 0.1)',
                          color: '#fbbf24',
                          border: '1px solid rgba(251, 191, 36, 0.3)',
                        }}
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(product)}
                        className="px-3 py-1 text-[11px] uppercase tracking-widest transition-colors"
                        style={{
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(74, 222, 128, 0.1)',
                          color: '#4ade80',
                          border: '1px solid rgba(74, 222, 128, 0.3)',
                        }}
                      >
                        Reactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No se encontraron productos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-between items-center">
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-[11px] uppercase tracking-widest transition-colors disabled:opacity-40"
                style={{
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-[11px] uppercase tracking-widest transition-colors disabled:opacity-40"
                style={{
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Siguiente
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
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
            <div
              className="p-6 w-full max-w-md mx-4"
              style={{
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <h2 className="text-xs tracking-widest uppercase font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                {modalMode === 'deactivate' ? 'Desactivar Producto(s)' : 'Reactivar Producto(s)'}
              </h2>

              {modalProduct ? (
                <p className="mb-4 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {modalMode === 'deactivate'
                    ? <>¿Desactivar <span translate="no">"{modalProduct.sku}"</span>?</>
                    : <>¿Reactivar <span translate="no">"{modalProduct.sku}"</span>?</>}
                </p>
              ) : (
                <p className="mb-4 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {modalMode === 'deactivate'
                    ? `Vas a desactivar ${getSelectedActiveCount()} producto(s).`
                    : `Vas a reactivar ${getSelectedInactiveCount()} producto(s).`}
                </p>
              )}

              {modalMode === 'deactivate' && (
                <div className="mb-6">
                  <label className="block text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Razón de Desactivación
                  </label>
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value as InactiveReason)}
                    className="w-full px-3 py-2 text-sm focus:outline-none"
                    style={{
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
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
                  className="px-4 py-2 text-[11px] uppercase tracking-widest transition-colors disabled:opacity-50"
                  style={{
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-bg-elevated)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmAction}
                  disabled={processingAction}
                  className="px-4 py-2 text-[11px] uppercase tracking-widest transition-colors disabled:opacity-50"
                  style={{
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: modalMode === 'deactivate' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(74, 222, 128, 0.15)',
                    color: modalMode === 'deactivate' ? '#fbbf24' : '#4ade80',
                    border: modalMode === 'deactivate' ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(74, 222, 128, 0.3)',
                  }}
                >
                  {processingAction ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      Procesando...
                    </span>
                  ) : modalMode === 'deactivate' ? (
                    'Desactivar'
                  ) : (
                    'Reactivar'
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
