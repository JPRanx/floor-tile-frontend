import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { dataHubApi } from '../requests/dataHub';
import type { SACPreview, SACUploadResponse } from '../requests/dataHub';
import { LoadingSpinner } from './LoadingSpinner';
import { UploadPreviewModal } from './UploadPreviewModal';
import { ParseDiagnosticPanel } from './uploads/ParseDiagnosticPanel';

type UploadState = 'idle' | 'parsing' | 'preview' | 'confirming' | 'success' | 'error';

interface SACUploadCardProps {
  lastUpdated?: string | null;
  recordCount?: number;
  onUploadSuccess?: () => void;
}

export function SACUploadCard({ lastUpdated, recordCount, onUploadSuccess }: SACUploadCardProps) {
  const { t, i18n } = useTranslation();
  const [, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [preview, setPreview] = useState<SACPreview | null>(null);
  const [result, setResult] = useState<SACUploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [foundColumns, setFoundColumns] = useState<string[]>([]);
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const isValidFile = (f: File): boolean => {
    return f.name.endsWith('.csv') || f.name.endsWith('.xls') || f.name.endsWith('.xlsx') || f.type === 'text/csv';
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
      setErrorMessage(t('dataHub.sales.pleaseUploadFile'));
    }
  }, [t]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
      setErrorMessage(null);
      handleUpload(selectedFile);
    } else if (selectedFile) {
      setErrorMessage(t('dataHub.sales.pleaseUploadFile'));
    }
  }, [t]);

  const handleUpload = async (fileToUpload: File) => {
    setUploadState('parsing');
    setErrorMessage(null);
    setResult(null);
    setPreview(null);
    setModalOpen(true);

    try {
      const previewData = await dataHubApi.previewSACUpload(fileToUpload);
      setPreview(previewData);
      setUploadState('preview');
    } catch (err: any) {
      const details = err.response?.data?.error?.details;
      if (details?.missing_columns) setMissingColumns(details.missing_columns);
      if (details?.found_columns) setFoundColumns(details.found_columns);
      setErrorMessage(err.response?.data?.error?.message || err.response?.data?.detail || 'Parse failed');
      setUploadState('error');
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setUploadState('confirming');
    try {
      const res = await dataHubApi.confirmSACUpload(preview.preview_id);
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
    setMissingColumns([]);
    setFoundColumns([]);
    setModalOpen(false);
  };

  const handleModalClose = () => {
    handleReset();
  };

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
          {t('dataHub.sales.title')}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Ventas SAC (.csv, .xls, .xlsx)
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
              {t('dataHub.sales.dropzone')}
            </p>
            <p className="mt-1 text-xs text-gray-500">CSV, XLS, XLSX</p>
            <input
              type="file"
              className="hidden"
              accept=".csv,.xls,.xlsx"
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
        title={t('dataHub.sales.title')}
      >
        {/* Parsing State */}
        {uploadState === 'parsing' && (
          <div className="py-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">{t('dataHub.sales.parsing', 'Parsing file...')}</p>
          </div>
        )}

        {/* Preview State */}
        {uploadState === 'preview' && preview && (
          <div className="space-y-4">
            {/* Stats Grid — 4 columns for modal space */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">{t('dataHub.sales.rows', 'Rows')}</div>
                <div className="text-lg font-bold text-gray-900">{preview.row_count}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">{t('dataHub.sales.totalM2', 'Total m\u00B2')}</div>
                <div className="text-lg font-bold text-gray-900">{(preview.total_m2 ?? 0).toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">{t('dataHub.sales.customers', 'Customers')}</div>
                <div className="text-lg font-bold text-gray-900">{preview.unique_customers}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">{t('dataHub.sales.dateRange', 'Date Range')}</div>
                <div className="text-sm font-bold text-gray-900">
                  {preview.date_range_start} – {preview.date_range_end}
                </div>
              </div>
            </div>

            {/* Match Stats Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-blue-900 mb-3">
                {t('dataHub.sales.matchStats', 'Match Statistics')}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-green-700">
                    <span className="mr-2">{'\u2705'}</span>
                    {t('dataHub.sales.matchedBySacSku', 'Matched by SAC SKU')}
                  </span>
                  <span className="font-bold text-green-900">{preview.matched_by_sac_sku}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-700">
                    <span className="mr-2">{'\u26A0\uFE0F'}</span>
                    {t('dataHub.sales.matchedByName', 'Matched by name')}
                  </span>
                  <span className="font-bold text-amber-900">{preview.matched_by_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-700">
                    <span className="mr-2">{'\u274C'}</span>
                    {t('dataHub.sales.unmatched', 'Unmatched')}
                  </span>
                  <span className="font-bold text-red-900">{preview.unmatched_count}</span>
                </div>
                <div className="flex items-center justify-between border-t border-blue-300 pt-2 mt-2">
                  <span className="text-blue-900 font-medium">
                    {t('dataHub.sales.matchRate', 'Match Rate')}
                  </span>
                  <span className="font-bold text-blue-900">{preview.match_rate_pct}%</span>
                </div>
              </div>

              {/* Unmatched Products Expandable List */}
              {preview.unmatched_products.length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-300">
                  <button
                    onClick={() => setShowUnmatched(!showUnmatched)}
                    className="text-sm text-blue-700 hover:text-blue-900 font-medium"
                  >
                    {showUnmatched ? '\u25BC' : '\u25B6'} {preview.unmatched_products.length} {t('dataHub.sales.unmatchedProducts', 'unmatched products')}
                  </button>
                  {showUnmatched && (
                    <div className="mt-2 bg-white rounded p-2 text-xs text-gray-700">
                      {preview.unmatched_products.map((product, i) => (
                        <div key={i} className="py-0.5">{'\u2022'} {product}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Skipped Non-Tile Warning */}
              {preview.skipped_non_tile > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-300 text-sm text-amber-700">
                  <span className="mr-2">{'\u26A0\uFE0F'}</span>
                  {preview.skipped_non_tile} {t('dataHub.sales.nonTileFiltered', 'non-tile products filtered')}
                </div>
              )}
            </div>

            {/* Warnings Section */}
            {preview.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-sm font-medium text-amber-800">{t('dataHub.sales.warnings', 'Warnings')}</div>
                {preview.warnings.map((w, i) => (
                  <div key={i} className="text-sm text-amber-700 mt-1">{'\u2022'} {w}</div>
                ))}
              </div>
            )}

            {/* Sample Rows Table — no inline max-h, modal handles scrolling */}
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-1 text-left">SKU</th>
                    <th className="px-2 py-1 text-left">{t('dataHub.sales.date', 'Date')}</th>
                    <th className="px-2 py-1 text-right">m²</th>
                    <th className="px-2 py-1 text-left">{t('dataHub.sales.customer', 'Customer')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.sample_rows.map((row, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1">{row.sku}</td>
                      <td className="px-2 py-1">{row.sale_date}</td>
                      <td className="px-2 py-1 text-right">{row.quantity_m2}</td>
                      <td className="px-2 py-1 text-gray-500">{row.customer || '\u2014'}</td>
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
                {t('dataHub.sales.confirm', 'Confirm Upload')}
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
            <p className="mt-4 text-gray-600">{t('dataHub.sales.saving', 'Saving...')}</p>
          </div>
        )}

        {/* Success State */}
        {uploadState === 'success' && result && (
          <>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h4 className="font-medium text-green-800">{t('dataHub.sales.successTitle', 'Upload Successful')}</h4>
                  <div className="mt-2 space-y-1 text-sm text-green-700">
                    <p>{result.created} {t('dataHub.sales.recordsCreated', 'records created')}</p>
                    {result.deleted > 0 && (
                      <p>{result.deleted} {t('dataHub.sales.recordsDeleted', 'records replaced')}</p>
                    )}
                    {result.date_range_start && result.date_range_end && (
                      <p>{result.date_range_start} – {result.date_range_end}</p>
                    )}
                    <p className="font-medium text-green-800">
                      {result.unique_customers} {t('dataHub.sales.uniqueCustomers', 'unique customers')} · {(result.total_m2_sold ?? 0).toLocaleString()} m²
                    </p>
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
          <ParseDiagnosticPanel
            errorMessage={errorMessage || t('dataHub.uploadFailed', 'Upload Failed')}
            missingColumns={missingColumns}
            foundColumns={foundColumns}
            onRetry={handleReset}
          />
        )}
      </UploadPreviewModal>
    </>
  );
}
