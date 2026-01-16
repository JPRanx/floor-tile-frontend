import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { shipmentsApi, portsApi } from '../requests/shipments';
import type { Shipment, Container, ShipmentEvent, Port, ShipmentCostsUpdate } from '../requests/shipments';
import { LoadingSpinner } from './LoadingSpinner';

interface ShipmentDetailPanelProps {
  shipmentId: string | null;
  onClose: () => void;
  onStatusChange?: () => void;
}

// Status transition map: current status -> { nextStatus, buttonLabel }
const STATUS_TRANSITIONS: Record<string, { nextStatus: string; buttonLabel: string }> = {
  AT_FACTORY: { nextStatus: 'IN_TRANSIT', buttonLabel: 'Mark Departed' },
  IN_TRANSIT: { nextStatus: 'AT_DESTINATION_PORT', buttonLabel: 'Mark Arrived' },
  AT_DESTINATION_PORT: { nextStatus: 'IN_CUSTOMS', buttonLabel: 'Mark Cleared' },
  IN_CUSTOMS: { nextStatus: 'DELIVERED', buttonLabel: 'Mark Delivered' },
};

export function ShipmentDetailPanel({ shipmentId, onClose, onStatusChange }: ShipmentDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [events, setEvents] = useState<ShipmentEvent[]>([]);
  const [ports, setPorts] = useState<Record<string, Port>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containersError, setContainersError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingCosts, setEditingCosts] = useState(false);
  const [savingCosts, setSavingCosts] = useState(false);
  const [costsForm, setCostsForm] = useState<ShipmentCostsUpdate>({});

  useEffect(() => {
    if (!shipmentId) {
      setShipment(null);
      setContainers([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      setContainersError(null);

      try {
        // Fetch shipment, events, and ports first (critical data)
        const [shipmentData, eventsData, portsData] = await Promise.all([
          shipmentsApi.getById(shipmentId),
          shipmentsApi.getEvents(shipmentId),
          portsApi.list(),
        ]);

        setShipment(shipmentData);
        // Sort events chronologically (oldest first to show journey progression)
        setEvents([...eventsData].sort((a, b) =>
          new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
        ));

        // Create port lookup map
        const portMap: Record<string, Port> = {};
        portsData.forEach(port => {
          portMap[port.id] = port;
        });
        setPorts(portMap);

        // Fetch containers separately (non-critical, can fail gracefully)
        try {
          const containersData = await shipmentsApi.getContainers(shipmentId);
          setContainers(containersData);
        } catch (containerErr: any) {
          setContainersError(t('shipmentDetail.failedLoadContainers'));
          setContainers([]);
        }
      } catch (err: any) {
        setError(err.response?.data?.error?.message || t('shipmentDetail.failedLoadDetails'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [shipmentId]);

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string): string => {
    const statusMap: Record<string, string> = {
      AT_FACTORY: 'bg-gray-100 text-gray-800',
      AT_ORIGIN_PORT: 'bg-blue-100 text-blue-800',
      IN_TRANSIT: 'bg-yellow-100 text-yellow-800',
      AT_DESTINATION_PORT: 'bg-green-100 text-green-800',
      IN_CUSTOMS: 'bg-purple-100 text-purple-800',
      IN_TRUCK: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-green-200 text-green-900',
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  const formatStatus = (status: string): string => {
    // Use translation key if available
    const translatedStatus = t(`status.${status}`, { defaultValue: '' });
    if (translatedStatus) return translatedStatus;
    // Fallback: format the status string
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getPortName = (portId?: string): string => {
    if (!portId) return '-';
    const port = ports[portId];
    return port ? `${port.name}, ${port.country}` : portId;
  };

  const reloadData = async () => {
    if (!shipmentId) return;
    try {
      const [shipmentData, eventsData] = await Promise.all([
        shipmentsApi.getById(shipmentId),
        shipmentsApi.getEvents(shipmentId),
      ]);
      setShipment(shipmentData);
      setEvents([...eventsData].sort((a, b) =>
        new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
      ));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to reload data');
    }
  };

  const handleStatusUpdate = async () => {
    if (!shipment || !shipmentId) return;
    const transition = STATUS_TRANSITIONS[shipment.status];
    if (!transition) return;

    setUpdating(true);
    setError(null);
    try {
      await shipmentsApi.updateStatus(shipmentId, transition.nextStatus);
      setSuccessMessage(t('shipmentDetail.statusUpdated', { status: formatStatus(transition.nextStatus) }));
      setShowConfirm(false);
      await reloadData();
      onStatusChange?.();
      // Auto-hide success message after 3s
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('shipmentDetail.failedUpdateStatus'));
    } finally {
      setUpdating(false);
    }
  };

  const currentTransition = shipment ? STATUS_TRANSITIONS[shipment.status] : null;

  const handleEditCosts = () => {
    if (!shipment) return;
    setCostsForm({
      freight_cost_usd: shipment.freight_cost_usd,
      customs_cost_usd: shipment.customs_cost_usd,
      duties_cost_usd: shipment.duties_cost_usd,
      insurance_cost_usd: shipment.insurance_cost_usd,
      demurrage_cost_usd: shipment.demurrage_cost_usd,
      other_costs_usd: shipment.other_costs_usd,
    });
    setEditingCosts(true);
  };

  const handleCancelEditCosts = () => {
    setEditingCosts(false);
    setCostsForm({});
  };

  const handleSaveCosts = async () => {
    if (!shipmentId) return;
    setSavingCosts(true);
    setError(null);
    try {
      await shipmentsApi.updateCosts(shipmentId, costsForm);
      setSuccessMessage(t('costs.saved'));
      setEditingCosts(false);
      await reloadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('costs.error'));
    } finally {
      setSavingCosts(false);
    }
  };

  const handleCostChange = (field: keyof ShipmentCostsUpdate, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setCostsForm(prev => ({ ...prev, [field]: numValue }));
  };

  const formatCurrency = (value?: number): string => {
    if (value === undefined || value === null) return '-';
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const hasCostData = shipment && (
    shipment.freight_cost_usd ||
    shipment.customs_cost_usd ||
    shipment.duties_cost_usd ||
    shipment.insurance_cost_usd ||
    shipment.demurrage_cost_usd ||
    shipment.other_costs_usd
  );

  if (!shipmentId) return null;

  return (
    <>
      {/* Invisible backdrop for click-outside-to-close */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Panel with strong left shadow */}
      <div
        className="fixed inset-y-0 right-0 w-full max-w-lg bg-white z-50 overflow-hidden flex flex-col animate-slide-in-right"
        style={{ boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.15)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              {loading ? (
                <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
              ) : shipment ? (
                <>
                  <h2 className="text-lg font-semibold text-gray-900">{shipment.shp_number}</h2>
                  <span className={`inline-flex mt-1 px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(shipment.status)}`}>
                    {formatStatus(shipment.status)}
                  </span>
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {/* Status Action Button */}
              {currentTransition && !loading && (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={updating}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {currentTransition.buttonLabel}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-2">
              <p className="text-sm text-green-800 flex items-center gap-2">
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
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          ) : shipment ? (
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <section>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">{t('shipmentDetail.shipmentInfo')}</h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">{t('shipmentDetail.bookingNumber')}</p>
                    <p className="text-sm font-medium text-gray-900">{shipment.booking_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('shipmentDetail.billOfLading')}</p>
                    <p className="text-sm font-medium text-gray-900">{shipment.bill_of_lading || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('shipmentDetail.vessel')}</p>
                    <p className="text-sm font-medium text-gray-900">{shipment.vessel_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('shipmentDetail.voyage')}</p>
                    <p className="text-sm font-medium text-gray-900">{shipment.voyage_number || '-'}</p>
                  </div>
                </div>
              </section>

              {/* Ports */}
              <section>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">{t('shipmentDetail.route')}</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">{t('shipmentDetail.origin')}</p>
                      <p className="text-sm font-medium text-gray-900">{getPortName(shipment.origin_port_id)}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-xs text-gray-500">{t('shipmentDetail.destination')}</p>
                      <p className="text-sm font-medium text-gray-900">{getPortName(shipment.destination_port_id)}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Dates */}
              <section>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">{t('shipmentDetail.schedule')}</h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">{t('shipmentDetail.etdEstimated')}</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(shipment.etd)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('shipmentDetail.etaEstimated')}</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(shipment.eta)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('shipmentDetail.atdActual')}</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(shipment.actual_departure)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('shipmentDetail.ataActual')}</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(shipment.actual_arrival)}</p>
                  </div>
                </div>
              </section>

              {/* Cost Breakdown */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{t('costs.title')}</h3>
                  {!editingCosts ? (
                    <button
                      onClick={handleEditCosts}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {t('costs.edit')}
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelEditCosts}
                        disabled={savingCosts}
                        className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleSaveCosts}
                        disabled={savingCosts}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        {savingCosts && (
                          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        )}
                        {savingCosts ? t('costs.saving') : t('costs.save')}
                      </button>
                    </div>
                  )}
                </div>
                {editingCosts ? (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('costs.freight')}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={costsForm.freight_cost_usd ?? ''}
                          onChange={(e) => handleCostChange('freight_cost_usd', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('costs.customs')}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={costsForm.customs_cost_usd ?? ''}
                          onChange={(e) => handleCostChange('customs_cost_usd', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('costs.duties')}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={costsForm.duties_cost_usd ?? ''}
                          onChange={(e) => handleCostChange('duties_cost_usd', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('costs.insurance')}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={costsForm.insurance_cost_usd ?? ''}
                          onChange={(e) => handleCostChange('insurance_cost_usd', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('costs.demurrage')}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={costsForm.demurrage_cost_usd ?? ''}
                          onChange={(e) => handleCostChange('demurrage_cost_usd', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('costs.other')}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={costsForm.other_costs_usd ?? ''}
                          onChange={(e) => handleCostChange('other_costs_usd', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ) : hasCostData ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('costs.freight')}</span>
                        <span className="font-medium text-gray-900">{formatCurrency(shipment.freight_cost_usd)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('costs.customs')}</span>
                        <span className="font-medium text-gray-900">{formatCurrency(shipment.customs_cost_usd)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('costs.duties')}</span>
                        <span className="font-medium text-gray-900">{formatCurrency(shipment.duties_cost_usd)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('costs.insurance')}</span>
                        <span className="font-medium text-gray-900">{formatCurrency(shipment.insurance_cost_usd)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('costs.demurrage')}</span>
                        <span className="font-medium text-gray-900">{formatCurrency(shipment.demurrage_cost_usd)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('costs.other')}</span>
                        <span className="font-medium text-gray-900">{formatCurrency(shipment.other_costs_usd)}</span>
                      </div>
                    </div>
                    {shipment.total_cost_usd !== undefined && shipment.total_cost_usd !== null && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-sm">
                        <span className="font-semibold text-gray-700">{t('costs.total')}</span>
                        <span className="font-bold text-green-700">{formatCurrency(shipment.total_cost_usd)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">{t('costs.noData')}</p>
                  </div>
                )}
              </section>

              {/* Containers */}
              <section>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  {t('shipmentDetail.containers')} ({containers.length})
                </h3>
                {containersError ? (
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-red-600">{containersError}</p>
                  </div>
                ) : containers.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">{t('shipmentDetail.noContainers')}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('shipmentDetail.containerNumber')}</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('shipmentDetail.pallets')}</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('shipmentDetail.weight')}</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">m²</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {containers.map((container) => (
                          <tr key={container.id}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              {container.container_number || '-'}
                              {container.seal_number && (
                                <span className="block text-xs text-gray-500">{t('shipmentDetail.seal')}: {container.seal_number}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {container.total_pallets ?? '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {container.total_weight_kg ? `${Number(container.total_weight_kg).toLocaleString()} kg` : '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {container.total_m2 ? `${Number(container.total_m2).toLocaleString()} m²` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Timeline */}
              <section>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  {t('shipmentDetail.timeline')} ({events.length})
                </h3>
                {events.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">{t('shipmentDetail.noEvents')}</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                    <div className="space-y-4">
                      {events.map((event, index) => (
                        <div key={event.id} className="relative flex gap-4">
                          <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            index === events.length - 1
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="flex-1 bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(event.status)}`}>
                                {formatStatus(event.status)}
                              </span>
                              <span className="text-xs text-gray-500">{formatDateTime(event.occurred_at)}</span>
                            </div>
                            {event.notes && (
                              <p className="mt-1 text-sm text-gray-600">{event.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Notes */}
              {shipment.notes && (
                <section>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">{t('shipmentDetail.notes')}</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{shipment.notes}</p>
                  </div>
                </section>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Confirm Dialog */}
      {showConfirm && currentTransition && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('shipmentDetail.updateStatus')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('shipmentDetail.changeStatus', {
                from: formatStatus(shipment?.status || ''),
                to: formatStatus(currentTransition.nextStatus)
              })}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={updating}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={updating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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