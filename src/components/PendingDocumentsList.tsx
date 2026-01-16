import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { pendingDocumentsApi } from '../requests/pendingDocuments';
import type { PendingDocument } from '../requests/pendingDocuments';
import { LoadingSpinner } from './LoadingSpinner';

interface PendingDocumentsListProps {
  onSelectDocument: (doc: PendingDocument) => void;
  onClose: () => void;
  onResolve: () => void;
}

export function PendingDocumentsList({ onSelectDocument, onClose, onResolve }: PendingDocumentsListProps) {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const result = await pendingDocumentsApi.list(1, 10);
        setDocuments(result.data);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load pending documents');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const getDocTypeIcon = (docType: string): string => {
    switch (docType.toLowerCase()) {
      case 'hbl':
        return 'H';
      case 'mbl':
        return 'M';
      case 'booking':
        return 'B';
      case 'departure':
        return 'D';
      default:
        return '?';
    }
  };

  const getDocTypeColor = (docType: string): string => {
    switch (docType.toLowerCase()) {
      case 'hbl':
        return 'bg-blue-100 text-blue-700';
      case 'mbl':
        return 'bg-purple-100 text-purple-700';
      case 'booking':
        return 'bg-green-100 text-green-700';
      case 'departure':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getDocumentLabel = (doc: PendingDocument): string => {
    const parsed = doc.parsed_data;
    if (parsed.booking_number?.value) {
      return `Booking: ${parsed.booking_number.value}`;
    }
    if (parsed.shp_number?.value) {
      return `SHP: ${parsed.shp_number.value}`;
    }
    if (parsed.containers?.length > 0) {
      return `${parsed.containers.length} container(s)`;
    }
    return doc.document_type.toUpperCase();
  };

  const handleDiscard = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!confirm(t('pending.discardConfirm'))) {
      return;
    }

    try {
      await pendingDocumentsApi.resolve(docId, { action: 'discard' });
      setDocuments(prev => prev.filter(d => d.id !== docId));
      onResolve();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to discard document');
    }
  };

  return (
    <div className="w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">{t('pending.title')}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-600">{error}</div>
        ) : documents.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">
            {t('pending.noPending')}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer group"
              >
                {/* Doc Type Badge */}
                <div className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${getDocTypeColor(doc.document_type)}`}>
                  {getDocTypeIcon(doc.document_type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getDocumentLabel(doc)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {doc.document_type.toUpperCase()} • {formatTimeAgo(doc.created_at)}
                  </p>
                  {doc.source === 'email' && doc.email_from && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {t('pending.from')}: {doc.email_from}
                    </p>
                  )}
                </div>

                {/* Discard Button */}
                <button
                  onClick={(e) => handleDiscard(e, doc.id)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title={t('pending.discard')}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {documents.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            {t('pending.clickToAssign')}
          </p>
        </div>
      )}
    </div>
  );
}
