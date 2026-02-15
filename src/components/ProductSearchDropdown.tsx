import { useState, useRef, useEffect, useCallback } from 'react';
import { productsApi } from '../requests/products';
import type { Product } from '../requests/products';

interface ProductSearchDropdownProps {
  onSelect: (productId: string, sku: string) => void;
  selectedSku?: string | null;
  placeholder?: string;
}

export function ProductSearchDropdown({ onSelect, selectedSku, placeholder = 'Search product...' }: ProductSearchDropdownProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const products = await productsApi.searchProducts(q, 10);
      setResults(products);
      setIsOpen(products.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = (product: Product) => {
    onSelect(product.id, product.sku);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect('', '');
    setQuery('');
    setIsOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (selectedSku) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">
          {selectedSku}
        </span>
        <button
          onClick={handleClear}
          className="text-xs text-gray-400 hover:text-red-500"
          title="Clear"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        className="w-36 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
      />
      {loading && (
        <div className="absolute right-2 top-1.5">
          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-100 last:border-0"
            >
              <span className="font-medium">{product.sku}</span>
              <span className="text-gray-400 ml-1">({product.category})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
