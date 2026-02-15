import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { dataHubApi } from '../requests/dataHub';
import type { SIESAPreview, SIESAUploadResponse } from '../requests/dataHub';
import { LoadingSpinner } from './LoadingSpinner';

type UploadState = 'idle' | 'parsing' | 'preview' | 'confirming' | 'success' | 'error';

interface SIESAUploadCardProps {
  lastUpdated?: string | null;
  recordCount?: number;
  onUploadSuccess?: () => void;
}

export function SIESAUploadCard({ lastUpdated, recordCount, onUploadSuccess }: SIESAUploadCardProps) {
  const { t, i18n } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [preview, setPreview] = useState<SIESAPreview | null>(null);
  const [result, setResult] = useState<SIESAUploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUnmatchedList, setShowUnmatchedList] = useState(false);

  const isValidFile = (file: File): boolean => {
    return (
      file.name.endsWith('.xls') ||
      file.name.endsWith('.xlsx') ||
      file.type === 'application/vnd.ms-excel' ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
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
      setErrorMessage(t('dataHub.inventory.pleaseUploadXLS'));
    }
  }, [t]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
      setErrorMessage(null);
      handleUpload(selectedFile);
    } else if (selectedFile) {
      setErrorMessage(t('dataHub.inventory.pleaseUploadXLS'));
    }
  }, [t]);

  const handleUpload = async (fileToUpload: File) => {
    setUploadState('parsing');
    setErrorMessage(null);
    setResult(null);
    setPreview(null);

    try {
      const previewData = await dataHubApi.previewSIESA(fileToUpload);
      setPreview(previewData);
      setUploadState('preview');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message || t('dataHub.uploadFailed')
      );
      setUploadState('error');
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setUploadState('confirming');

    try {
      const uploadResult = await dataHubApi.confirmSIESA(preview.preview_id);
      setResult(uploadResult);
      setUploadState('success');
      onUploadSuccess?.();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message || t('dataHub.uploadFailed')
      );
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
    setShowUnmatchedList(false);
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
        {t('dataHub.inventory.title')}
      </h3>

      {/* Idle State */}
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
                {t('dataHub.inventory.dropzone')}
              </p>
              <p className="mt-1 text-xs text-gray-500">XLS / XLSX</p>
              <input
                type="file"
                className="hidden"
                accept=".xls,.xlsx"
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
            <p>{t('dataHub.inventory.lastUpload')}: {formatLastUpdated()}</p>
            {recordCount !== undefined && recordCount > 0 && (
              <p>{recordCount.toLocaleString()} {t('dataHub.inventory.lotsCount')}</p>
            )}
          </div>
        </>
      )}

      {/* Parsing State */}
      {uploadState === 'parsing' && (
        <div className="py-8 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">{t('dataHub.inventory.parsing', 'Parsing file...')}</p>
        </div>
      )}

      {/* Preview State */}
      {uploadState === 'preview' && preview && (
        <div className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-500">{t('dataHub.inventory.totalRows', 'Total Rows')}</div>
              <div className="text-lg font-bold text-gray-900">{preview.total_rows}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-500">{t('dataHub.inventory.lotsCount', 'Lots')}</div>
              <div className="text-lg font-bold text-gray-900">{preview.lots_count}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-500">{t('dataHub.inventory.products', 'Products')}</div>
              <div className="text-lg font-bold text-gray-900">{preview.unique_products}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-500">{t('dataHub.inventory.totalM2', 'Total m²')}</div>
              <div className="text-lg font-bold text-gray-900">{preview.total_m2_available.toLocaleString()}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-500">{t('dataHub.inventory.totalWeight', 'Total Weight (kg)')}</div>
              <div className="text-lg font-bold text-gray-900">{preview.total_weight_kg.toLocaleString()}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-500">{t('dataHub.inventory.containers', 'Containers')}</div>
              <div className="text-lg font-bold text-gray-900">
                {preview.containers_needed} ({preview.container_utilization_pct.toFixed(1)}%)
              </div>
            </div>
          </div>

          {/* Match Stats Section */}
          <div className="space-y-2">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-sm font-medium text-green-800">
                {t('dataHub.inventory.matchedBySIESA', { count: preview.matched_by_siesa_item, defaultValue: '{{count}} matched by SIESA item' })}
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-sm font-medium text-amber-800">
                {t('dataHub.inventory.matchedByName', { count: preview.matched_by_name, defaultValue: '{{count}} matched by name' })}
              </div>
            </div>
            {preview.unmatched_count > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-red-800">
                    {t('dataHub.inventory.unmatched', { count: preview.unmatched_count, defaultValue: '{{count}} unmatched' })}
                  </div>
                  <button
                    onClick={() => setShowUnmatchedList(!showUnmatchedList)}
                    className="text-xs text-red-700 hover:text-red-900"
                  >
                    {showUnmatchedList ? t('common.hide', 'Hide') : t('common.show', 'Show')}
                  </button>
                </div>
                {showUnmatchedList && (
                  <div className="mt-2 max-h-32 overflow-auto">
                    <div className="text-xs text-red-700 space-y-1">
                      {preview.unmatched_products.map((prod, i) => (
                        <div key={i}>• {prod}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="text-sm text-gray-600 text-center">
              {t('dataHub.inventory.matchRate', { rate: preview.match_rate_pct.toFixed(1), defaultValue: 'Match rate: {{rate}}%' })}
            </div>
          </div>

          {/* Warehouse Breakdown */}
          {preview.warehouses.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">
                {t('dataHub.inventory.warehouseBreakdown', 'Warehouse Breakdown')}
              </div>
              <div className="overflow-auto max-h-32">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1 text-left">{t('dataHub.inventory.warehouse', 'Warehouse')}</th>
                      <th className="px-2 py-1 text-right">m²</th>
                      <th className="px-2 py-1 text-right">kg</th>
                      <th className="px-2 py-1 text-right">{t('dataHub.inventory.lots', 'Lots')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.warehouses.map((wh, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1">{wh.name}</td>
                        <td className="px-2 py-1 text-right">{wh.total_m2.toLocaleString()}</td>
                        <td className="px-2 py-1 text-right">{wh.total_weight_kg.toLocaleString()}</td>
                        <td className="px-2 py-1 text-right">{wh.lot_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sample Lots Table */}
          <div className="overflow-auto max-h-48">
            <div className="text-sm font-medium text-gray-700 mb-2">
              {t('dataHub.inventory.sampleLots', 'Sample Lots')}
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 text-left">SKU</th>
                  <th className="px-2 py-1 text-left">{t('dataHub.inventory.warehouse', 'Warehouse')}</th>
                  <th className="px-2 py-1 text-left">{t('dataHub.inventory.lot', 'Lot')}</th>
                  <th className="px-2 py-1 text-right">m²</th>
                  <th className="px-2 py-1 text-right">kg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.sample_lots.map((lot, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1">{lot.sku}</td>
                    <td className="px-2 py-1 text-gray-500">{lot.warehouse_name || '—'}</td>
                    <td className="px-2 py-1">{lot.lot_number}</td>
                    <td className="px-2 py-1 text-right">{lot.quantity_m2}</td>
                    <td className="px-2 py-1 text-right">{lot.weight_kg || '—'}</td>
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
              {t('dataHub.inventory.confirmUpload', 'Confirm Upload')}
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
          <p className="mt-4 text-gray-600">{t('dataHub.inventory.saving', 'Saving...')}</p>
        </div>
      )}

      {/* Success State */}
      {uploadState === 'success' && result && (
        <>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-green-800">
                  {t('dataHub.inventory.successTitle', 'Upload Successful')}
                </h4>
                <div className="mt-2 space-y-1 text-sm text-green-700">
                  <p>{result.lots_created} {t('dataHub.inventory.lotsCreated', 'lots created')}</p>
                  <p>{result.unique_products} {t('dataHub.inventory.productsUpdated', 'products updated')}</p>
                  <p>{result.total_m2_available.toLocaleString()} m² {t('dataHub.inventory.available', 'available')}</p>
                  <p className="text-green-800 font-medium">
                    {t('dataHub.inventory.matchRate', { rate: result.match_rate_pct.toFixed(1), defaultValue: 'Match rate: {{rate}}%' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="mt-4 w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            {t('dataHub.uploadAnother')}
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
