import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { warehouseOrdersApi } from '../requests/warehouseOrders';
import type { WarehouseOrder, WarehouseOrderItem } from '../requests/warehouseOrders';
import { formatM2 } from '../utils/formatters';

interface PendingOrdersCardProps {
  orders: WarehouseOrder[];
  currentBoatId?: string;
  onCancel: (orderId: string) => void;
  onRefresh: () => void;
}

export function PendingOrdersCard({
  orders,
  currentBoatId,
  onCancel,
  onRefresh,
}: PendingOrdersCardProps) {
  const { t } = useTranslation();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<string, WarehouseOrder>>({});

  // Don't render if no pending orders
  if (orders.length === 0) {
    return null;
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm(t('pendingOrders.confirmCancel', 'Cancel this order? This cannot be undone.'))) {
      return;
    }

    setCancellingId(orderId);
    try {
      await onCancel(orderId);
    } finally {
      setCancellingId(null);
    }
  };

  const toggleDetails = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      // Collapse
      setExpandedOrderId(null);
      return;
    }

    // Expand and fetch details if not already loaded
    setExpandedOrderId(orderId);

    if (!orderDetails[orderId]) {
      setLoadingDetailsId(orderId);
      try {
        const details = await warehouseOrdersApi.getById(orderId);
        setOrderDetails((prev) => ({ ...prev, [orderId]: details }));
      } catch (error) {
        console.error('Failed to load order details:', error);
      } finally {
        setLoadingDetailsId(null);
      }
    }
  };

  return (
    <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400">
            📦
          </span>
          {t('pendingOrders.title', 'Pending Orders')}
          <span className="text-sm font-normal text-slate-400">({orders.length})</span>
        </h3>
        <button
          onClick={onRefresh}
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {t('common.refresh', 'Refresh')}
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {orders.map((order) => {
          const isCurrentBoat = order.boat_id === currentBoatId;
          const isExpanded = expandedOrderId === order.id;
          const isCancelling = cancellingId === order.id;

          return (
            <div
              key={order.id}
              className={`
                rounded-xl border transition-all duration-200
                ${isCurrentBoat
                  ? 'border-amber-500/50 bg-amber-500/5'
                  : 'border-slate-700/50 bg-slate-700/20'
                }
              `}
            >
              {/* Current Boat Warning */}
              {isCurrentBoat && (
                <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 rounded-t-xl">
                  <div className="flex items-center gap-2 text-amber-400 text-sm">
                    <span>⚠️</span>
                    <span>{t('pendingOrders.currentBoatWarning', 'Order exists for selected boat')}</span>
                  </div>
                </div>
              )}

              <div className="p-4">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">
                        {order.boat_name || t('pendingOrders.unknownBoat', 'Unknown Boat')}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30">
                        {t('pendingOrders.pending', 'Pending')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {t('pendingOrders.created', 'Created')}: {formatDateTime(order.created_at)}
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                  <div className="bg-slate-700/30 rounded-lg px-3 py-2">
                    <div className="text-slate-400 text-xs">
                      {t('pendingOrders.departs', 'Departs')}
                    </div>
                    <div className="text-white font-medium">
                      {formatDate(order.boat_departure_date)}
                    </div>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg px-3 py-2">
                    <div className="text-slate-400 text-xs">
                      {t('pendingOrders.inWarehouse', 'In Warehouse')}
                    </div>
                    <div className="text-emerald-400 font-medium">
                      ~{formatDate(order.estimated_warehouse_date)}
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex items-center gap-4 text-sm mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">{t('common.pallets', 'Pallets')}:</span>
                    <span className="text-white font-semibold">{order.total_pallets}</span>
                  </div>
                  <span className="text-slate-600">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">m²:</span>
                    <span className="text-white font-semibold">{formatM2(order.total_m2)}</span>
                  </div>
                  <span className="text-slate-600">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">{t('common.containers', 'Cont')}:</span>
                    <span className="text-white font-semibold">{order.total_containers}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleDetails(order.id)}
                    disabled={loadingDetailsId === order.id}
                    className="flex-1 px-3 py-2 text-sm font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loadingDetailsId === order.id
                      ? t('common.loading', 'Loading...')
                      : isExpanded
                        ? t('common.hideDetails', 'Hide Details')
                        : t('common.viewDetails', 'View Details')}
                  </button>
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={isCancelling}
                    className="px-3 py-2 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCancelling
                      ? t('common.cancelling', 'Cancelling...')
                      : t('common.cancel', 'Cancel')}
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    {/* Loading state */}
                    {loadingDetailsId === order.id && (
                      <div className="text-sm text-slate-400 text-center py-4">
                        {t('common.loading', 'Loading...')}
                      </div>
                    )}

                    {/* Items loaded */}
                    {loadingDetailsId !== order.id && orderDetails[order.id]?.items && orderDetails[order.id].items!.length > 0 && (
                      <>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                          {t('pendingOrders.items', 'Items')} ({orderDetails[order.id].items!.length})
                        </div>

                        {/* Items Table Header */}
                        <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 uppercase tracking-wide mb-1 px-2">
                          <div className="col-span-6">{t('common.sku', 'SKU')}</div>
                          <div className="col-span-3 text-right">{t('common.pallets', 'Pallets')}</div>
                          <div className="col-span-3 text-right">m²</div>
                        </div>

                        {/* Items List */}
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {orderDetails[order.id].items!.map((item: WarehouseOrderItem) => (
                            <div
                              key={item.id}
                              className={`
                                grid grid-cols-12 gap-2 px-2 py-1.5 rounded text-sm
                                ${item.is_critical
                                  ? 'bg-red-500/10 text-red-300'
                                  : 'bg-slate-700/30 text-slate-300'
                                }
                              `}
                            >
                              <div className="col-span-6 truncate flex items-center gap-1.5">
                                {item.is_critical && (
                                  <span className="text-red-400" title="Critical">🔴</span>
                                )}
                                {item.sku}
                              </div>
                              <div className="col-span-3 text-right font-medium">
                                {item.pallets}
                              </div>
                              <div className="col-span-3 text-right">
                                {formatM2(item.m2)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Items Total */}
                        <div className="grid grid-cols-12 gap-2 px-2 py-2 mt-2 bg-slate-700/40 rounded text-sm font-semibold">
                          <div className="col-span-6 text-slate-300">
                            {t('common.total', 'TOTAL')}
                          </div>
                          <div className="col-span-3 text-right text-white">
                            {order.total_pallets}
                          </div>
                          <div className="col-span-3 text-right text-white">
                            {formatM2(order.total_m2)}
                          </div>
                        </div>
                      </>
                    )}

                    {/* No items found after loading */}
                    {loadingDetailsId !== order.id && orderDetails[order.id] && (!orderDetails[order.id].items || orderDetails[order.id].items!.length === 0) && (
                      <p className="text-sm text-slate-400 text-center py-2">
                        {t('pendingOrders.noItems', 'No items in this order')}
                      </p>
                    )}
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
