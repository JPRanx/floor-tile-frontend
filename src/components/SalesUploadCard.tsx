import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { dataHubApi } from '../requests/dataHub';
import type { SalesPreview, OwnerSalesUploadResponse } from '../requests/dataHub';
import { LoadingSpinner } from './LoadingSpinner';
import { UploadPreviewModal } from './UploadPreviewModal';
import { EditablePreviewTable, formatDateForDisplay } from './uploads/EditablePreviewTable';
import type { EditableColumn } from './uploads/EditablePreviewTable';

type UploadState = 'idle' | 'parsing' | 'preview' | 'confirming' | 'success' | 'error';

interface SalesUploadCardProps {
  lastUpdated?: string | null;
  recordCount?: number;
  onUploadSuccess?: () => void;
}

export function SalesUploadCard({ lastUpdated, recordCount, onUploadSuccess }: SalesUploadCardProps) {
  const { t, i18n } = useTranslation();
  const [, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [preview, setPreview] = useState<SalesPreview | null>(null);
  const [result, setResult] = useState<OwnerSalesUploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modifications, setModifications] = useState<Map<string, Record<string, unknown>>>(new Map());
  const [deletions, setDeletions] = useState<Set<string>>(new Set());

  const isValidFile = (f: File): boolean => {
    return f.name.endsWith('.xlsx') || f.name.endsWith('.xls');
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFile(droppedFile)) {
      setFile(droppedFile);
      setErrorMessage(null);
      handleUpload(droppedFile);
    } else {
      setErrorMessage('Please upload an Excel file (.xlsx or .xls)');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
      setErrorMessage(null);
      handleUpload(selectedFile);
    } else if (selectedFile) {
      setErrorMessage('Please upload an Excel file (.xlsx or .xls)');
    }
  }, []);

  const handleUpload = async (fileToUpload: File) => {
    setUploadState('parsing');
    setErrorMessage(null);
    setResult(null);
    setPreview(null);
    setModalOpen(true);

    try {
      const previewData = await dataHubApi.previewSalesUpload(fileToUpload);
      setPreview(previewData);
      setUploadState('preview');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string }; detail?: string } }; message?: string };
      setErrorMessage(axiosErr.response?.data?.error?.message || axiosErr.response?.data?.detail || 'Parse failed');
      setUploadState('error');
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setUploadState('confirming');
    try {
      const modsArray = Array.from(modifications.entries()).map(([rowKey, changes]) => ({
        row_index: parseInt(rowKey, 10),
        ...(changes.quantity_m2 !== undefined ? { quantity_m2: changes.quantity_m2 as number } : {}),
        ...(changes.customer !== undefined ? { customer: changes.customer as string } : {}),
      }));
      const deletionsArray = Array.from(deletions).map((k) => parseInt(k, 10));

      const payload = modsArray.length > 0 || deletionsArray.length > 0
        ? { modifications: modsArray, deletions: deletionsArray }
        : undefined;

      const res = await dataHubApi.confirmSalesUpload(preview.preview_id, payload);
      setResult(res);
      setUploadState('success');
      onUploadSuccess?.();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string }; detail?: string } }; message?: string };
      setErrorMessage(axiosErr.response?.data?.error?.message || axiosErr.response?.data?.detail || 'Save failed');
      setUploadState('error');
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setFile(null);
    setUploadState('idle');
    setModalOpen(false);
  };

  const handleReset = () => {
    setFile(null);
    setUploadState('idle');
    setPreview(null);
    setResult(null);
    setErrorMessage(null);
    setModifications(new Map());
    setDeletions(new Set());
    setModalOpen(false);
  };

  const handleModalClose = () => {
    handleReset();
  };

  const handleModify = useCallback((rowKey: string, field: string, value: unknown) => {
    setModifications((prev) => {
      const next = new Map(prev);
      const existing = next.get(rowKey) ?? {};
      next.set(rowKey, { ...existing, [field]: value });
      return next;
    });
  }, []);

  const handleDelete = useCallback((rowKey: string) => {
    setDeletions((prev) => {
      const next = new Set(prev);
      next.add(rowKey);
      return next;
    });
  }, []);

  const handleUndoDelete = useCallback((rowKey: string) => {
    setDeletions((prev) => {
      const next = new Set(prev);
      next.delete(rowKey);
      return next;
    });
  }, []);

  const salesColumns: EditableColumn[] = [
    { key: 'week_start', label: 'Semana', editable: false, type: 'text', width: 'w-28' },
    { key: 'sku', label: 'SKU', editable: false, type: 'text', width: 'w-48' },
    { key: 'quantity_m2', label: 'm\u00B2', editable: true, type: 'number', width: 'w-28' },
    { key: 'customer', label: 'Cliente', editable: true, type: 'text', width: 'w-48' },
  ];

  const formatLastUpdated = (): string => {
    if (!lastUpdated) return t('dataHub.never');
    const date = new Date(lastUpdated);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('dataHub.today') + ' ' + date.toLocaleTimeString(i18n.language === 'es' ? 'es' : 'en', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      return t('dataHub.yesterday');
    } else {
      return t('dataHub.daysAgo', { count: diffDays });
    }
  };

  return (
    <>
      {/* Card — always visible on the page */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {t('dataHub.ownerSales.title', 'Reporte de Ventas')}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Reporte semanal de ventas (.xlsx, .xls)
        </p>

        {/* Drag-drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          <label className="cursor-pointer block">
            <svg
              className="mx-auto h-10 w-10 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              {t('dataHub.ownerSales.dropzone', 'Drop Excel file here or click to browse')}
            </p>
            <p className="mt-1 text-xs text-gray-500">Excel (.xlsx, .xls)</p>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
            />
          </label>
        </div>

        {errorMessage && uploadState === 'idle' && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        <div className="mt-4 text-sm text-gray-500">
          <p>{t('dataHub.sales.lastUpload')}: {formatLastUpdated()}</p>
          {recordCount !== undefined && recordCount > 0 && (
            <p>{recordCount.toLocaleString()} {t('dataHub.sales.salesCount')}</p>
          )}
        </div>
      </div>

      {/* Modal — for parsing, preview, confirming, success, error states */}
      <UploadPreviewModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        title={t('dataHub.ownerSales.title', 'Reporte de Ventas')}
      >
        {/* Parsing State */}
        {uploadState === 'parsing' && (
          <div className="py-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">{t('dataHub.ownerSales.parsing', 'Parsing file...')}</p>
          </div>
        )}

        {/* Preview State */}
        {uploadState === 'preview' && preview && (
          <div className="space-y-4">
            {/* Stats Grid — 4 columns for modal space */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">{t('dataHub.ownerSales.rows', 'Rows')}</div>
                <div className="text-lg font-bold text-gray-900">{preview.row_count}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">{t('dataHub.ownerSales.products', 'Products')}</div>
                <div className="text-lg font-bold text-gray-900">{preview.product_count}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">{t('dataHub.ownerSales.totalM2', 'Total m\u00B2')}</div>
                <div className="text-lg font-bold text-gray-900">{preview.total_m2.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">{t('dataHub.ownerSales.dateRange', 'Date Range')}</div>
                <div className="text-sm font-bold text-gray-900">
                  {formatDateForDisplay(preview.date_range_start)} – {formatDateForDisplay(preview.date_range_end)}
                </div>
              </div>
            </div>

            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-sm font-medium text-amber-800">{t('dataHub.ownerSales.warnings', 'Warnings')}</div>
                {preview.warnings.map((w, i) => (
                  <div key={i} className="text-sm text-amber-700 mt-1">{'\u2022'} {w}</div>
                ))}
              </div>
            )}

            {/* Editable Preview Table */}
            <EditablePreviewTable
              rows={(preview.rows ?? preview.sample_rows) as unknown as Record<string, unknown>[]}
              columns={salesColumns}
              rowKeyField="row_index"
              onModify={handleModify}
              onDelete={handleDelete}
              onUndoDelete={handleUndoDelete}
              modifications={modifications}
              deletions={deletions}
            />

            {/* Confirm / Cancel Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                {t('dataHub.ownerSales.confirm', 'Confirm Upload')}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                {t('common.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Confirming State */}
        {uploadState === 'confirming' && (
          <div className="py-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">{t('dataHub.ownerSales.saving', 'Saving...')}</p>
          </div>
        )}

        {/* Success State */}
        {uploadState === 'success' && result && (
          <>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h4 className="font-medium text-green-800">{t('dataHub.ownerSales.successTitle', 'Upload Successful')}</h4>
                  <div className="mt-2 space-y-1 text-sm text-green-700">
                    <p>{result.inserted} {t('dataHub.ownerSales.recordsInserted', 'records inserted')}</p>
                    {result.deleted > 0 && (
                      <p>{result.deleted} {t('dataHub.ownerSales.recordsReplaced', 'previous records replaced')}</p>
                    )}
                    {result.date_range && (
                      <p>{formatDateForDisplay(result.date_range.start)} – {formatDateForDisplay(result.date_range.end)}</p>
                    )}
                    {result.verification && (
                      <p className={result.verification.status === 'VERIFIED' ? 'text-green-800 font-medium' : 'text-amber-700 font-medium'}>
                        {result.verification.status === 'VERIFIED'
                          ? t('dataHub.ownerSales.verified', 'Data verified')
                          : t('dataHub.ownerSales.mismatch', 'Data mismatch detected')}
                      </p>
                    )}
                  </div>
                  {result.warnings.length > 0 && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      {result.warnings.map((w, i) => (
                        <p key={i} className="text-sm text-yellow-700">{w}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="mt-4 w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              {t('dataHub.uploadAnother', 'Upload Another')}
            </button>
          </>
        )}

        {/* Error State */}
        {uploadState === 'error' && (
          <>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800">{t('dataHub.uploadFailed', 'Upload Failed')}</h4>
              <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            </div>
            <button
              onClick={handleReset}
              className="mt-4 w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              {t('common.tryAgain', 'Try Again')}
            </button>
          </>
        )}
      </UploadPreviewModal>
    </>
  );
}
