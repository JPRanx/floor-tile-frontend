import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { orderBuilderApi } from '../requests/orderBuilder';
import type {
  OrderBuilderResponse,
  OrderBuilderProduct,
  OrderBuilderSummary as SummaryType,
  OrderBuilderAlert,
  DemandForecastResponse,
  BLAllocationReport,
  GenerateReportRequest,
} from '../requests/orderBuilder';
import { boatsApi } from '../requests/boats';
import { factoryOrdersApi } from '../requests/factoryOrders';
import { warehouseOrdersApi } from '../requests/warehouseOrders';
import type { WarehouseOrderItemCreate, WarehouseOrder } from '../requests/warehouseOrders';
import type { BoatSchedule } from '../requests/boats';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { OrderBuilderHeader } from '../components/OrderBuilderHeader';
import { OrderBuilderStrategy } from '../components/OrderBuilderStrategy';
import { OrderBuilderProductCard } from '../components/OrderBuilderProductCard';
import { OrderBuilderSummary } from '../components/OrderBuilderSummary';
import { ShippingEstimate } from '../components/ShippingEstimate';
import { OrderBuilderAlerts } from '../components/OrderBuilderAlerts';
import { UnableToShipAlert } from '../components/UnableToShipAlert';
import { ExpectedDemandSection } from '../components/ExpectedDemandSection';
import { CustomersDueList } from '../components/CustomersDueList';
import { CallBeforeOrderingAlert } from '../components/CallBeforeOrderingAlert';
import { BLAllocationView } from '../components/BLAllocationView';
import { WarehouseOrderSection } from '../components/WarehouseOrderSection';
import { AddToProductionSection } from '../components/AddToProductionSection';
import { FactoryRequestSection } from '../components/FactoryRequestSection';
import { LiquidationClearanceSection } from '../components/order-builder/LiquidationClearanceSection';
import { RecalculateBar } from '../components/RecalculateBar';
import { StabilityForecastCard } from '../components/StabilityForecastCard';
import { StabilityForecastModal } from '../components/StabilityForecastModal';
import { PendingOrdersCard } from '../components/PendingOrdersCard';
import {
  M2_PER_PALLET,
  CONTAINER_MAX_PALLETS,
  CONTAINER_MAX_WEIGHT_KG,
  WAREHOUSE_MAX_PALLETS,
  WEIGHT_PER_M2_KG,
} from '../constants/inventory';

// Extended product type with selected_m2 for two-way input sync
interface OrderBuilderProductWithM2 extends OrderBuilderProduct {
  selected_m2: number;
}

