import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { orderBuilderApi } from '../requests/orderBuilder';
import { dataHubApi } from '../requests/dataHub';
import type {
  OrderBuilderResponse,
  OrderBuilderProduct,
  OrderBuilderSummary as SummaryType,
  OrderBuilderAlert,
  DemandForecastResponse,
  BLAllocationReport,
  GenerateReportRequest,
  FactoryCapabilities,
} from '../requests/orderBuilder';
import { boatsApi } from '../requests/boats';
import { factoryOrdersApi } from '../requests/factoryOrders';
import { warehouseOrdersApi } from '../requests/warehouseOrders';
import { productionScheduleApi } from '../requests/productionSchedule';
import type { WarehouseOrderItemCreate, WarehouseOrder } from '../requests/warehouseOrders';
import type { BoatSchedule } from '../requests/boats';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { OrderBuilderHeader } from '../components/OrderBuilderHeader';

import { OrderBuilderSummary } from '../components/OrderBuilderSummary';
import { ShippingEstimate } from '../components/ShippingEstimate';
import { OrderBuilderAlerts } from '../components/OrderBuilderAlerts';
import { UnableToShipAlert } from '../components/UnableToShipAlert';
import { CallBeforeOrderingAlert } from '../components/CallBeforeOrderingAlert';
import { BLAllocationView } from '../components/BLAllocationView';
import { WarehouseOrderSection } from '../components/WarehouseOrderSection';
import { AddToProductionSection } from '../components/AddToProductionSection';
import { FactoryRequestSection } from '../components/FactoryRequestSection';
import { LiquidationClearanceSection } from '../components/order-builder/LiquidationClearanceSection';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { draftsApi } from '../requests/drafts';
import { PlanningView } from './PlanningView';
import { RecalculateBar } from '../components/RecalculateBar';
import { StabilityForecastCard } from '../components/StabilityForecastCard';
import { StabilityForecastModal } from '../components/StabilityForecastModal';
import { PendingOrdersCard } from '../components/PendingOrdersCard';
import { StickyShipmentBar } from '../components/planning/StickyShipmentBar';
import { DraftChangeBanner } from '../components/planning/DraftChangeBanner';
import type { DataFreshnessResponse } from '../requests/dataHub';
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




  // Track if boats have been loaded
  const [boatsLoaded, setBoatsLoaded] = useState(false);

  // Demand forecast state
  const [demandForecast, setDemandForecast] = useState<DemandForecastResponse | null>(null);
  const [demandLoading, setDemandLoading] = useState(false);

  // BL Allocation state
  const [numBLs, setNumBLs] = useState(0); // 0 = auto (backend resolves to recommended)
  const [blAllocationReport, setBLAllocationReport] = useState<BLAllocationReport | null>(null);
  const [showBLView, setShowBLView] = useState(false);
  const [blLoading, setBLLoading] = useState(false);
  const [blExporting, setBLExporting] = useState(false);


  // Removed products tracking (for recalculate feature)
  const [removedSkus, setRemovedSkus] = useState<Set<string>>(new Set());
  const [recalculating, setRecalculating] = useState(false);


  // Pending warehouse orders state
  const [pendingOrders, setPendingOrders] = useState<WarehouseOrder[]>([]);

  // V2: URL params for factory-scoped mode
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlFactoryId = searchParams.get('factory_id');
  const urlBoatId = searchParams.get('boat_id');

  // V2: If no factory_id in URL, show Planning View
  const isDetailView = !!urlFactoryId;

  // V2: Factory state
  const [selectedFactoryId] = useState<string | null>(urlFactoryId);

  // V2: Draft auto-save state
  const [draftSaveStatus, setDraftSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_SAVE_RETRIES = 3;

  // V2: Draft change detection (timestamp-based)
  const [draftChangedSources, setDraftChangedSources] = useState<Array<{ source: string; label: string }>>([]);
  const [draftAgeDays, setDraftAgeDays] = useState(0);
  const [draftChangesDismissed, setDraftChangesDismissed] = useState(false);
  const draftLoadedRef = useRef(false);

  // 5c: Staleness banner state
  const [freshness, setFreshness] = useState<DataFreshnessResponse | null>(null);
  const [staleDismissed, setStaleDismissed] = useState(false);

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

  // 5c: Fetch data freshness on mount
  useEffect(() => {
    dataHubApi.getFreshness()
      .then(data => setFreshness(data))
      .catch(() => {}); // silent fail — nice-to-have banner
  }, []);

  // 5c: Compute stale items from freshness data
  const staleItems = useMemo(() => {
    if (!freshness) return [];
    const items: { type: string; label: string; daysAgo: number | null; critical: boolean }[] = [];
    const thresholds: Record<string, { label: string; warn: number; critical: number }> = {
      sales: { label: 'Ventas', warn: 7, critical: 14 },
      inventory: { label: 'Inventario', warn: 3, critical: 7 },
      siesa: { label: 'SIESA', warn: 3, critical: 7 },
      in_transit: { label: 'En tránsito', warn: 7, critical: 14 },
    };
    const now = Date.now();
    for (const [key, config] of Object.entries(thresholds)) {
      const d = freshness[key as keyof typeof freshness];
      if (!d?.last_updated) {
        items.push({ type: key, label: config.label, daysAgo: null, critical: true });
        continue;
      }
      const daysAgo = Math.floor((now - new Date(d.last_updated).getTime()) / 86400000);
      if (daysAgo >= config.warn) {
        items.push({ type: key, label: config.label, daysAgo, critical: daysAgo >= config.critical });
      }
    }
    return items;
  }, [freshness]);
  const hasCritical = staleItems.some(i => i.critical);


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
          setSelectedBoatId(urlBoatId || boats[0].id);
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
      const result = await orderBuilderApi.get({ num_bls: blCount, boat_id: boatId, factory_id: selectedFactoryId || undefined });
      setData(result);
      // V2: Extract factory timeline if present
      // Flatten all products into a single array for local state
      // Initialize selected_m2 from backend Decimal value (avoids JS float drift)
      const allProducts: OrderBuilderProductWithM2[] = [
        ...result.high_priority,
        ...result.consider,
        ...result.well_covered,
        ...result.your_call,
      ].map((p) => {
        const conversionFactor = p.pallet_conversion_factor || M2_PER_PALLET;
        const baseM2 = p.selected_pallets * conversionFactor;
        const availCap = p.availability_breakdown?.total_available_m2;
        const cappedM2 = availCap != null ? Math.min(baseM2, Number(availCap)) : baseM2;
        return { ...p, selected_m2: cappedM2 };
      });
      setProducts(allProducts);

      // Auto-select recommended BLs on initial load — backend already used
      // recommended_bls for capacity when num_bls=0 (auto), so no re-fetch needed
      if (isInitialLoad) {
        setNumBLs(result.recommended_bls || 1);
      }
    } catch (err) {
      setError(t('orderBuilder.loadError', 'Error al cargar datos del Order Builder'));
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

  // Load OB data when boat changes — always use num_bls=0 (auto) so backend
  // resolves to recommended BLs. Manual BL changes go through handleNumBLsChange.
  useEffect(() => {
    if (boatsLoaded) {
      loadData(0, selectedBoatId, true);
      loadDemandForecast(selectedBoatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBoatId, loadData, loadDemandForecast, boatsLoaded]);

  const handleBoatChange = (boatId: string) => {
    setSelectedBoatId(boatId);
  };

  const handleToggleSelect = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.product_id === productId) {
          const newSelected = !p.is_selected;
          const newPallets = newSelected ? p.coverage_gap_pallets : 0;
          const conversionFactor = p.pallet_conversion_factor || M2_PER_PALLET;
          const baseM2 = newPallets * conversionFactor;
          const availCap = p.availability_breakdown?.total_available_m2;
          const cappedM2 = availCap != null ? Math.min(baseM2, Number(availCap)) : baseM2;
          return {
            ...p,
            is_selected: newSelected,
            selected_pallets: newPallets,
            selected_m2: cappedM2,
          };
        }
        return p;
      })
    );
  };

  // Handle pallet input change: pallets → m²/uds = pallets × conversion_factor, capped at available
  const handleQuantityChange = (productId: string, pallets: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.product_id === productId) {
          const conversionFactor = p.pallet_conversion_factor || M2_PER_PALLET;
          const baseM2 = pallets * conversionFactor;
          const availCap = p.availability_breakdown?.total_available_m2;
          const cappedM2 = availCap != null ? Math.min(baseM2, Number(availCap)) : baseM2;
          return {
            ...p,
            selected_pallets: pallets,
            selected_m2: cappedM2,
            is_selected: pallets > 0,
          };
        }
        return p;
      })
    );
  };

  // Handle m²/uds input change: pallets = FLOOR(value / conversion_factor), capped at available
  const handleM2Change = (productId: string, m2: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.product_id === productId) {
          const conversionFactor = p.pallet_conversion_factor || M2_PER_PALLET;
          const availCap = p.availability_breakdown?.total_available_m2;
          const cappedM2 = availCap != null ? Math.min(m2, Number(availCap)) : m2;
          const pallets = Math.floor(cappedM2 / conversionFactor);
          return {
            ...p,
            selected_pallets: pallets,
            selected_m2: cappedM2,
            is_selected: cappedM2 > 0,
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
      // Reset local state with new products (use backend Decimal value)
      const allProducts: OrderBuilderProductWithM2[] = [
        ...result.high_priority,
        ...result.consider,
        ...result.well_covered,
        ...result.your_call,
      ].map((p) => {
        const conversionFactor = p.pallet_conversion_factor || M2_PER_PALLET;
        const baseM2 = p.selected_pallets * conversionFactor;
        const availCap = p.availability_breakdown?.total_available_m2;
        const cappedM2 = availCap != null ? Math.min(baseM2, Number(availCap)) : baseM2;
        return { ...p, selected_m2: cappedM2 };
      });
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

  // V2: Save function with retry logic (exponential backoff: 1s → 2s → 4s)
  const performSave = useCallback(async (retryAttempt = 0) => {
    if (!isDetailView || !selectedFactoryId || !selectedBoatId || products.length === 0) return;

    try {
      setDraftSaveStatus('saving');
      const items = products
        .filter(p => p.is_selected && p.selected_pallets > 0)
        .map(p => ({
          product_id: p.product_id,
          selected_pallets: p.selected_pallets,
          snapshot_data: {
            urgency: p.urgency,
            days_of_stock: p.days_of_stock,
            daily_velocity_m2: p.daily_velocity_m2,
            current_stock_m2: p.current_stock_m2,
            suggested_pallets: p.suggested_pallets,
          },
        }));
      await draftsApi.save({
        boat_id: selectedBoatId,
        factory_id: selectedFactoryId,
        items,
      });
      setDraftSaveStatus('saved');
      setTimeout(() => setDraftSaveStatus('idle'), 2000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: { message?: string } } } };
      if (axiosErr.response?.status === 409) {
        alert(axiosErr.response.data?.error?.message || 'Este borrador está bloqueado');
        setDraftSaveStatus('error');
        return;
      }

      if (retryAttempt < MAX_SAVE_RETRIES) {
        const delay = Math.pow(2, retryAttempt) * 1000; // 1s, 2s, 4s
        setDraftSaveStatus('saving');
        setTimeout(() => performSave(retryAttempt + 1), delay);
      } else {
        setDraftSaveStatus('error');
      }
    }
  }, [isDetailView, selectedFactoryId, selectedBoatId, products, MAX_SAVE_RETRIES]);

  // V2: Auto-save draft when products change (debounced)
  useEffect(() => {
    if (!isDetailView || !selectedFactoryId || !selectedBoatId || products.length === 0) return;

    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);

    draftSaveTimerRef.current = setTimeout(() => {
      performSave(0);
    }, 1500);

    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [products, isDetailView, selectedFactoryId, selectedBoatId, performSave]);

  // V2: Load existing draft on detail view mount (once per view entry)
  useEffect(() => {
    if (!isDetailView || !selectedFactoryId || !selectedBoatId || !data) return;
    // Only load draft once per view entry — skip when data refreshes (e.g. BL change)
    if (draftLoadedRef.current) return;
    draftLoadedRef.current = true;

    const loadDraft = async () => {
      try {
        const draft = await draftsApi.getDraft(selectedBoatId, selectedFactoryId);
        if (draft && draft.items.length > 0) {
          // Restore selections from draft (respect current SIESA stock)
          setProducts(prev => prev.map(p => {
            const draftItem = draft.items.find(d => d.product_id === p.product_id);
            if (draftItem) {
              const conversionFactor = p.pallet_conversion_factor || M2_PER_PALLET;
              const availCap = p.availability_breakdown?.total_available_m2;
              const maxAvailM2 = availCap != null ? Number(availCap) : Infinity;
              // Cap pallets at what's physically available
              const maxPallets = maxAvailM2 <= 0 ? 0 : maxAvailM2 < Infinity ? Math.max(1, Math.floor(maxAvailM2 / conversionFactor)) : draftItem.selected_pallets;
              const cappedPallets = Math.min(draftItem.selected_pallets, maxPallets);
              const baseM2 = cappedPallets * conversionFactor;
              const cappedM2 = Math.min(baseM2, maxAvailM2);
              return {
                ...p,
                is_selected: (p.factory_available_m2 ?? 0) > 0,
                selected_pallets: cappedPallets,
                selected_m2: cappedM2,
              };
            }
            return p;
          }));

          // Timestamp-based change detection: compare data source timestamps vs draft save time
          const draftSavedAt = new Date(draft.updated_at).getTime();
          const ageMs = Date.now() - draftSavedAt;
          setDraftAgeDays(Math.floor(ageMs / (1000 * 60 * 60 * 24)));

          try {
            const freshnessData = await dataHubApi.getFreshness();
            const SOURCE_LABELS: Record<string, string> = {
              sales: 'Ventas',
              inventory: 'Inventario',
              siesa: 'SIESA',
              in_transit: 'En tránsito',
              boats: 'Barcos',
              production: 'Producción',
            };
            const changed: Array<{ source: string; label: string }> = [];
            for (const [key, label] of Object.entries(SOURCE_LABELS)) {
              const source = freshnessData[key as keyof typeof freshnessData];
              if (source?.last_updated) {
                const sourceUpdated = new Date(source.last_updated).getTime();
                if (sourceUpdated > draftSavedAt) {
                  changed.push({ source: key, label });
                }
              }
            }
            if (changed.length > 0) {
              setDraftChangedSources(changed);
              setDraftChangesDismissed(false);
            }
          } catch {
            // Freshness check failed — don't show banner
          }
        }
      } catch (err) {
        console.error('Failed to load draft:', err);
      }
    };
    loadDraft();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDetailView, selectedFactoryId, selectedBoatId, data]); // data dependency ensures products are loaded first

  // Reset draft loaded flag when switching boat/factory
  useEffect(() => {
    draftLoadedRef.current = false;
  }, [selectedBoatId, selectedFactoryId]);


  // Calculate freed capacity from removed products
  const freedCapacity = (() => {
    if (removedSkus.size === 0) return { m2: 0, pallets: 0, containers: 0 };

    // Find removed products in original data
    const removedProducts = products.filter((p) => removedSkus.has(p.sku));
    const freedPallets = removedProducts.reduce((sum, p) => sum + (p.coverage_gap_pallets || 0), 0);
    const freedM2 = removedProducts.reduce((sum, p) => sum + (p.coverage_gap_pallets || 0) * (p.pallet_conversion_factor || M2_PER_PALLET), 0);
    const freedContainers = Math.ceil(freedPallets / CONTAINER_MAX_PALLETS);

    return { m2: freedM2, pallets: freedPallets, containers: freedContainers };
  })();

  // BL count change handler - explicitly reloads (numBLs removed from useEffect deps)
  const handleNumBLsChange = (newNumBLs: number) => {
    setNumBLs(newNumBLs);
    // Invalidate existing allocation when BL count changes
    setBLAllocationReport(null);
    setShowBLView(false);  // Return to product view when capacity changes
    loadData(newNumBLs, selectedBoatId);
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

  const handleSaveBLDraft = async () => {
    if (!blAllocationReport || !selectedFactoryId || !selectedBoatId) return;

    const blItems = blAllocationReport.allocations.flatMap((bl) =>
      bl.products.map((p) => {
        const obProduct = products.find(op => op.product_id === p.product_id);
        return {
          product_id: p.product_id,
          selected_pallets: p.pallets,
          bl_number: bl.bl_number,
          snapshot_data: obProduct ? {
            urgency: obProduct.urgency,
            days_of_stock: obProduct.days_of_stock,
            daily_velocity_m2: obProduct.daily_velocity_m2,
            current_stock_m2: obProduct.current_stock_m2,
            suggested_pallets: obProduct.suggested_pallets,
          } : undefined,
        };
      })
    );
    try {
      await draftsApi.save({
        boat_id: selectedBoatId,
        factory_id: selectedFactoryId,
        items: blItems,
      });
      navigate('/planning');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: { message?: string } } } };
      if (axiosErr.response?.status === 409) {
        alert(axiosErr.response.data?.error?.message || 'Este borrador esta bloqueado');
      } else {
        console.error('Save failed:', err);
      }
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
  const [exportError, setExportError] = useState<string | null>(null);
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
    setExportError(null);

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

      // 3. Close feedback loops — write to production_schedule so OB reads it back
      // Section 3: Factory request items → INSERT production_schedule rows
      const factoryRequestItems = data?.factory_request_summary?.items
        ?.filter((item) => item.is_selected && item.request_m2 > 0) || [];
      if (factoryRequestItems.length > 0) {
        await productionScheduleApi.createFromOrderBuilder(
          factoryRequestItems.map((item) => ({
            product_id: item.product_id,
            sku: item.sku,
            referencia: item.description || item.sku,
            requested_m2: Number(item.request_m2),
          })),
          departureDateStr,
        );
      }

      // Section 2: Piggyback items → UPDATE production_schedule.requested_m2
      const piggybackItems = data?.add_to_production_summary?.items
        ?.filter((item) => item.is_selected && item.suggested_additional_m2 > 0) || [];
      if (piggybackItems.length > 0) {
        await productionScheduleApi.updatePiggyback(
          piggybackItems.map((item) => ({
            product_id: item.product_id,
            additional_m2: Number(item.suggested_additional_m2),
          })),
        );
      }

      // 4. Export Excel (existing functionality)
      const blob = await orderBuilderApi.exportOrder({
        products: selected.map((p) => ({
          sku: p.sku,
          pallets: p.selected_pallets,
        })),
        boat_departure: departureDateStr,
      });

      // 5. Create download link with PV number in filename
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PEDIDO_${pvNumber}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      // 6. Show success message
      setExportSuccess(t('orderBuilder.exportSuccess', { pvNumber }));

      // 7. Refresh pending orders list
      fetchPendingOrders();

      // Clear success message after 5 seconds
      setTimeout(() => setExportSuccess(null), 5000);

    } catch (err: unknown) {
      console.error('Export failed:', err);

      // Provide specific error message based on failure type
      const axiosError = err as { config?: { url?: string }; response?: { data?: { error?: { message?: string } } } };
      const failedUrl = axiosError?.config?.url || '';
      const apiMessage = axiosError?.response?.data?.error?.message;

      let errorMsg: string;
      if (failedUrl.includes('warehouse-orders')) {
        errorMsg = t('orderBuilder.exportErrorSave', 'Error al guardar pedido. Exportación cancelada.');
      } else if (failedUrl.includes('factory-orders')) {
        errorMsg = t('orderBuilder.exportErrorFactory', 'Error al crear orden de fábrica.');
      } else if (apiMessage) {
        errorMsg = apiMessage;
      } else {
        errorMsg = t('orderBuilder.exportErrorGeneric', 'Error al exportar. Verifica tu conexión e intenta de nuevo.');
      }
      setExportError(errorMsg);
      setTimeout(() => setExportError(null), 5000);
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
        message: t('orderBuilder.alerts.warehouseExceeded', 'Excede bodega en {{over}} paletas. Elimina algunos artículos.', { over }),
      });
    } else if (summary.warehouse_utilization_after > 95) {
      alertList.push({
        type: 'warning',
        icon: '⚠️',
        product_sku: null,
        message: t('orderBuilder.alerts.warehouseHigh', 'Bodega estará al {{pct}}% después de entrega', { pct: Math.round(summary.warehouse_utilization_after) }),
      });
    }

    // Boat exceeded
    if (summary.total_containers > summary.boat_max_containers) {
      alertList.push({
        type: 'blocked',
        icon: '🚫',
        product_sku: null,
        message: t('orderBuilder.alerts.boatExceeded', 'Excede capacidad del barco ({{used}}/{{max}} contenedores)', { used: summary.total_containers, max: summary.boat_max_containers }),
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
        message: t('orderBuilder.alerts.roomForMore', 'Espacio para {{count}} contenedor(es) más', { count: summary.boat_remaining_containers }),
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
          message: t('orderBuilder.alerts.highPriorityUnselected', 'ALTA PRIORIDAD pero no seleccionado — riesgo de desabasto'),
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
        message: t('orderBuilder.alerts.bookingDeadline', '¡Fecha límite de reserva en {{days}} días!', { days: data.boat.days_until_deadline }),
      });
    }

    return alertList;
  })();


  // V2: Show Planning View if no factory_id in URL
  if (!isDetailView) {
    return <PlanningView />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
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

  const capabilities: FactoryCapabilities = data.capabilities ?? {
    has_factory_inventory: true,
    has_logistics: true,
    has_production: true,
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* V2: Back to Planning */}
        <button
          onClick={() => navigate('/planning')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <span>&larr;</span>
          <span className="text-sm">{t('planning.backToPlanning', 'Volver a Planificaci\u00f3n')}</span>
        </button>

        {/* 5c: Staleness warning banner */}
        {staleItems.length > 0 && !staleDismissed && (
          <div className={`px-4 py-2 rounded-lg border text-sm flex items-center justify-between ${
            hasCritical ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {staleItems.map(item => (
                <span key={item.type}>
                  {item.label}: {item.daysAgo === null ? t('common.noData', 'Sin datos') : t('common.daysAgoLabel', 'hace {{count}} días', { count: item.daysAgo })}
                </span>
              ))}
            </div>
            <button onClick={() => setStaleDismissed(true)} className="ml-3 text-slate-500 hover:text-slate-300 flex-shrink-0">{'\u2715'}</button>
          </div>
        )}


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
          recommendedBLsReason={data.recommended_bls_reason}
          shippableBLs={data.shippable_bls}
          capabilities={capabilities}
        />

        {/* BL Allocation View - shown when allocation is generated */}
        {capabilities.has_logistics && showBLView && blAllocationReport && (
          <BLAllocationView
            report={blAllocationReport}
            onBack={handleBackToProducts}
            onExport={handleExportBLs}
            onSaveDraft={handleSaveBLDraft}
            isExporting={blExporting}
          />
        )}

        {/* Section summary badges */}
        {!showBLView && (
          <div className="flex items-center gap-3">
            {data.warehouse_order_summary && data.warehouse_order_summary.product_count > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {t('orderBuilder.warehouseOrder', 'Bodega')}: {data.warehouse_order_summary.product_count}
              </span>
            )}
            {data.add_to_production_summary && data.add_to_production_summary.product_count > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {t('orderBuilder.addToProduction', 'Agregar a Producción')}: {data.add_to_production_summary.product_count}
              </span>
            )}
            {data.factory_request_summary && data.factory_request_summary.product_count > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30">
                {t('orderBuilder.factoryRequest', 'Solicitud de Fábrica')}: {data.factory_request_summary.product_count}
              </span>
            )}
          </div>
        )}

        {/* Main content: Products and Summary side by side on desktop */}
        {!showBLView && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Column (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Compact Strategy One-Liner (dissolved from full card) */}
            {data.summary_reasoning && (
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/30 backdrop-blur-xl rounded-xl border border-slate-700/50">
                <span className="text-lg">
                  {data.summary_reasoning.strategy === 'STOCKOUT_PREVENTION' && '\u{1F6E1}\u{FE0F}'}
                  {data.summary_reasoning.strategy === 'DEMAND_CAPTURE' && '\u{1F4C8}'}
                  {data.summary_reasoning.strategy === 'BALANCED' && '\u{2696}\u{FE0F}'}
                </span>
                <span className="text-sm text-slate-300 flex-1">
                  {data.summary_reasoning.reasoning?.strategy_sentence || t(`orderBuilder.strategy.${data.summary_reasoning.strategy}`)}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {data.summary_reasoning.critical_count > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      {data.summary_reasoning.critical_count} {t('orderBuilder.critical')}
                    </span>
                  )}
                  {data.summary_reasoning.urgent_count > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      {data.summary_reasoning.urgent_count} {t('orderBuilder.urgent')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Forward Simulation Indicator / Deadline Warning */}
            {products.some(p => p.uses_forward_simulation) && data?.boat.arrival_date && (
              new Date(data.boat.arrival_date) > new Date() ? (
                <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate-400">
                  <span className="text-blue-400">&#x1F4CA;</span>
                  <span>
                    {t('orderBuilder.simulatedTo', 'Simulado al {{date}} — stock proyectado considera barcos anteriores', {
                      date: new Date(data.boat.arrival_date).toLocaleDateString('es', { month: 'short', day: 'numeric' })
                    })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 text-xs text-amber-400">
                  <span>&#x26A0;&#xFE0F;</span>
                  <span>
                    {t('orderBuilder.deadlinePassed', 'Fecha límite de pedido pasó hace {{days}} días — actúa pronto', {
                      days: Math.abs(data.boat.days_until_order_deadline)
                    })}
                  </span>
                </div>
              )
            )}

            {/* Draft Change Banner — timestamp-based detection */}
            {!draftChangesDismissed && (
              <DraftChangeBanner
                changedSources={draftChangedSources}
                draftAgeDays={draftAgeDays}
                onAcceptAll={() => {
                  // Accept all: reset selections to current OB recommendations
                  const updated = products.map(p => {
                    const pallets = p.coverage_gap_pallets || 0;
                    const conversionFactor = p.pallet_conversion_factor || M2_PER_PALLET;
                    const baseM2 = pallets * conversionFactor;
                    const availCap = p.availability_breakdown?.total_available_m2;
                    const cappedM2 = availCap != null ? Math.min(baseM2, Number(availCap)) : baseM2;
                    return {
                      ...p,
                      selected_pallets: pallets,
                      selected_m2: cappedM2,
                      is_selected: pallets > 0,
                    };
                  });
                  setProducts(updated);
                  setDraftChangedSources([]);
                  setDraftChangesDismissed(true);

                  // Immediate save to update draft timestamp
                  if (selectedBoatId && selectedFactoryId) {
                    const items = updated
                      .filter(p => p.is_selected && p.selected_pallets > 0)
                      .map(p => ({
                        product_id: p.product_id,
                        selected_pallets: p.selected_pallets,
                        snapshot_data: {
                          urgency: p.urgency,
                          days_of_stock: p.days_of_stock,
                          daily_velocity_m2: p.daily_velocity_m2,
                          current_stock_m2: p.current_stock_m2,
                          suggested_pallets: p.suggested_pallets,
                        },
                      }));
                    draftsApi.save({
                      boat_id: selectedBoatId,
                      factory_id: selectedFactoryId,
                      items,
                    }).catch(console.error);
                  }
                }}
                onDismiss={() => {
                  setDraftChangesDismissed(true);
                }}
              />
            )}

            {/* Recalculate Bar - Show when products are removed */}
            {removedSkus.size > 0 && (
              <RecalculateBar
                removedProducts={products
                  .filter((p) => removedSkus.has(p.sku))
                  .map((p) => ({
                    sku: p.sku,
                    pallets: p.coverage_gap_pallets || 0,
                    m2: (p.coverage_gap_pallets || 0) * (p.pallet_conversion_factor || M2_PER_PALLET),
                  }))}
                freedCapacity={freedCapacity}
                onRecalculate={handleRecalculate}
                onRestore={handleRestoreProduct}
                isRecalculating={recalculating}
              />
            )}

            {/* === THREE-SECTION VIEW === */}
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
                unitLabel={data.unit_label}
                isUnitBased={data.is_unit_based}
                capabilities={capabilities}
              />

              {/* Section 2: Add to Production — Piggyback on scheduled items */}
              {capabilities.has_production && (
                <AddToProductionSection
                  summary={data.add_to_production_summary}
                />
              )}

              {/* Section 3: Factory Request — New production requests */}
              {capabilities.has_production && (
                <FactoryRequestSection
                  summary={data.factory_request_summary}
                />
              )}
            </div>


            {/* Liquidation Clearance — deactivated products with factory stock */}
            {capabilities.has_factory_inventory && data.liquidation_clearance && data.liquidation_clearance.length > 0 && (
              <LiquidationClearanceSection products={data.liquidation_clearance} />
            )}
          </div>

          {/* Summary Column (1/3 width on desktop) */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            {/* 1. Stability Forecast - TOP */}
            {capabilities.has_logistics && data.stability_forecast && (
              <StabilityForecastCard
                forecast={data.stability_forecast}
                boatName={data.boat.name}
                orderDeadline={data.boat.order_deadline}
                onViewDetails={() => setShowStabilityModal(true)}
              />
            )}

            {/* 2. Order Summary Card (with absorbed demand + customer data) */}
            <OrderBuilderSummary
              summary={summary}
              recommendedDemandM2={demandForecast?.recommended_demand_m2}
              customersDueSoonCount={demandForecast?.customers_due_soon?.length}
            />

            {/* 2b. Shipping Estimate */}
            {capabilities.has_logistics && data?.shipping_cost_config && (
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
            {capabilities.has_factory_inventory && (
              <UnableToShipAlert unableToShip={data?.unable_to_ship || null} />
            )}

            {/* 4. Pending Orders - Shows existing orders for visibility */}
            <PendingOrdersCard
              orders={pendingOrders}
              currentBoatId={selectedBoatId}
              onCancel={handleCancelPendingOrder}
              onRefresh={fetchPendingOrders}
            />

            {/* V2: Draft Status */}
            {draftSaveStatus !== 'idle' && (
              <div className={`text-xs px-3 py-1.5 rounded-full ${
                draftSaveStatus === 'saving' ? 'bg-slate-700/50 text-slate-400' :
                draftSaveStatus === 'saved' ? 'bg-emerald-500/10 text-emerald-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                {draftSaveStatus === 'saving' && t('planning.draftSaving', 'Guardando borrador...')}
                {draftSaveStatus === 'saved' && t('planning.draftSaved', '\u2713 Borrador guardado')}
                {draftSaveStatus === 'error' && t('planning.draftError', 'Error al guardar borrador')}
              </div>
            )}

            {/* 5. Action Buttons */}
            <div className="flex flex-col gap-3">
              {/* Generate Report Button */}
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-blue-400 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {generatingReport
                  ? t('orderBuilder.generatingReport', 'Generando Reporte...')
                  : t('orderBuilder.generateReport', 'Generar Reporte')}
              </button>

              {/* Allocate to BLs Button */}
              {capabilities.has_logistics && (
                <button
                  onClick={handleAllocateToBLs}
                  disabled={blLoading || products.filter((p) => p.is_selected && p.selected_pallets > 0).length === 0}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-indigo-400 transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {blLoading
                    ? t('blAllocation.allocating', 'Asignando...')
                    : t('blAllocation.allocateToBLs', 'Asignar a BLs')}
                </button>
              )}

              {/* Export - only after BL allocation */}
              {capabilities.has_logistics && blAllocationReport && (
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-emerald-400 transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {exporting ? t('orderBuilder.exporting') : t('orderBuilder.exportOrder')}
                </button>
              )}
              <button
                onClick={handleReset}
                className="w-full px-4 py-2.5 bg-slate-800/50 text-slate-300 font-medium rounded-xl border border-slate-700/50 hover:bg-slate-700/50 hover:text-white transition-all duration-300"
              >
                {t('orderBuilder.resetToSuggested')}
              </button>
            </div>

            {/* Export Error Message */}
            {exportError && (
              <div className="mt-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
                {exportError}
              </div>
            )}

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

      {/* Sticky Shipment Summary Bar — hidden during BL allocation view */}
      {capabilities.has_logistics && !showBLView && <StickyShipmentBar
        totalPallets={summary.total_pallets}
        totalM2={summary.total_m2}
        totalContainers={summary.total_containers}
        maxContainers={summary.boat_max_containers}
        totalWeightKg={summary.total_weight_kg}
        estimatedCostUsd={data?.shipping_cost_config ? Math.round(summary.total_containers * data.shipping_cost_config.per_container_total_usd + numBLs * data.shipping_cost_config.bl_fixed_costs_usd) : null}
        selectedCount={products.filter(p => p.is_selected && p.selected_pallets > 0).length}
        onAllocateBLs={handleAllocateToBLs}
        onExport={handleExport}
        isExporting={exporting}
        isBLLoading={blLoading}
        hasBLAllocation={blAllocationReport !== null}
      />}
    </div>
  );
}
