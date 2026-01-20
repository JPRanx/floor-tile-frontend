import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { factoryOrdersApi } from '../../requests/factoryOrders';
import { shipmentsApi } from '../../requests/shipments';
import type { FactoryOrder } from '../../requests/factoryOrders';
import type { Shipment } from '../../requests/shipments';
import type { PipelineOrderItem, PipelineShipmentItem } from '../../requests/pipeline';
import { LoadingSpinner } from '../LoadingSpinner';

interface PipelineDetailModalProps {
  item: PipelineOrderItem | PipelineShipmentItem | null;
  type: 'ordered' | 'shipped' | 'in_transit' | 'delivered';
  onClose: () => void;
  onStatusChange?: () => void;
}

// Factory Order status transitions
const FO_STATUS_TRANSITIONS: Record<string, { nextStatus: string; labelKey: string }> = {
  PENDING: { nextStatus: 'CONFIRMED', labelKey: 'pipelineDetail.markConfirmed' },
  CONFIRMED: { nextStatus: 'IN_PRODUCTION', labelKey: 'pipelineDetail.markInProduction' },
  IN_PRODUCTION: { nextStatus: 'READY', labelKey: 'pipelineDetail.markReady' },
  READY: { nextStatus: 'SHIPPED', labelKey: 'pipelineDetail.markShipped' },
};

// Shipment status transitions
const SHIPMENT_STATUS_TRANSITIONS: Record<string, { nextStatus: string; labelKey: string }> = {
  AT_FACTORY: { nextStatus: 'AT_ORIGIN_PORT', labelKey: 'pipelineDetail.markAtOrigin' },
  AT_ORIGIN_PORT: { nextStatus: 'IN_TRANSIT', labelKey: 'pipelineDetail.markInTransit' },
  IN_TRANSIT: { nextStatus: 'AT_DESTINATION_PORT', labelKey: 'pipelineDetail.markArrived' },
  AT_DESTINATION_PORT: { nextStatus: 'IN_CUSTOMS', labelKey: 'pipelineDetail.markInCustoms' },
  IN_CUSTOMS: { nextStatus: 'DELIVERED', labelKey: 'pipelineDetail.markDelivered' },
};

// Type guard for shipment items
function isShipmentItem(item: PipelineOrderItem | PipelineShipmentItem): item is PipelineShipmentItem {
  return 'shipment_id' in item;
}

// Status badge colors for FO (dark mode)
const foStatusColors: Record<string, string> = {
  PENDING: 'bg-slate-700 text-slate-300',
  CONFIRMED: 'bg-blue-900/50 text-blue-400',
  IN_PRODUCTION: 'bg-yellow-900/50 text-yellow-400',
  READY: 'bg-emerald-900/50 text-emerald-400',
  SHIPPED: 'bg-purple-900/50 text-purple-400',
};

// Status badge colors for Shipment (dark mode)
const shipmentStatusColors: Record<string, string> = {
  AT_FACTORY: 'bg-slate-700 text-slate-300',
  AT_ORIGIN_PORT: 'bg-blue-900/50 text-blue-400',
  IN_TRANSIT: 'bg-yellow-900/50 text-yellow-400',
  AT_DESTINATION_PORT: 'bg-emerald-900/50 text-emerald-400',
  IN_CUSTOMS: 'bg-purple-900/50 text-purple-400',
  DELIVERED: 'bg-emerald-900/70 text-emerald-300',
};

