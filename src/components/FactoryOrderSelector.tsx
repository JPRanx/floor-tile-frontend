import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { factoryOrdersApi } from '../requests/factoryOrders';
import type { FactoryOrder } from '../requests/factoryOrders';
import { formatDateWithYear } from '../utils/dateUtils';

interface FactoryOrderSelectorProps {
  value: string | null; // factory_order_id
  onChange: (factoryOrderId: string | null, pvNumber: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function FactoryOrderSelector({
  value,
  onChange,
  disabled = false,
  placeholder,
}: FactoryOrderSelectorProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<FactoryOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<FactoryOrder | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load selected order when value changes externally
  useEffect(() => {
    if (value && !selectedOrder) {
      // Fetch the order details to display
      factoryOrdersApi.getById(value)
        .then((order) => {
          setSelectedOrder(order);
          setSearchQuery(order.pv_number || '');
        })
        .catch(() => {
          // Order not found, clear selection
          setSelectedOrder(null);
          setSearchQuery('');
        });
    } else if (!value) {
      setSelectedOrder(null);
      setSearchQuery('');
    }
  }, [value, selectedOrder]);

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const orders = await factoryOrdersApi.search(query, 10, true);
      setResults(orders);
    } catch (err) {
      console.error('Failed to search factory orders:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsOpen(true);

    // Clear selection when user types
    if (selectedOrder) {
      setSelectedOrder(null);
      onChange(null, null);
    }

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  const handleSelect = (order: FactoryOrder) => {
    setSelectedOrder(order);
    setSearchQuery(order.pv_number || '');
    setIsOpen(false);
    onChange(order.id, order.pv_number);
  };

  const handleClear = () => {
    setSelectedOrder(null);
    setSearchQuery('');
    setResults([]);
    onChange(null, null);
    inputRef.current?.focus();
  };

  const formatDate = (dateStr: string): string => {
    return formatDateWithYear(dateStr, 'en-US');
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      IN_PRODUCTION: 'bg-purple-100 text-purple-800',
      READY: 'bg-green-100 text-green-800',
      SHIPPED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {t('shipmentUpload.factoryOrder')}
        <span className="ml-1 text-gray-400">({t('shipmentUpload.optional')})</span>
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          placeholder={placeholder || t('shipmentUpload.searchFactoryOrder')}
          className={`w-full px-3 py-2 pr-10 border rounded text-sm ${
            disabled
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          }`}
        />

        {/* Loading spinner or clear button */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          {loading ? (
            <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : selectedOrder ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Selected order preview */}
      {selectedOrder && (
        <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
          <div className="flex justify-between items-center">
            <span className="font-medium text-blue-800">{selectedOrder.pv_number}</span>
            <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusColor(selectedOrder.status)}`}>
              {selectedOrder.status}
            </span>
          </div>
          <div className="text-blue-600 mt-0.5">
            {formatDate(selectedOrder.order_date)} &middot; {selectedOrder.item_count} {t('shipmentUpload.items')} &middot; {selectedOrder.total_m2?.toLocaleString()} m&sup2;
          </div>
        </div>
      )}

      {/* Dropdown results */}
      {isOpen && !selectedOrder && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 text-center">
              {searchQuery.length < 2
                ? t('shipmentUpload.typeToSearch')
                : loading
                  ? t('common.loading')
                  : t('shipmentUpload.noFactoryOrdersFound')}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => handleSelect(order)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-gray-900">{order.pv_number}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {formatDate(order.order_date)}
                      </span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {order.item_count} {t('shipmentUpload.items')} &middot; {order.total_m2?.toLocaleString()} m&sup2;
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
