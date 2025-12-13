import { useEffect, useState, useCallback } from 'react';
import { orderBuilderApi } from '../requests/orderBuilder';
import type {
  OrderBuilderResponse,
  OrderBuilderProduct,
  OrderBuilderMode,
  OrderBuilderSummary as SummaryType,
  OrderBuilderAlert,
} from '../requests/orderBuilder';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { OrderBuilderHeader } from '../components/OrderBuilderHeader';
import { OrderBuilderProductCard } from '../components/OrderBuilderProductCard';
import { OrderBuilderSummary } from '../components/OrderBuilderSummary';
import { OrderBuilderAlerts } from '../components/OrderBuilderAlerts';

const M2_PER_PALLET = 135;
const PALLETS_PER_CONTAINER = 14;
const WAREHOUSE_CAPACITY = 740;

export function OrderBuilder() {
  const [data, setData] = useState<OrderBuilderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<OrderBuilderMode>('standard');

  // Local state for products (allows editing without refetching)
  const [products, setProducts] = useState<OrderBuilderProduct[]>([]);

  // Expanded state for sections
  const [expandedSections, setExpandedSections] = useState({
    high_priority: true,
    consider: true,
    well_covered: false,
    your_call: false,
  });

  const loadData = useCallback(async (selectedMode: OrderBuilderMode) => {
    try {
      setLoading(true);
      setError(null);
      const result = await orderBuilderApi.get({ mode: selectedMode });
      setData(result);
      // Flatten all products into a single array for local state
      const allProducts = [
        ...result.high_priority,
        ...result.consider,
        ...result.well_covered,
        ...result.your_call,
      ];
      setProducts(allProducts);
    } catch (err) {
      setError('Failed to load Order Builder. Is the backend running?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(mode);
  }, [mode, loadData]);

  const handleModeChange = (newMode: OrderBuilderMode) => {
    setMode(newMode);
  };

  const handleToggleSelect = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.product_id === productId) {
          const newSelected = !p.is_selected;
          return {
            ...p,
            is_selected: newSelected,
            selected_pallets: newSelected ? p.coverage_gap_pallets : 0,
          };
        }
        return p;
      })
    );
  };

  const handleQuantityChange = (productId: string, pallets: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.product_id === productId) {
          return {
            ...p,
            selected_pallets: pallets,
            is_selected: pallets > 0,
          };
        }
        return p;
      })
    );
  };

  const handleReset = () => {
    loadData(mode);
  };

  const handleExport = () => {
    const selected = products.filter((p) => p.is_selected && p.selected_pallets > 0);
    if (selected.length === 0) {
      alert('No products selected to export');
      return;
    }

    // Generate CSV content
    const headers = ['SKU', 'Pallets', 'm²', 'Priority', 'Confidence'];
    const rows = selected.map((p) => [
      p.sku,
      p.selected_pallets.toString(),
      (p.selected_pallets * M2_PER_PALLET).toString(),
      p.priority,
      p.confidence,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
      '',
      `Total Pallets,${summary.total_pallets}`,
      `Total m²,${summary.total_m2}`,
      `Containers,${summary.total_containers}`,
    ].join('\n');

    // Copy to clipboard
    navigator.clipboard.writeText(csvContent).then(
      () => alert('Order copied to clipboard!'),
      () => {
        // Fallback: download as file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `order-${data?.boat.departure_date || 'export'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    );
  };

  // Recalculate summary from local products state
  const summary: SummaryType = (() => {
    const selected = products.filter((p) => p.is_selected);
    const totalPallets = selected.reduce((sum, p) => sum + p.selected_pallets, 0);
    const totalM2 = totalPallets * M2_PER_PALLET;
    const totalContainers = Math.ceil(totalPallets / PALLETS_PER_CONTAINER);
    const warehouseCurrent = data?.summary.warehouse_current_pallets || 0;
    const warehouseAfter = warehouseCurrent + totalPallets;
    const boatMaxContainers = data?.boat.max_containers || 5;

    return {
      total_pallets: totalPallets,
      total_containers: totalContainers,
      total_m2: totalM2,
      boat_max_containers: boatMaxContainers,
      boat_remaining_containers: Math.max(0, boatMaxContainers - totalContainers),
      warehouse_current_pallets: warehouseCurrent,
      warehouse_capacity: WAREHOUSE_CAPACITY,
      warehouse_after_delivery: warehouseAfter,
      warehouse_utilization_after: (warehouseAfter / WAREHOUSE_CAPACITY) * 100,
      alerts: [],
    };
  })();

  // Recalculate alerts based on current selection
  const alerts: OrderBuilderAlert[] = (() => {
    const alertList: OrderBuilderAlert[] = [];

    // Warehouse exceeded
    if (summary.warehouse_after_delivery > WAREHOUSE_CAPACITY) {
      const over = summary.warehouse_after_delivery - WAREHOUSE_CAPACITY;
      alertList.push({
        type: 'blocked',
        icon: '🚫',
        product_sku: null,
        message: `Exceeds warehouse by ${over} pallets. Remove some items.`,
      });
    } else if (summary.warehouse_utilization_after > 95) {
      alertList.push({
        type: 'warning',
        icon: '⚠️',
        product_sku: null,
        message: `Warehouse will be at ${Math.round(summary.warehouse_utilization_after)}% after delivery`,
      });
    }

    // Boat exceeded
    if (summary.total_containers > summary.boat_max_containers) {
      alertList.push({
        type: 'blocked',
        icon: '🚫',
        product_sku: null,
        message: `Exceeds boat capacity (${summary.total_containers}/${summary.boat_max_containers} containers)`,
      });
    }

    // Room for more
    if (
      summary.boat_remaining_containers > 0 &&
      summary.warehouse_utilization_after < 90
    ) {
      alertList.push({
        type: 'suggestion',
        icon: '💡',
        product_sku: null,
        message: `Room for ${summary.boat_remaining_containers} more container(s)`,
      });
    }

    // HIGH_PRIORITY not selected
    const highPriority = products.filter((p) => p.priority === 'HIGH_PRIORITY');
    for (const p of highPriority) {
      if (!p.is_selected) {
        alertList.push({
          type: 'warning',
          icon: '⚠️',
          product_sku: p.sku,
          message: `HIGH_PRIORITY but not selected — stockout risk`,
        });
      }
    }

    // LOW confidence selected
    const selected = products.filter((p) => p.is_selected);
    for (const p of selected) {
      if (p.confidence === 'LOW') {
        alertList.push({
          type: 'warning',
          icon: '⚠️',
          product_sku: p.sku,
          message: p.confidence_reason,
        });
      }
    }

    // Booking deadline
    if (data?.boat.days_until_deadline != null && data.boat.days_until_deadline <= 3) {
      alertList.unshift({
        type: 'warning',
        icon: '⏰',
        product_sku: null,
        message: `Booking deadline in ${data.boat.days_until_deadline} days!`,
      });
    }

    return alertList;
  })();

  // Group products by priority for display
  const productsByPriority = {
    high_priority: products.filter((p) => p.priority === 'HIGH_PRIORITY'),
    consider: products.filter((p) => p.priority === 'CONSIDER'),
    well_covered: products.filter((p) => p.priority === 'WELL_COVERED'),
    your_call: products.filter((p) => p.priority === 'YOUR_CALL'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={() => loadData(mode)}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const sectionConfig: {
    key: keyof typeof productsByPriority;
    title: string;
    subtitle: string;
    bgColor: string;
  }[] = [
    {
      key: 'high_priority',
      title: 'HIGH PRIORITY',
      subtitle: 'must order — stockout before next boat',
      bgColor: 'bg-red-50 border-red-200',
    },
    {
      key: 'consider',
      title: 'CONSIDER',
      subtitle: 'worth adding — stockout before second boat',
      bgColor: 'bg-orange-50 border-orange-200',
    },
    {
      key: 'well_covered',
      title: 'WELL COVERED',
      subtitle: 'skip this cycle — sufficient stock',
      bgColor: 'bg-green-50 border-green-200',
    },
    {
      key: 'your_call',
      title: 'YOUR CALL',
      subtitle: 'needs review — limited data',
      bgColor: 'bg-gray-50 border-gray-200',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with boat info and mode selector */}
      <OrderBuilderHeader
        boat={data.boat}
        nextBoat={data.next_boat}
        mode={mode}
        onModeChange={handleModeChange}
      />

      {/* Main content: Products and Summary side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Products Column (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-4">
          {sectionConfig.map(({ key, title, subtitle, bgColor }) => {
            const sectionProducts = productsByPriority[key];
            const selectedCount = sectionProducts.filter((p) => p.is_selected).length;
            const isExpanded = expandedSections[key];

            return (
              <div key={key} className={`rounded-lg border ${bgColor}`}>
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(key)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {title} ({sectionProducts.length})
                      {selectedCount > 0 && (
                        <span className="ml-2 text-sm font-normal text-blue-600">
                          {selectedCount} selected
                        </span>
                      )}
                    </h2>
                    <p className="text-sm text-gray-600">{subtitle}</p>
                  </div>
                  <span className="text-gray-400 text-lg">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </button>

                {/* Section Content */}
                {isExpanded && sectionProducts.length > 0 && (
                  <div className="px-4 pb-4 space-y-2">
                    {sectionProducts.map((product) => (
                      <OrderBuilderProductCard
                        key={product.product_id}
                        product={product}
                        onToggleSelect={handleToggleSelect}
                        onQuantityChange={handleQuantityChange}
                      />
                    ))}
                  </div>
                )}

                {isExpanded && sectionProducts.length === 0 && (
                  <div className="px-4 pb-4 text-sm text-gray-500">
                    No products in this category
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Column (1/3 width on desktop) */}
        <div className="space-y-4">
          <OrderBuilderSummary summary={summary} />
          <OrderBuilderAlerts alerts={alerts} />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset to Suggested
            </button>
            <button
              onClick={handleExport}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