export function PipelineDetailModal({ item, type: _type, onClose, onStatusChange }: PipelineDetailModalProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'es' ? es : enUS;

  const [factoryOrder, setFactoryOrder] = useState<FactoryOrder | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showFoConfirm, setShowFoConfirm] = useState(false);
  const [showShipmentConfirm, setShowShipmentConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!item) {
      setLoading(false);
      return;
    }

    const loadDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch factory order details
        const foData = await factoryOrdersApi.getById(item.id);
        setFactoryOrder(foData);

        // If this is a shipment item, fetch shipment details
        if (isShipmentItem(item) && item.shipment_id) {
          const shipmentData = await shipmentsApi.getById(item.shipment_id);
          setShipment(shipmentData);
        }
      } catch (err: any) {
        setError(err.response?.data?.error?.message || t('pipelineDetail.loadError'));
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [item, t]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy', { locale });
    } catch {
      return dateStr;
    }
  };

  const formatStatus = (status: string, isFo: boolean = true) => {
    const key = isFo ? `foStatus.${status}` : `status.${status}`;
    return t(key) || status.replace(/_/g, ' ');
  };

  const handleFoStatusUpdate = async () => {
    if (!factoryOrder) return;
    const transition = FO_STATUS_TRANSITIONS[factoryOrder.status];
    if (!transition) return;

    setUpdating(true);
    setError(null);
    try {
      // Use the factory orders API to update status
      await factoryOrdersApi.updateStatus(factoryOrder.id, transition.nextStatus);
      setSuccessMessage(t('pipelineDetail.statusUpdated'));
      setShowFoConfirm(false);

      // Reload data
      const foData = await factoryOrdersApi.getById(factoryOrder.id);
      setFactoryOrder(foData);
      onStatusChange?.();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('pipelineDetail.updateError'));
    } finally {
      setUpdating(false);
    }
  };

  const handleShipmentStatusUpdate = async () => {
    if (!shipment) return;
    const transition = SHIPMENT_STATUS_TRANSITIONS[shipment.status];
    if (!transition) return;

    setUpdating(true);
    setError(null);
    try {
      await shipmentsApi.updateStatus(shipment.id, transition.nextStatus);
      setSuccessMessage(t('pipelineDetail.statusUpdated'));
      setShowShipmentConfirm(false);

      // Reload data
      const shipmentData = await shipmentsApi.getById(shipment.id);
      setShipment(shipmentData);
      onStatusChange?.();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('pipelineDetail.updateError'));
    } finally {
      setUpdating(false);
    }
  };

  if (!item) return null;

  const foTransition = factoryOrder ? FO_STATUS_TRANSITIONS[factoryOrder.status] : null;
  const shipmentTransition = shipment ? SHIPMENT_STATUS_TRANSITIONS[shipment.status] : null;
  const hasShipment = isShipmentItem(item) && item.shipment_id;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed inset-y-0 right-0 w-full max-w-lg bg-slate-900 z-50 overflow-hidden flex flex-col animate-slide-in-right border-l border-slate-700"
        style={{ boxShadow: '-8px 0 40px rgba(0, 0, 0, 0.5)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              {loading ? (
                <div className="h-6 w-32 bg-slate-700 animate-pulse rounded" />
              ) : factoryOrder ? (
                <>
                  <h2 className="text-lg font-semibold text-white">
                    {factoryOrder.pv_number || t('pipeline.noPV')}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${foStatusColors[factoryOrder.status]}`}>
                      {formatStatus(factoryOrder.status, true)}
                    </span>
                    {shipment && (
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${shipmentStatusColors[shipment.status]}`}>
                        {formatStatus(shipment.status, false)}
                      </span>
                    )}
                  </div>
                </>
              ) : null}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mt-3 bg-emerald-900/50 border border-emerald-700 rounded-lg p-2">
              <p className="text-sm text-emerald-400 flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {successMessage}
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          ) : factoryOrder ? (
            <div className="p-6 space-y-6">
              {/* Factory Order Info */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                    {t('pipelineDetail.factoryOrder')}
                  </h3>
                  {foTransition && (
                    <button
                      onClick={() => setShowFoConfirm(true)}
                      disabled={updating}
                      className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50 transition-colors"
                    >
                      {t(foTransition.labelKey)}
                    </button>
                  )}
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 grid grid-cols-2 gap-4 border border-slate-700/50">
                  <div>
                    <p className="text-xs text-slate-500">{t('pipelineDetail.pvNumber')}</p>
                    <p className="text-sm font-medium text-white">{factoryOrder.pv_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t('pipelineDetail.orderDate')}</p>
                    <p className="text-sm font-medium text-white">{formatDate(factoryOrder.order_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t('pipelineDetail.totalM2')}</p>
                    <p className="text-sm font-medium text-white">
                      {factoryOrder.total_m2 ? `${Math.round(factoryOrder.total_m2).toLocaleString()} m²` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t('pipelineDetail.itemCount')}</p>
                    <p className="text-sm font-medium text-white">
                      {factoryOrder.item_count || 0} {t('pipeline.items')}
                    </p>
                  </div>
                </div>
              </section>

              {/* Products List */}
              {factoryOrder.items && factoryOrder.items.length > 0 && (
                <section>
                  <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                    {t('pipelineDetail.products')} ({factoryOrder.items.length})
                  </h3>
                  <div className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700/50">
                    <table className="min-w-full divide-y divide-slate-700">
                      <thead className="bg-slate-800">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">SKU</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-slate-400 uppercase">{t('pipelineDetail.ordered')}</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-slate-400 uppercase">{t('pipelineDetail.produced')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {factoryOrder.items.map((foItem) => (
                          <tr key={foItem.id} className="hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-2 text-sm font-medium text-white">
                              {foItem.product_sku || foItem.product_id}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-300 text-right">
                              {Math.round(foItem.quantity_ordered).toLocaleString()} m²
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-300 text-right">
                              {Math.round(foItem.quantity_produced).toLocaleString()} m²
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Shipment Info */}
              {hasShipment && shipment ? (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                      {t('pipelineDetail.shipment')}
                    </h3>
                    {shipmentTransition && (
                      <button
                        onClick={() => setShowShipmentConfirm(true)}
                        disabled={updating}
                        className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                      >
                        {t(shipmentTransition.labelKey)}
                      </button>
                    )}
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 grid grid-cols-2 gap-4 border border-slate-700/50">
                    <div>
                      <p className="text-xs text-slate-500">{t('pipelineDetail.shpNumber')}</p>
                      <p className="text-sm font-medium text-white">{shipment.shp_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{t('pipelineDetail.booking')}</p>
                      <p className="text-sm font-medium text-white">{shipment.booking_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{t('pipelineDetail.vessel')}</p>
                      <p className="text-sm font-medium text-white">{shipment.vessel_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{t('pipelineDetail.voyage')}</p>
                      <p className="text-sm font-medium text-white">{shipment.voyage_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">ETD</p>
                      <p className="text-sm font-medium text-white">{formatDate(shipment.etd || null)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">ETA</p>
                      <p className="text-sm font-medium text-white">{formatDate(shipment.eta || null)}</p>
                    </div>
                  </div>
                </section>
              ) : (
                <section>
                  <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                    {t('pipelineDetail.shipment')}
                  </h3>
                  <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-amber-400">{t('pipelineDetail.noShipment')}</p>
                        <p className="text-sm text-amber-500/80 mt-1">{t('pipelineDetail.noShipmentHint')}</p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Notes */}
              {factoryOrder.notes && (
                <section>
                  <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                    {t('pipelineDetail.notes')}
                  </h3>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{factoryOrder.notes}</p>
                  </div>
                </section>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* FO Status Confirm Dialog */}
      {showFoConfirm && factoryOrder && foTransition && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowFoConfirm(false)} />
          <div className="relative bg-slate-800 rounded-xl shadow-2xl p-6 max-w-sm mx-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">{t('pipelineDetail.updateFoStatus')}</h3>
            <p className="text-sm text-slate-400 mb-4">
              {t('pipelineDetail.confirmChange', {
                from: formatStatus(factoryOrder.status, true),
                to: formatStatus(foTransition.nextStatus, true)
              })}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowFoConfirm(false)}
                disabled={updating}
                className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 disabled:opacity-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleFoStatusUpdate}
                disabled={updating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {updating && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipment Status Confirm Dialog */}
      {showShipmentConfirm && shipment && shipmentTransition && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowShipmentConfirm(false)} />
          <div className="relative bg-slate-800 rounded-xl shadow-2xl p-6 max-w-sm mx-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">{t('pipelineDetail.updateShipmentStatus')}</h3>
            <p className="text-sm text-slate-400 mb-4">
              {t('pipelineDetail.confirmChange', {
                from: formatStatus(shipment.status, false),
                to: formatStatus(shipmentTransition.nextStatus, false)
              })}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowShipmentConfirm(false)}
                disabled={updating}
                className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 disabled:opacity-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleShipmentStatusUpdate}
                disabled={updating}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {updating && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
