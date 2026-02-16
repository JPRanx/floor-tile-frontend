import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { productionScheduleApi } from '../requests/productionSchedule';
import type { ProductionPreview, ProductionImportResult } from '../requests/productionSchedule';
import { LoadingSpinner } from './LoadingSpinner';
import { ProductSearchDropdown } from './ProductSearchDropdown';
import { UploadPreviewModal } from './UploadPreviewModal';

type UploadState = 'idle' | 'parsing' | 'preview' | 'confirming' | 'success' | 'error';

interface ProductionUploadCardProps {
  lastUpdated?: string | null;
  recordCount?: number;
  onUploadSuccess?: () => void;
}

export function ProductionUploadCard({ lastUpdated, recordCount, onUploadSuccess }: ProductionUploadCardProps) {
  const { t, i18n } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [preview, setPreview] = useState<ProductionPreview | null>(null);
  const [result, setResult] = useState<ProductionImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [manualMappings, setManualMappings] = useState<Record<string, { productId: string; sku: string }>>({});
  const [modalOpen, setModalOpen] = useState(false);

  const isValidFile = (f: File): boolean => {
    return f.name.endsWith('.xlsx') || f.name.endsWith('.xls') ||
           f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
           f.type === 'application/vnd.ms-excel';
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
      setErrorMessage(t('dataHub.production.pleaseUploadExcel', 'Please upload an Excel file (.xlsx or .xls)'));
    }
  }, [t]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
      setErrorMessage(null);
      handleUpload(selectedFile);
    } else if (selectedFile) {
      setErrorMessage(t('dataHub.production.pleaseUploadExcel', 'Please upload an Excel file (.xlsx or .xls)'));
    }
  }, [t]);

  const handleUpload = async (fileToUpload: File) => {
    setUploadState('parsing');
    setErrorMessage(null);
    setResult(null);
    setPreview(null);
    setModalOpen(true);

    try {
      const previewData = await productionScheduleApi.preview(fileToUpload);
      setPreview(previewData);
      setUploadState('preview');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || err.response?.data?.detail || 'Parse failed');
      setUploadState('error');
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setUploadState('confirming');
    try {
      const mappings = Object.entries(manualMappings)
        .filter(([, v]) => v.productId)
        .map(([key, v]) => ({ original_key: key, mapped_product_id: v.productId }));
      const res = await productionScheduleApi.confirmUpload(preview.preview_id, mappings.length > 0 ? mappings : undefined);
      setResult(res);
      setUploadState('success');
      onUploadSuccess?.();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || err.response?.data?.detail || 'Save failed');
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
    setModalOpen(false);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setFile(null);
    setUploadState('idle');
    setPreview(null);
    setResult(null);
    setErrorMessage(null);
  };

  const formatLastUpdated = (): string => {
    if (!lastUpdated) return t('dataHub.never', 'Never');
    const date = new Date(lastUpdated);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('dataHub.today', 'Today') + ' ' + date.toLocaleTimeString(i18n.language === 'es' ? 'es' : 'en', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      return t('dataHub.yesterday', 'Yesterday');
    } else {
      return t('dataHub.daysAgo', { count: diffDays, defaultValue: `${diffDays} days ago` });
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('dataHub.production.title', 'Production Schedule')}
      </h3>

      {/* Idle State -- Drag-drop zone */}
      {uploadState === 'idle' && (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : file
                ? 'border-green-500 bg-green-50'
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
                {t('dataHub.production.dropzone', 'Drag and drop Excel file or click to browse')}
              </p>
              <p className="mt-1 text-xs text-gray-500">XLSX, XLS</p>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
              />
            </label>
          </div>

          {errorMessage && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {errorMessage}
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500">
            <p>{t('dataHub.production.lastUpload', 'Last upload')}: {formatLastUpdated()}</p>
            {recordCount !== undefined && recordCount > 0 && (
              <p>{recordCount.toLocaleString()} {t('dataHub.production.itemsCount', 'schedule items')}</p>
            )}
          </div>
        </>
      )}

      {/* Preview Modal */}
      <UploadPreviewModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        title={t('dataHub.production.title', 'Production Schedule')}
      >
        {/* Parsing State */}
        {uploadState === 'parsing' && (
          <div className="py-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">{t('dataHub.production.parsing', 'Parsing schedule...')}</p>
          </div>
        )}

        {/* Preview State */}
        {uploadState === 'preview' && preview && (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">{t('dataHub.production.items', 'Items')}</div>
                <div className="text-lg font-bold text-gray-900">{preview.total_rows}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">{t('dataHub.production.matched', 'Matched')}</div>
                <div className="text-lg font-bold text-gray-900">{preview.matched_to_products}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">{t('dataHub.production.unmatched', 'Unmatched')}</div>
                <div className="text-lg font-bold text-gray-900">{preview.unmatched_count}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">{t('dataHub.production.totalM2Requested', 'Total m² Requested')}</div>
                <div className="text-lg font-bold text-gray-900">{preview.total_requested_m2.toLocaleString()}</div>
              </div>
            </div>

            {/* Warning: Will replace existing records */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-sm font-medium text-amber-800">
                {t('dataHub.production.replaceWarning', 'This will replace {{count}} existing schedule items', { count: preview.existing_records_to_delete })}
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-blue-900 mb-3">
                {t('dataHub.production.statusBreakdown', 'Status Breakdown')}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">
                    {t('dataHub.production.scheduled', 'Scheduled')}
                  </span>
                  <span className="font-bold text-blue-900">{preview.status_breakdown.scheduled || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">
                    {t('dataHub.production.inProgress', 'In Progress')}
                  </span>
                  <span className="font-bold text-blue-900">{preview.status_breakdown.in_progress || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">
                    {t('dataHub.production.completed', 'Completed')}
                  </span>
                  <span className="font-bold text-blue-900">{preview.status_breakdown.completed || 0}</span>
                </div>
              </div>
            </div>

            {/* Unmatched Referencias -- Interactive Mapping */}
            {preview.unmatched_referencias.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <button
                  onClick={() => setShowUnmatched(!showUnmatched)}
                  className="text-sm text-red-700 hover:text-red-900 font-medium"
                >
                  {showUnmatched ? '▼' : '▶'} {preview.unmatched_referencias.length} {t('dataHub.production.unmatchedItems', 'unmatched items')}
                </button>
                {showUnmatched && (
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    <p className="text-xs text-red-600">{t('dataHub.production.mapToProduct', 'Map to an existing product:')}</p>
                    {preview.unmatched_referencias.map((ref, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-red-700 flex-1 truncate" title={ref}>• {ref}</span>
                        <ProductSearchDropdown
                          onSelect={(productId, sku) =>
                            setManualMappings((prev) => ({
                              ...prev,
                              [ref]: { productId, sku },
                            }))
                          }
                          selectedSku={manualMappings[ref]?.sku || null}
                          placeholder={t('dataHub.production.searchProduct', 'Search...')}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Additional Warnings */}
            {preview.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-sm font-medium text-amber-800">{t('dataHub.production.warnings', 'Warnings')}</div>
                {preview.warnings.map((w, i) => (
                  <div key={i} className="text-sm text-amber-700 mt-1">• {w}</div>
                ))}
              </div>
            )}

            {/* Sample Rows Table */}
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-1 text-left">{t('dataHub.production.referencia', 'Referencia')}</th>
                    <th className="px-2 py-1 text-left">{t('dataHub.production.sku', 'SKU')}</th>
                    <th className="px-2 py-1 text-left">{t('dataHub.production.plant', 'Plant')}</th>
                    <th className="px-2 py-1 text-right">{t('dataHub.production.requestedM2', 'Requested m²')}</th>
                    <th className="px-2 py-1 text-left">{t('dataHub.production.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.sample_rows.map((row, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1">{row.referencia}</td>
                      <td className="px-2 py-1">{row.sku || '—'}</td>
                      <td className="px-2 py-1">{row.plant}</td>
                      <td className="px-2 py-1 text-right">{row.requested_m2.toLocaleString()}</td>
                      <td className="px-2 py-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          row.status === 'completed' ? 'bg-green-100 text-green-800' :
                          row.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Confirm / Cancel Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                {t('dataHub.production.confirm', 'Confirm Upload')}
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
            <p className="mt-4 text-gray-600">{t('dataHub.production.replacing', 'Replacing schedule...')}</p>
          </div>
        )}

        {/* Success State */}
        {uploadState === 'success' && result && (
          <>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h4 className="font-medium text-green-800">{t('dataHub.production.successTitle', 'Upload Successful')}</h4>
                  <div className="mt-2 space-y-1 text-sm text-green-700">
                    <p>{result.matched_to_products} {t('dataHub.production.itemsMatched', 'items matched to products')}</p>
                    <p>{t('dataHub.production.statusCounts', 'Status: {{scheduled}} scheduled, {{inProgress}} in progress, {{completed}} completed', {
                      scheduled: result.scheduled_count,
                      inProgress: result.in_progress_count,
                      completed: result.completed_count
                    })}</p>
                    <p>{t('dataHub.production.totalM2', 'Total: {{requested}} m² requested, {{completed}} m² completed', {
                      requested: result.total_requested_m2.toLocaleString(),
                      completed: result.total_completed_m2.toLocaleString()
                    })}</p>
                    {result.unmatched_referencias.length > 0 && (
                      <p className="text-amber-700">
                        {result.unmatched_referencias.length} {t('dataHub.production.unmatchedWarning', 'items could not be matched')}
                      </p>
                    )}
                  </div>
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
    </div>
  );
}
