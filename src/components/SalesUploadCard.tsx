import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { dataHubApi } from '../requests/dataHub';
import type { SalesPreview, OwnerSalesUploadResponse } from '../requests/dataHub';
import { LoadingSpinner } from './LoadingSpinner';

type UploadState = 'idle' | 'parsing' | 'preview' | 'confirming' | 'success' | 'error';

interface SalesUploadCardProps {
  lastUpdated?: string | null;
  recordCount?: number;
  onUploadSuccess?: () => void;
}

export function SalesUploadCard({ lastUpdated, recordCount, onUploadSuccess }: SalesUploadCardProps) {
  const { t, i18n } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [preview, setPreview] = useState<SalesPreview | null>(null);
  const [result, setResult] = useState<OwnerSalesUploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    try {
      const previewData = await dataHubApi.previewSalesUpload(fileToUpload);
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
      const res = await dataHubApi.confirmSalesUpload(preview.preview_id);
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
  };

  const handleReset = () => {
    setFile(null);
    setUploadState('idle');
    setPreview(null);
    setResult(null);
    setErrorMessage(null);
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
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('dataHub.ownerSales.title', 'Reporte de Ventas')}
      </h3>

      {/* Idle State — Drag-drop zone */}
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

          {errorMessage && (
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
        </>
      )}

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
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
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
                {preview.date_range_start} – {preview.date_range_end}
              </div>
            </div>
          </div>

          {/* Warnings */}
          {preview.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-sm font-medium text-amber-800">{t('dataHub.ownerSales.warnings', 'Warnings')}</div>
              {preview.warnings.map((w, i) => (
                <div key={i} className="text-sm text-amber-700 mt-1">• {w}</div>
              ))}
            </div>
          )}

          {/* Sample Rows Table */}
          <div className="overflow-auto max-h-48">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 text-left">SKU</th>
                  <th className="px-2 py-1 text-left">{t('dataHub.ownerSales.date', 'Date')}</th>
                  <th className="px-2 py-1 text-right">m²</th>
                  <th className="px-2 py-1 text-left">{t('dataHub.ownerSales.customer', 'Customer')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.sample_rows.map((row, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1">{row.sku}</td>
                    <td className="px-2 py-1">{row.week_start}</td>
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
                    <p>{result.date_range.start} – {result.date_range.end}</p>
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
    </div>
  );
}