export function OrderBuilder() {
  const { t } = useTranslation();
  const [data, setData] = useState<OrderBuilderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Available boats for selector
  const [availableBoats, setAvailableBoats] = useState<BoatSchedule[]>([]);
  const [selectedBoatId, setSelectedBoatId] = useState<string | undefined>(undefined);

  // Local state for products (allows editing without refetching)
  // Uses extended type with selected_m2 for two-way pallet/m² sync
  const [products, setProducts] = useState<OrderBuilderProductWithM2[]>([]);

  // Expanded state for sections
  const [expandedSections, setExpandedSections] = useState({
    high_priority: true,
    consider: true,
    well_covered: false,
    your_call: false,
  });

  // Track if boats have been loaded
  const [boatsLoaded, setBoatsLoaded] = useState(false);

  // Demand forecast state
  const [demandForecast, setDemandForecast] = useState<DemandForecastResponse | null>(null);
  const [demandLoading, setDemandLoading] = useState(false);

  // BL Allocation state
  const [numBLs, setNumBLs] = useState(3);
  const [blAllocationReport, setBLAllocationReport] = useState<BLAllocationReport | null>(null);
  const [showBLView, setShowBLView] = useState(false);
  const [blLoading, setBLLoading] = useState(false);
  const [blExporting, setBLExporting] = useState(false);

  // View mode: 'priority' (original) vs 'sections' (three-section view)
  const [viewMode, setViewMode] = useState<'priority' | 'sections'>('sections');

  // Removed products tracking (for recalculate feature)
  const [removedSkus, setRemovedSkus] = useState<Set<string>>(new Set());
  const [recalculating, setRecalculating] = useState(false);

  // Track if initial load has happened (for auto-selecting recommended BLs)
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Pending warehouse orders state
  const [pendingOrders, setPendingOrders] = useState<WarehouseOrder[]>([]);

  // Fetch pending orders
  const fetchPendingOrders = useCallback(async () => {
    try {
      const response = await warehouseOrdersApi.list(1, 100, 'pending');
      setPendingOrders(response.data || []);
    } catch (error) {
      console.error('Failed to fetch pending orders:', error);
    }
  }, []);

  // Fetch pending orders on mount
  useEffect(() => {
    fetchPendingOrders();
  }, [fetchPendingOrders]);

  // Handle cancel pending order
  const handleCancelPendingOrder = async (orderId: string) => {
    try {
      await warehouseOrdersApi.cancel(orderId);
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (error) {
      console.error('Failed to cancel order:', error);
      alert(t('pendingOrders.cancelError', 'Failed to cancel order'));
    }
  };

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

  const loadData = useCallback(async (blCount: number, boatId?: string, isInitialLoad?: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const result = await orderBuilderApi.get({ num_bls: blCount, boat_id: boatId });
      setData(result);
      // Flatten all products into a single array for local state
      // Initialize selected_m2 from selected_pallets for two-way sync
      const allProducts: OrderBuilderProductWithM2[] = [
        ...result.high_priority,
        ...result.consider,
        ...result.well_covered,
        ...result.your_call,
      ].map((p) => ({
        ...p,
        selected_m2: p.selected_pallets * M2_PER_PALLET,
      }));
      setProducts(allProducts);

      // Auto-select recommended BLs on initial load
      if (isInitialLoad && result.recommended_bls && result.recommended_bls !== blCount) {
        setNumBLs(result.recommended_bls);
        setHasInitiallyLoaded(true);
        // Reload will happen automatically via useEffect
      } else if (isInitialLoad) {
        setHasInitiallyLoaded(true);
      }
    } catch (err) {
      setError('Failed to load order builder data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load demand forecast
  const loadDemandForecast = useCallback(async (boatId?: string) => {
    try {
      setDemandLoading(true);
      const forecast = await orderBuilderApi.getDemandForecast(boatId);
      setDemandForecast(forecast);
    } catch (err) {
      console.error('Failed to load demand forecast:', err);
      // Don't set error - this is optional data
    } finally {
      setDemandLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load data even without a boat - backend will use defaults
    if (boatsLoaded) {
      // Pass isInitialLoad=true only on the first load (before hasInitiallyLoaded is set)
      loadData(numBLs, selectedBoatId, !hasInitiallyLoaded);
      loadDemandForecast(selectedBoatId);
    }
  }, [numBLs, selectedBoatId, loadData, loadDemandForecast, boatsLoaded, hasInitiallyLoaded]);

  const handleBoatChange = (boatId: string) => {
    setSelectedBoatId(boatId);
  };

  const handleToggleSelect = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.product_id === productId) {
          const newSelected = !p.is_selected;
          const newPallets = newSelected ? p.coverage_gap_pallets : 0;
          return {
            ...p,
            is_selected: newSelected,
            selected_pallets: newPallets,
            selected_m2: newPallets * M2_PER_PALLET,
          };
        }
        return p;
      })
    );
  };

  // Handle pallet input change: pallets → m² = pallets × 134.4
  const handleQuantityChange = (productId: string, pallets: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.product_id === productId) {
          return {
            ...p,
            selected_pallets: pallets,
            selected_m2: pallets * M2_PER_PALLET,
            is_selected: pallets > 0,
          };
        }
        return p;
      })
    );
  };

  // Handle m² input change: pallets = FLOOR(m² / 134.4), preserve exact m²
  const handleM2Change = (productId: string, m2: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.product_id === productId) {
          const pallets = Math.floor(m2 / M2_PER_PALLET);
          return {
            ...p,
            selected_pallets: pallets,
            selected_m2: m2, // Preserve exact m² value entered by user
            is_selected: m2 > 0,
          };
        }
        return p;
      })
    );
  };

  const handleReset = () => {
    loadData(numBLs, selectedBoatId);
    // Reset BL allocation view when products are reset
    setBLAllocationReport(null);
    setShowBLView(false);
    // Clear removed products on reset
    setRemovedSkus(new Set());
  };

  // Remove product from order (for recalculate)
  const handleRemoveProduct = (sku: string) => {
    setRemovedSkus((prev) => new Set([...prev, sku]));
    // Also deselect the product locally
    setProducts((prev) =>
      prev.map((p) =>
        p.sku === sku
          ? { ...p, is_selected: false, selected_pallets: 0, selected_m2: 0 }
          : p
      )
    );
  };

  // Restore a removed product
  const handleRestoreProduct = (sku: string) => {
    setRemovedSkus((prev) => {
      const next = new Set(prev);
      next.delete(sku);
      return next;
    });
  };

  // Recalculate order with excluded products
  const handleRecalculate = async () => {
    if (removedSkus.size === 0) return;

    setRecalculating(true);
    try {
      const result = await orderBuilderApi.recalculate({
        boat_id: selectedBoatId,
        num_bls: numBLs,
        excluded_skus: Array.from(removedSkus),
      });
      setData(result);
      // Reset local state with new products
      const allProducts: OrderBuilderProductWithM2[] = [
        ...result.high_priority,
        ...result.consider,
        ...result.well_covered,
        ...result.your_call,
      ].map((p) => ({
        ...p,
        selected_m2: p.selected_pallets * M2_PER_PALLET,
      }));
      setProducts(allProducts);
      // Clear removed products after successful recalculate
      setRemovedSkus(new Set());
      // Reset BL allocation
      setBLAllocationReport(null);
      setShowBLView(false);
    } catch (err) {
      console.error('Recalculate failed:', err);
      alert(t('orderBuilder.recalculateError', 'Failed to recalculate order'));
    } finally {
      setRecalculating(false);
    }
  };

  // Calculate freed capacity from removed products
  const freedCapacity = (() => {
    if (removedSkus.size === 0) return { m2: 0, pallets: 0, containers: 0 };

    // Find removed products in original data
    const removedProducts = products.filter((p) => removedSkus.has(p.sku));
    const freedPallets = removedProducts.reduce((sum, p) => sum + (p.coverage_gap_pallets || 0), 0);
    const freedM2 = freedPallets * M2_PER_PALLET;
    const freedContainers = Math.ceil(freedPallets / CONTAINER_MAX_PALLETS);

    return { m2: freedM2, pallets: freedPallets, containers: freedContainers };
  })();

  // BL count change handler - triggers reload via useEffect
  const handleNumBLsChange = (newNumBLs: number) => {
    setNumBLs(newNumBLs);
    // Invalidate existing allocation when BL count changes
    setBLAllocationReport(null);
    setShowBLView(false);  // Return to product view when capacity changes
  };

  const handleAllocateToBLs = async () => {
    const selected = products.filter((p) => p.is_selected && p.selected_pallets > 0);
    if (selected.length === 0) {
      alert(t('orderBuilder.noProductsSelected'));
      return;
    }

    setBLLoading(true);
    try {
      const response = await orderBuilderApi.generateBLAllocation({
        num_bls: numBLs,
        boat_id: selectedBoatId,
        products: selected.map((p) => ({
          sku: p.sku,
          pallets: p.selected_pallets,
        })),
      });

      setBLAllocationReport(response.allocation);
      setShowBLView(true);
    } catch (err) {
      console.error('BL allocation failed:', err);
      alert(t('blAllocation.allocationError', 'Failed to generate BL allocation'));
    } finally {
      setBLLoading(false);
    }
  };

  const handleExportBLs = async () => {
    if (!blAllocationReport) return;

    setBLExporting(true);
    try {
      const blob = await orderBuilderApi.exportBLAllocation({
        num_bls: numBLs,
        boat_id: selectedBoatId,
        products: products
          .filter((p) => p.is_selected && p.selected_pallets > 0)
          .map((p) => ({
            sku: p.sku,
            pallets: p.selected_pallets,
          })),
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = blAllocationReport.boat_departure.replace(/-/g, '');
      a.download = `BL_ALLOCATION_${dateStr}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('BL export failed:', err);
      alert(t('blAllocation.exportError', 'Failed to export BL allocation'));
    } finally {
      setBLExporting(false);
    }
  };

  const handleBackToProducts = () => {
    setShowBLView(false);
  };

  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Stability forecast modal state
  const [showStabilityModal, setShowStabilityModal] = useState(false);

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
    const arrivalDateStr = data?.boat.arrival_date || null;

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
          quantity_ordered: p.selected_m2, // Use actual m² entered by user
        })),
      });

      const pvNumber = factoryOrder.pv_number || 'Unknown';

      // 2. Create WarehouseOrder (tracks SIESA stock committed to this boat)
      // Re-export logic: If a pending order exists for same boat, it gets cancelled automatically
      // BLOCKING: Export fails if warehouse order can't be saved - tracking is the whole point
      if (selectedBoatId) {
        const warehouseItems: WarehouseOrderItemCreate[] = selected.map((p) => ({
          product_id: p.product_id,
          sku: p.sku,
          description: p.description || undefined,
          pallets: p.selected_pallets,
          m2: p.selected_m2,
          weight_kg: p.total_weight_kg,
          score: p.score?.total,
          priority: p.priority,
          is_critical: (p.score?.total || 0) >= 85,
          primary_customer: p.top_customer_name || undefined,
        }));

        await warehouseOrdersApi.create({
          boat_id: selectedBoatId,
          items: warehouseItems,
          exported_by: 'Ashley', // TODO: Get from user context when auth is added
          excel_filename: `PEDIDO_${pvNumber}.xlsx`,
          boat_departure_date: departureDateStr,
          boat_arrival_date: arrivalDateStr || undefined,
          boat_name: data?.boat.name,
          notes: `PV: ${pvNumber}`,
        });
      }

      // 3. Export Excel (existing functionality)
      const blob = await orderBuilderApi.exportOrder({
        products: selected.map((p) => ({
          sku: p.sku,
          pallets: p.selected_pallets,
        })),
        boat_departure: departureDateStr,
      });

      // 4. Create download link with PV number in filename
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PEDIDO_${pvNumber}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      // 5. Show success message
      setExportSuccess(t('orderBuilder.exportSuccess', { pvNumber }));

      // 6. Refresh pending orders list
      fetchPendingOrders();

      // Clear success message after 5 seconds
      setTimeout(() => setExportSuccess(null), 5000);

    } catch (err: unknown) {
      console.error('Export failed:', err);

      // Provide specific error message based on failure type
      const axiosError = err as { config?: { url?: string }; response?: { data?: { error?: { message?: string } } } };
      const failedUrl = axiosError?.config?.url || '';
      const apiMessage = axiosError?.response?.data?.error?.message;

      if (failedUrl.includes('warehouse-orders')) {
        alert(t('orderBuilder.warehouseOrderSaveError', 'Failed to save order. Export cancelled.'));
      } else if (failedUrl.includes('factory-orders')) {
        alert(t('orderBuilder.factoryOrderError', 'Failed to create factory order.'));
      } else if (apiMessage) {
        alert(apiMessage);
      } else {
        alert(t('orderBuilder.exportError'));
      }
    } finally {
      setExporting(false);
    }
  };

  // Generate comprehensive report with reasoning
  const handleGenerateReport = async () => {
    if (!data) return;

    setGeneratingReport(true);
    try {
      // Collect selected items from each section
      const warehouseItems = products
        .filter((p) => p.is_selected && p.selected_pallets > 0 && p.factory_available_m2 > 0)
        .map((p) => ({
          product_id: p.product_id,
          sku: p.sku,
          pallets: p.selected_pallets,
        }));

      // Get selected add to production items
      const addItems = data.add_to_production_summary?.items
        .filter((item) => item.is_selected)
        .map((item) => ({
          product_id: item.product_id,
          sku: item.sku,
          pallets: item.suggested_additional_pallets,
        })) || [];

      // Get selected factory request items
      const factoryItems = data.factory_request_summary?.items
        .filter((item) => item.is_selected)
        .map((item) => ({
          product_id: item.product_id,
          sku: item.sku,
          pallets: item.gap_pallets,
        })) || [];

      const request: GenerateReportRequest = {
        boat_id: selectedBoatId,
        num_bls: numBLs,
        warehouse_items: warehouseItems,
        add_to_production_items: addItems,
        factory_request_items: factoryItems,
      };

      const blob = await orderBuilderApi.generateReport(request);

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = data.boat.departure_date.replace(/-/g, '');
      a.download = `ORDER_REPORT_${dateStr}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Report generation failed:', err);
      alert(t('orderBuilder.reportError', 'Failed to generate report'));
    } finally {
      setGeneratingReport(false);
    }
  };

  // Recalculate summary from local products state
  // Uses selected_m2 (exact user input) for accurate totals
  const summary: SummaryType = (() => {
    const selected = products.filter((p) => p.is_selected);
    const totalPallets = selected.reduce((sum, p) => sum + p.selected_pallets, 0);
    // Use actual m² entered by user, not derived from pallets
    const totalM2 = selected.reduce((sum, p) => sum + p.selected_m2, 0);
    const totalContainers = Math.ceil(totalPallets / CONTAINER_MAX_PALLETS);
    const warehouseCurrent = data?.summary.warehouse_current_pallets || 0;
    const warehouseAfter = warehouseCurrent + totalPallets;
    // Use BL capacity from backend (num_bls × 5 containers), not boat's physical capacity
    const boatMaxContainers = data?.summary.boat_max_containers || 5;

    // Calculate weight from actual m² entered (not from pallets)
    const totalWeightKg = totalM2 * WEIGHT_PER_M2_KG;
    const containersByPallets = totalContainers;
    const containersByWeight = Math.ceil(totalWeightKg / CONTAINER_MAX_WEIGHT_KG);
    const weightIsLimiting = containersByWeight > containersByPallets;

    return {
      total_pallets: totalPallets,
      total_containers: totalContainers,
      total_m2: totalM2,
      total_weight_kg: totalWeightKg,
      containers_by_pallets: containersByPallets,
      containers_by_weight: containersByWeight,
      weight_is_limiting: weightIsLimiting,
      boat_max_containers: boatMaxContainers,
      boat_remaining_containers: Math.max(0, boatMaxContainers - totalContainers),
      warehouse_current_pallets: warehouseCurrent,
      warehouse_capacity: WAREHOUSE_MAX_PALLETS,
      warehouse_after_delivery: warehouseAfter,
      warehouse_utilization_after: (warehouseAfter / WAREHOUSE_MAX_PALLETS) * 100,
      alerts: [],
    };
  })();

  // Recalculate alerts based on current selection
  const alerts: OrderBuilderAlert[] = (() => {
    const alertList: OrderBuilderAlert[] = [];

    // Warehouse exceeded
    if (summary.warehouse_after_delivery > WAREHOUSE_MAX_PALLETS) {
      const over = summary.warehouse_after_delivery - WAREHOUSE_MAX_PALLETS;
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
        <div className="max-w-md mx-auto bg-rose-500/10 border border-rose-500/30 rounded-xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚠️</span>
            <h2 className="text-lg font-semibold text-rose-300">Error</h2>
          </div>
          <p className="text-rose-200/80 mb-4">{error}</p>
          <button
            onClick={() => loadData(numBLs)}
            className="px-4 py-2 bg-rose-500/20 text-rose-300 rounded-lg hover:bg-rose-500/30 transition-colors font-medium"
          >
            {t('common.tryAgain')}
          </button>
        </div>
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
    accentColor: string;
  }[] = [
    {
      key: 'high_priority',
      titleKey: 'orderBuilder.highPriority',
      subtitleKey: 'orderBuilder.highPriorityDesc',
      bgColor: 'bg-red-900/30 border-red-500/50',
      accentColor: 'text-red-400',
    },
    {
      key: 'consider',
      titleKey: 'orderBuilder.consider',
      subtitleKey: 'orderBuilder.considerDesc',
      bgColor: 'bg-orange-900/30 border-orange-500/50',
      accentColor: 'text-orange-400',
    },
    {
      key: 'well_covered',
      titleKey: 'orderBuilder.wellCovered',
      subtitleKey: 'orderBuilder.wellCoveredDesc',
      bgColor: 'bg-green-900/30 border-green-500/50',
      accentColor: 'text-green-400',
    },
    {
      key: 'your_call',
      titleKey: 'orderBuilder.yourCall',
      subtitleKey: 'orderBuilder.yourCallDesc',
      bgColor: 'bg-slate-800/50 border-slate-600/50',
      accentColor: 'text-slate-400',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 -mx-4 sm:-mx-6 lg:-mx-8 -my-6 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with boat info and BL selector */}
        <OrderBuilderHeader
          boat={data.boat}
          nextBoat={data.next_boat}
          availableBoats={availableBoats}
          selectedBoatId={selectedBoatId}
          onBoatChange={handleBoatChange}
          numBLs={numBLs}
          onNumBLsChange={handleNumBLsChange}
          recommendedBLs={data.recommended_bls}
          availableBLs={data.available_bls}
          shippableBLs={data.shippable_bls}
          shippableM2={data.shippable_m2}
        />

        {/* BL Allocation View - shown when allocation is generated */}
        {showBLView && blAllocationReport && (
          <BLAllocationView
            report={blAllocationReport}
            onBack={handleBackToProducts}
            onExport={handleExportBLs}
            isExporting={blExporting}
          />
        )}

        {/* View Mode Toggle */}
        {!showBLView && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
              <button
                onClick={() => setViewMode('sections')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'sections'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('orderBuilder.threeSectionView', 'Three-Section View')}
              </button>
              <button
                onClick={() => setViewMode('priority')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'priority'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('orderBuilder.priorityView', 'Priority View')}
              </button>
            </div>

            {/* Section summary badges */}
            {viewMode === 'sections' && (
              <div className="flex items-center gap-3">
                {data.warehouse_order_summary && data.warehouse_order_summary.product_count > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {t('orderBuilder.warehouseOrder', 'Warehouse')}: {data.warehouse_order_summary.product_count}
                  </span>
                )}
                {data.add_to_production_summary && data.add_to_production_summary.product_count > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {t('orderBuilder.addToProduction', 'Add to Production')}: {data.add_to_production_summary.product_count}
                  </span>
                )}
                {data.factory_request_summary && data.factory_request_summary.product_count > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30">
                    {t('orderBuilder.factoryRequest', 'Factory Request')}: {data.factory_request_summary.product_count}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main content: Products and Summary side by side on desktop */}
        {!showBLView && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Column (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Order Strategy Summary */}
            <OrderBuilderStrategy reasoning={data.summary_reasoning} />

            {/* Expected Demand Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ExpectedDemandSection
                forecast={demandForecast}
                loading={demandLoading}
              />
              <CustomersDueList
                customers={demandForecast?.customers_due_soon || []}
                loading={demandLoading}
              />
            </div>

            {/* Recalculate Bar - Show when products are removed */}
            {removedSkus.size > 0 && (
              <RecalculateBar
                removedProducts={products
                  .filter((p) => removedSkus.has(p.sku))
                  .map((p) => ({
                    sku: p.sku,
                    pallets: p.coverage_gap_pallets || 0,
                    m2: (p.coverage_gap_pallets || 0) * M2_PER_PALLET,
                  }))}
                freedCapacity={freedCapacity}
                onRecalculate={handleRecalculate}
                onRestore={handleRestoreProduct}
                isRecalculating={recalculating}
              />
            )}

            {/* === THREE-SECTION VIEW === */}
            {viewMode === 'sections' && (
              <div className="space-y-6">
                {/* Section 1: Warehouse Order — Ship from SIESA now */}
                <WarehouseOrderSection
                  summary={data.warehouse_order_summary}
                  products={products}
                  onToggleSelect={handleToggleSelect}
                  onQuantityChange={handleQuantityChange}
                  onM2Change={handleM2Change}
                  onAllocateToBLs={handleAllocateToBLs}
                  blLoading={blLoading}
                  onRemove={handleRemoveProduct}
                  removedSkus={removedSkus}
                />

                {/* Section 2: Add to Production — Piggyback on scheduled items */}
                <AddToProductionSection
                  summary={data.add_to_production_summary}
                />

                {/* Section 3: Factory Request — New production requests */}
                <FactoryRequestSection
                  summary={data.factory_request_summary}
                />
              </div>
            )}

            {/* === PRIORITY VIEW (Original) === */}
            {viewMode === 'priority' && sectionConfig.map(({ key, titleKey, subtitleKey, bgColor, accentColor }) => {
              const sectionProducts = productsByPriority[key];
              const selectedCount = sectionProducts.filter((p) => p.is_selected).length;
              const isExpanded = expandedSections[key];

              return (
                <div
                  key={key}
                  className={`rounded-xl border backdrop-blur-xl transition-all duration-300 ${bgColor}`}
                >
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(key)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors rounded-t-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${accentColor.replace('text-', 'bg-')}`} />
                      <div>
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                          {t(titleKey)}
                          <span className="text-slate-500 font-normal">({sectionProducts.length})</span>
                          {selectedCount > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${accentColor} bg-white/10`}>
                              {selectedCount} {t('common.selected')}
                            </span>
                          )}
                        </h2>
                        <p className="text-sm text-slate-400 mt-0.5">{t(subtitleKey)}</p>
                      </div>
                    </div>
                    <span className={`text-slate-400 text-sm transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>

                  {/* Section Content */}
                  {isExpanded && sectionProducts.length > 0 && (
                    <div className="px-5 pb-5 space-y-3 border-t border-slate-700/30">
                      <div className="pt-4 space-y-3">
                        {sectionProducts.map((product) => (
                          <OrderBuilderProductCard
                            key={`${key}-${product.product_id}`}
                            product={product}
                            onToggleSelect={handleToggleSelect}
                            onRemove={handleRemoveProduct}
                            isRemoved={removedSkus.has(product.sku)}
                            onQuantityChange={handleQuantityChange}
                            onM2Change={handleM2Change}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {isExpanded && sectionProducts.length === 0 && (
                    <div className="px-5 pb-5 text-sm text-slate-500 border-t border-slate-700/30 pt-4">
                      {t('common.noProductsCategory')}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Liquidation Clearance — deactivated products with factory stock */}
            {data.liquidation_clearance && data.liquidation_clearance.length > 0 && (
              <LiquidationClearanceSection products={data.liquidation_clearance} />
            )}
          </div>

          {/* Summary Column (1/3 width on desktop) */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            {/* 1. Stability Forecast - TOP */}
            {data.stability_forecast && (
              <StabilityForecastCard
                forecast={data.stability_forecast}
                onViewDetails={() => setShowStabilityModal(true)}
              />
            )}

            {/* 2. Order Summary Card */}
            <OrderBuilderSummary summary={summary} />

            {/* 2b. Shipping Estimate */}
            {data?.shipping_cost_config && (
              <ShippingEstimate
                totalM2={Number(summary.total_m2)}
                costConfig={data.shipping_cost_config}
                numBLs={numBLs}
              />
            )}

            {/* 3. Alerts */}
            <CallBeforeOrderingAlert
              alerts={demandForecast?.overdue_alerts || []}
              loading={demandLoading}
            />
            <OrderBuilderAlerts alerts={alerts} />
            <UnableToShipAlert unableToShip={data?.unable_to_ship || null} />

            {/* 4. Pending Orders - Shows existing orders for visibility */}
            <PendingOrdersCard
              orders={pendingOrders}
              currentBoatId={selectedBoatId}
              onCancel={handleCancelPendingOrder}
              onRefresh={fetchPendingOrders}
            />

            {/* 5. Action Buttons */}
            <div className="flex flex-col gap-3">
              {/* Generate Report Button */}
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-blue-400 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {generatingReport
                  ? t('orderBuilder.generatingReport', 'Generating Report...')
                  : t('orderBuilder.generateReport', 'Generate Report')}
              </button>

              {/* Allocate to BLs Button */}
              <button
                onClick={handleAllocateToBLs}
                disabled={blLoading || products.filter((p) => p.is_selected && p.selected_pallets > 0).length === 0}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-indigo-400 transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {blLoading
                  ? t('blAllocation.allocating', 'Allocating...')
                  : t('blAllocation.allocateToBLs', 'Allocate to BLs')}
              </button>

              {/* Quick Export (single BL) */}
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-emerald-400 transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {exporting ? t('orderBuilder.exporting') : t('orderBuilder.exportOrder')}
              </button>
              <button
                onClick={handleReset}
                className="w-full px-4 py-2.5 bg-slate-800/50 text-slate-300 font-medium rounded-xl border border-slate-700/50 hover:bg-slate-700/50 hover:text-white transition-all duration-300"
              >
                {t('orderBuilder.resetToSuggested')}
              </button>
            </div>

            {/* Success Message */}
            {exportSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <p className="text-emerald-300 text-sm font-medium">{exportSuccess}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Stability Forecast Modal */}
      {data?.stability_forecast && (
        <StabilityForecastModal
          forecast={data.stability_forecast}
          isOpen={showStabilityModal}
          onClose={() => setShowStabilityModal(false)}
        />
      )}
    </div>
  );
}
