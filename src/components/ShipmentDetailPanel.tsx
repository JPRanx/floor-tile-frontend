import { useState, useEffect } from 'react';
import { shipmentsApi, portsApi } from '../requests/shipments';
import type { Shipment, Container, ShipmentEvent, Port } from '../requests/shipments';
import { LoadingSpinner } from './LoadingSpinner';

interface ShipmentDetailPanelProps {
  shipmentId: string | null;
  onClose: () => void;
}

export function ShipmentDetailPanel({ shipmentId, onClose }: ShipmentDetailPanelProps) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [events, setEvents] = useState<ShipmentEvent[]>([]);
  const [ports, setPorts] = useState<Record<string, Port>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      try {
        // Fetch all data in parallel
        const [shipmentData, containersData, eventsData, portsData] = await Promise.all([
          shipmentsApi.getById(shipmentId),
          shipmentsApi.getContainers(shipmentId),
          shipmentsApi.getEvents(shipmentId),
          portsApi.list(),
        ]);

        setShipment(shipmentData);
        setContainers(containersData);
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
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load shipment details');
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
      return date.toLocaleDateString('en-US', {
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
      return date.toLocaleString('en-US', {
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
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getPortName = (portId?: string): string => {
    if (!portId) return '-';
    const port = ports[portId];
    return port ? `${port.name}, ${port.country}` : portId;
  };

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
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
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
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Shipment Info</h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Booking Number</p>
                    <p className="text-sm font-medium text-gray-900">{shipment.booking_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Bill of Lading</p>
                    <p className="text-sm font-medium text-gray-900">{shipment.bill_of_lading || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Vessel</p>
                    <p className="text-sm font-medium text-gray-900">{shipment.vessel_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Voyage</p>
                    <p className="text-sm font-medium text-gray-900">{shipment.voyage_number || '-'}</p>
                  </div>
                </div>
              </section>

              {/* Ports */}
              <section>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Route</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Origin</p>
                      <p className="text-sm font-medium text-gray-900">{getPortName(shipment.origin_port_id)}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-xs text-gray-500">Destination</p>
                      <p className="text-sm font-medium text-gray-900">{getPortName(shipment.destination_port_id)}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Dates */}
              <section>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Schedule</h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">ETD (Estimated)</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(shipment.etd)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">ETA (Estimated)</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(shipment.eta)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">ATD (Actual Departure)</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(shipment.actual_departure)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">ATA (Actual Arrival)</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(shipment.actual_arrival)}</p>
                  </div>
                </div>
              </section>

              {/* Containers */}
              <section>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Containers ({containers.length})
                </h3>
                {containers.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">No containers assigned</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Container</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Pallets</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Weight</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">m2</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {containers.map((container) => (
                          <tr key={container.id}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              {container.container_number || '-'}
                              {container.seal_number && (
                                <span className="block text-xs text-gray-500">Seal: {container.seal_number}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {container.total_pallets ?? '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {container.total_weight_kg ? `${Number(container.total_weight_kg).toLocaleString()} kg` : '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {container.total_m2 ? `${Number(container.total_m2).toLocaleString()} m2` : '-'}
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
                  Timeline ({events.length})
                </h3>
                {events.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">No events recorded</p>
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
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{shipment.notes}</p>
                  </div>
                </section>
              )}
            </div>
          ) : null}
        </div>
      </div>

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