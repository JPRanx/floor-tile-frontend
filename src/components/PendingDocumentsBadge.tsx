import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { pendingDocumentsApi } from '../requests/pendingDocuments';
import type { PendingDocument } from '../requests/pendingDocuments';
import { PendingDocumentsList } from './PendingDocumentsList';

interface PendingDocumentsBadgeProps {
  onSelectDocument: (doc: PendingDocument) => void;
  refreshTrigger?: number;
}

export function PendingDocumentsBadge({ onSelectDocument, refreshTrigger }: PendingDocumentsBadgeProps) {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    try {
      const result = await pendingDocumentsApi.getCount();
      setCount(result.pending_count);
    } catch (err) {
      console.error('Failed to fetch pending count:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();

    // Poll every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Refresh when trigger changes (after resolution)
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      fetchCount();
    }
  }, [refreshTrigger, fetchCount]);

  const handleSelectDocument = (doc: PendingDocument) => {
    setIsOpen(false);
    onSelectDocument(doc);
  };

  const handleResolve = () => {
    fetchCount();
  };

  // Don't show badge if loading or no pending docs
  if (loading || count === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span>{t('pending.badge', { count })}</span>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 z-50">
            <PendingDocumentsList
              onSelectDocument={handleSelectDocument}
              onClose={() => setIsOpen(false)}
              onResolve={handleResolve}
            />
          </div>
        </>
      )}
    </div>
  );
}
