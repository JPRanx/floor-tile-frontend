import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { orderBuilderApi } from '../requests/orderBuilder';
import type {
  OrderBuilderResponse,
  OrderBuilderProduct,
  OrderBuilderMode,
  OrderBuilderSummary as SummaryType,
  OrderBuilderAlert,
} from '../requests/orderBuilder';
import { boatsApi } from '../requests/boats';
import { factoryOrdersApi } from '../requests/factoryOrders';
import type { BoatSchedule } from '../requests/boats';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { OrderBuilderHeader } from '../components/OrderBuilderHeader';
import { OrderBuilderProductCard } from '../components/OrderBuilderProductCard';
import { OrderBuilderSummary } from '../components/OrderBuilderSummary';
import { OrderBuilderAlerts } from '../components/OrderBuilderAlerts';

const M2_PER_PALLET = 135;
const PALLETS_PER_CONTAINER = 14;
const WAREHOUSE_CAPACITY = 740;

export function OrderBuilder() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<OrderBuilderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<OrderBuilderMode>('standard');

  // Available boats for selector
  const [availableBoats, setAvailableBoats] = useState<BoatSchedule[]>([]);
  const [selectedBoatId, setSelectedBoatId] = useState<string | undefined>(undefined);

  // Local state for products (allows editing without refetching)
  const [products, setProducts] = useState<OrderBuilderProduct[]>([]);

  // Expanded state for sections
  const [expandedSections, setExpandedSections] = useState({
    high_priority: true,
    consider: true,
    well_covered: false,
    your_call: false,
  });

  // Track if boats have been loaded
  const [boatsLoaded, setBoatsLoaded] = useState(false);

  // Fetch available boats on mount
  useEffect(() => {
    const fetchBoats = async () => {
      try {
        const response = await boatsApi.getAvailable();
        // Backend returns array directly, boats.ts wraps so response IS the array
        const boats = Array.isArray(response) ? response : (response.data || []);
        setAvailableBoats(boats);
        // Default to first boat if none selected
        if (boats.length > 0 && !selectedBoatId) {
          setSelectedBoatId(boats[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch boats:', err);
        setAvailableBoats([]);
      } finally {
        setBoatsLoaded(true);
        setLoading(false);
      }
    };
    fetchBoats();
  }, []);

  const loadData = useCallback(async (selectedMode: OrderBuilderMode, boatId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await orderBuilderApi.get({ mode: selectedMode, boat_id: boatId });
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
      setError('Failed to load order builder data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load data even without a boat - backend will use defaults
    if (boatsLoaded) {
      loadData(mode, selectedBoatId);
    }
  }, [mode, selectedBoatId, loadData, boatsLoaded]);

  const handleBoatChange = (boatId: string) => {
    setSelectedBoatId(boatId);
  };

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
    loadData(mode, selectedBoatId);
  };

  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const handleExport = async () => {
    const selected = products.filter((p) => p.is_selected && p.selected_pallets > 0);
    if (selected.length === 0) {
      alert(t('orderBuilder.noProductsSelected'));
      return;
    }

    // Use boat departure date or default to current date + 45 days
    const defaultDeparture = new Date();
    defaultDeparture.setDate(defaultDeparture.getDate() + 45);
    const departureDateStr = data?.boat.departure_date || defaultDeparture.toISOString().split('T')[0];

    setExporting(true);
    setExportSuccess(null);

    try {
      // 1. Create FactoryOrder FIRST (PV number auto-generated by backend)
      const factoryOrder = await factoryOrdersApi.create({
        order_date: new Date().toISOString().split('T')[0],
        notes: selectedBoatId
          ? `Order Builder export for boat departing ${departureDateStr}`
          : 'Order Builder export (no boat selected, using 45-day lead time)',
        items: selected.map((p) => ({
          product_id: p.product_id,
          quantity_ordered: p.selected_pallets * M2_PER_PALLET, // Convert pallets to m²
        })),
      });

      const pvNumber = factoryOrder.pv_number || 'Unknown';

      // 2. Export Excel (existing functionality)
      const blob = await orderBuilderApi.exportOrder({
        products: selected.map((p) => ({
          sku: p.sku,
          pallets: p.selected_pallets,
        })),
        boat_departure: departureDateStr,
      });

      // 3. Create download link with PV number in filename
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PEDIDO_${pvNumber}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      // 4. Show success message
      setExportSuccess(t('orderBuilder.exportSuccess', { pvNumber }));

      // Clear success message after 5 seconds
      setTimeout(() => setExportSuccess(null), 5000);

    } catch (err) {
      console.error('Export failed:', err);
      alert(t('orderBuilder.exportError'));
    } finally {
      setExporting(false);
    }
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
          {t('common.tryAgain')}
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
    titleKey: string;
    subtitleKey: string;
    bgColor: string;
  }[] = [
    {
      key: 'high_priority',
      titleKey: 'orderBuilder.highPriority',
      subtitleKey: 'orderBuilder.highPriorityDesc',
      bgColor: 'bg-red-50 border-red-200',
    },
    {
      key: 'consider',
      titleKey: 'orderBuilder.consider',
      subtitleKey: 'orderBuilder.considerDesc',
      bgColor: 'bg-orange-50 border-orange-200',
    },
    {
      key: 'well_covered',
      titleKey: 'orderBuilder.wellCovered',
      subtitleKey: 'orderBuilder.wellCoveredDesc',
      bgColor: 'bg-green-50 border-green-200',
    },
    {
      key: 'your_call',
      titleKey: 'orderBuilder.yourCall',
      subtitleKey: 'orderBuilder.yourCallDesc',
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
        availableBoats={availableBoats}
        selectedBoatId={selectedBoatId}
        onBoatChange={handleBoatChange}
      />

      {/* Main content: Products and Summary side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Products Column (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-4">
          {sectionConfig.map(({ key, titleKey, subtitleKey, bgColor }) => {
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
                      {t(titleKey)} ({sectionProducts.length})
                      {selectedCount > 0 && (
                        <span className="ml-2 text-sm font-normal text-blue-600">
                          {selectedCount} {t('common.selected')}
                        </span>
                      )}
                    </h2>
                    <p className="text-sm text-gray-600">{t(subtitleKey)}</p>
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
                        key={`${key}-${product.product_id}`}
                        product={product}
                        onToggleSelect={handleToggleSelect}
                        onQuantityChange={handleQuantityChange}
                      />
                    ))}
                  </div>
                )}

                {isExpanded && sectionProducts.length === 0 && (
                  <div className="px-4 pb-4 text-sm text-gray-500">
                    {t('common.noProductsCategory')}
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
              {t('orderBuilder.resetToSuggested')}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? t('orderBuilder.exporting') : t('orderBuilder.exportOrder')}
            </button>
          </div>

          {/* Success Message */}
          {exportSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 text-sm font-medium">{exportSuccess}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
