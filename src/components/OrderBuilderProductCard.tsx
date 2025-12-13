import type { OrderBuilderProduct, ConfidenceLevel } from '../requests/orderBuilder';

interface OrderBuilderProductCardProps {
  product: OrderBuilderProduct;
  onToggleSelect: (productId: string) => void;
  onQuantityChange: (productId: string, pallets: number) => void;
}

export function OrderBuilderProductCard({
  product,
  onToggleSelect,
  onQuantityChange,
}: OrderBuilderProductCardProps) {
  // Generate pallet options (0-50 in increments of 1)
  const palletOptions = Array.from({ length: 51 }, (_, i) => i);

  const confidenceStyles: Record<ConfidenceLevel, string> = {
    HIGH: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-gray-100 text-gray-600',
  };

  const confidenceIcons: Record<ConfidenceLevel, string> = {
    HIGH: '✓',
    MEDIUM: '⚠️',
    LOW: '?',
  };

  return (
    <div
      className={`rounded-lg border p-3 sm:p-4 transition-colors ${
        product.is_selected
          ? 'bg-blue-50 border-blue-300'
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={product.is_selected}
          onChange={() => onToggleSelect(product.product_id)}
          className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {/* SKU and Quantity */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 truncate">
                {product.sku}
              </span>
              {/* Quantity Selector */}
              <select
                value={product.selected_pallets}
                onChange={(e) =>
                  onQuantityChange(product.product_id, parseInt(e.target.value))
                }
                disabled={!product.is_selected}
                className={`px-2 py-1 border rounded text-sm font-medium ${
                  product.is_selected
                    ? 'border-blue-300 bg-white text-gray-900'
                    : 'border-gray-200 bg-gray-50 text-gray-400'
                }`}
              >
                {palletOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500">pallets</span>
            </div>

            {/* Confidence Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                confidenceStyles[product.confidence]
              }`}
            >
              <span>{confidenceIcons[product.confidence]}</span>
              {product.confidence}
            </span>
          </div>

          {/* Details Row */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
            <span>
              Gap: <strong>{Math.round(product.coverage_gap_m2).toLocaleString()} m²</strong>
              {' '}({product.coverage_gap_pallets}p)
            </span>
            {product.unique_customers > 0 && (
              <span>
                {product.unique_customers} customers
              </span>
            )}
            {product.top_customer_share != null && product.top_customer_share > 0.3 && (
              <span className="text-orange-600">
                {Math.round(product.top_customer_share * 100)}% from {product.top_customer_name || 'top customer'}
              </span>
            )}
          </div>

          {/* Confidence Reason (if LOW) */}
          {product.confidence === 'LOW' && product.confidence_reason && (
            <div className="mt-1 text-xs text-gray-500">
              {product.confidence_reason}
            </div>
          )}

          {/* Factory Status (MVP placeholder) */}
          {product.factory_status === 'unknown' && product.is_selected && (
            <div className="mt-1 text-xs text-orange-600">
              ⚠️ Verify factory availability
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
