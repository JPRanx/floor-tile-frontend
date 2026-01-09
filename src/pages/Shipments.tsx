import { useState, useEffect, useMemo } from 'react';
import { shipmentsApi } from '../requests/shipments';
import type { Shipment } from '../requests/shipments';
import { ShipmentUploadModal } from '../components/ShipmentUploadModal';
import { ShipmentDetailPanel } from '../components/ShipmentDetailPanel';
import { LoadingSpinner } from '../components/LoadingSpinner';

type SortField = 'shp_number' | 'etd' | 'eta' | 'status';
type SortDirection = 'asc' | 'desc';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'AT_FACTORY', label: 'At Factory' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'AT_DESTINATION_PORT', label: 'At Port' },
  { value: 'IN_CUSTOMS', label: 'In Customs' },
  { value: 'DELIVERED', label: 'Delivered' },
];

export function Shipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('eta');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const loadShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await shipmentsApi.list();
      setShipments(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  // Filter and sort shipments
  const filteredShipments = useMemo(() => {
    let result = [...shipments];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(s =>
        s.shp_number?.toLowerCase().includes(query) ||
        s.booking_number?.toLowerCase().includes(query) ||
        s.vessel_name?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter) {
      result = result.filter(s => s.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (sortField) {
        case 'shp_number':
          aVal = a.shp_number || '';
          bVal = b.shp_number || '';
          break;
        case 'etd':
          aVal = a.etd ? new Date(a.etd).getTime() : 0;
          bVal = b.etd ? new Date(b.etd).getTime() : 0;
          break;
        case 'eta':
          aVal = a.eta ? new Date(a.eta).getTime() : 0;
          bVal = b.eta ? new Date(b.eta).getTime() : 0;
          break;
        case 'status':
          // Custom status order
          const statusOrder: Record<string, number> = {
            AT_FACTORY: 1,
            IN_TRANSIT: 2,
            AT_DESTINATION_PORT: 3,
            IN_CUSTOMS: 4,
            DELIVERED: 5,
          };
          aVal = statusOrder[a.status] || 99;
          bVal = statusOrder[b.status] || 99;
          break;
      }

      if (aVal === null || bVal === null) return 0;
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [shipments, searchQuery, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getDaysUntilArrival = (eta?: string, status?: string): { text: string; color: string } => {
    if (status === 'DELIVERED') {
      return { text: 'Delivered', color: 'text-green-600' };
    }
    if (!eta) {
      return { text: '-', color: 'text-gray-400' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const arrivalDate = new Date(eta);
    arrivalDate.setHours(0, 0, 0, 0);

    const diffTime = arrivalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { text: 'Today', color: 'text-blue-600 font-medium' };
    } else if (diffDays === 1) {
      return { text: 'Tomorrow', color: 'text-blue-600' };
    } else if (diffDays > 1) {
      return { text: `${diffDays} days`, color: 'text-gray-600' };
    } else if (diffDays === -1) {
      return { text: '1 day ago', color: 'text-orange-600' };
    } else {
      return { text: `${Math.abs(diffDays)} days ago`, color: 'text-red-600' };
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your shipments from factory to warehouse
          </p>
        </div>
        <button
          onClick={() => setUploadModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Document
          </span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by SHP, booking, or vessel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Results Count */}
      {!loading && shipments.length > 0 && (
        <div className="text-sm text-gray-500">
          Showing {filteredShipments.length} of {shipments.length} shipments
          {(searchQuery || statusFilter) && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter(''); }}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : shipments.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No shipments</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by uploading a shipment document.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Upload Document
            </button>
          </div>
        </div>
      ) : filteredShipments.length === 0 ? (
        /* No Results */
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No matching shipments</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search or filter criteria.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter(''); }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        /* Shipments Table */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('shp_number')}
                >
                  <div className="flex items-center gap-1">
                    SHP Number
                    <SortIcon field="shp_number" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vessel
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('eta')}
                >
                  <div className="flex items-center gap-1">
                    ETA
                    <SortIcon field="eta" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Arrives
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    <SortIcon field="status" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredShipments.map((shipment) => {
                const arrival = getDaysUntilArrival(shipment.eta, shipment.status);
                return (
                  <tr
                    key={shipment.id}
                    onClick={() => setSelectedShipmentId(shipment.id)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {shipment.shp_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {shipment.booking_number || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {shipment.vessel_name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(shipment.eta)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${arrival.color}`}>
                        {arrival.text}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(shipment.status)}`}>
                        {formatStatus(shipment.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      <ShipmentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {
          setUploadModalOpen(false);
          loadShipments();
        }}
      />

      {/* Detail Panel */}
      {selectedShipmentId && (
        <ShipmentDetailPanel
          shipmentId={selectedShipmentId}
          onClose={() => setSelectedShipmentId(null)}
          onStatusChange={loadShipments}
        />
      )}
    </div>
  );
}