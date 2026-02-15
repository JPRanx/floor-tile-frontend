import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadApi } from '../requests/upload';
import type { InventoryPreview, InventoryUploadResponse } from '../requests/upload';
import { LoadingSpinner } from './LoadingSpinner';

interface InventoryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadState = 'idle' | 'parsing' | 'preview' | 'confirming' | 'success' | 'error';

interface UploadError {
  sheet: string;
  row: number;
  field?: string;
  error: string;
}

export function InventoryUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: InventoryUploadModalProps) {
  const { t } = useTranslation();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<InventoryPreview | null>(null);
  const [result, setResult] = useState<InventoryUploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<UploadError[]>([]);
  const [showAutoCreatedList, setShowAutoCreatedList] = useState(false);
  const [showZeroFilledList, setShowZeroFilledList] = useState(false);

  const isValidFile = (file: File): boolean => {
    return (
      file.name.endsWith('.xlsx') ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  };

  const handleUpload = async (file: File) => {
    setUploadState('parsing');
    setErrorMessage(null);
    setErrorDetails([]);
    setPreview(null);
    setResult(null);

    try {
      const previewData = await uploadApi.previewInventory(file);
      setPreview(previewData);
      setUploadState('preview');
    } catch (err: any) {
      setUploadState('error');

      // Extract error details if available
      if (err.response?.data?.error?.details) {
        const details = err.response.data.error.details;
        if (Array.isArray(details)) {
          setErrorDetails(
            details.map((d: any) => ({
              sheet: d.sheet || 'INVENTARIO',
              row: d.row || 0,
              field: d.field,
              error: d.error || 'Unknown error',
            }))
          );
        }
      }

      setErrorMessage(
        err.response?.data?.error?.message ||
          err.message ||
          t('inventory.uploadError')
      );
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setUploadState('confirming');

    try {
      const uploadResult = await uploadApi.confirmInventory(preview.preview_id);
      setResult(uploadResult);
      setUploadState('success');
      onSuccess();
    } catch (err: any) {
      setUploadState('error');
      setErrorMessage(
        err.response?.data?.error?.message ||
          err.message ||
          t('inventory.uploadError')
      );
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setUploadState('idle');
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && isValidFile(droppedFile)) {
        handleUpload(droppedFile);
      } else {
        setUploadState('error');
        setErrorMessage(t('upload.pleaseUploadExcel'));
      }
    },
    [t]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile && isValidFile(selectedFile)) {
        handleUpload(selectedFile);
      } else if (selectedFile) {
        setUploadState('error');
        setErrorMessage(t('upload.pleaseUploadExcel'));
      }
    },
    [t]
  );

  const handleReset = () => {
    setUploadState('idle');
    setErrorMessage(null);
    setErrorDetails([]);
    setPreview(null);
    setResult(null);
    setShowAutoCreatedList(false);
    setShowZeroFilledList(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('inventory.uploadTitle')}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Idle State */}
            {uploadState === 'idle' && (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="text-4xl mb-4">📄</div>
                <p className="text-gray-700 font-medium mb-2">
                  {t('inventory.dragDropExcel')}
                </p>
                <p className="text-gray-500 text-sm mb-4">{t('inventory.or')}</p>
                <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                  {t('inventory.selectFile')}
                  <input
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-gray-400 text-xs mt-4">
                  {t('inventory.formatHint')}
                </p>
              </div>
            )}

            {/* Parsing State */}
            {uploadState === 'parsing' && (
              <div className="text-center py-12">
                <LoadingSpinner size="lg" />
                <p className="text-gray-600 mt-4">{t('inventory.parsing', 'Parsing file...')}</p>
              </div>
            )}

            {/* Preview State */}
            {uploadState === 'preview' && preview && (
              <div className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-500">{t('inventory.rows', 'Rows')}</div>
                    <div className="text-lg font-bold text-gray-900">{preview.row_count}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-500">{t('inventory.products', 'Products')}</div>
                    <div className="text-lg font-bold text-gray-900">{preview.product_count}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <div className="text-sm text-gray-500">{t('inventory.snapshotDate', 'Snapshot Date')}</div>
                    <div className="text-lg font-bold text-gray-900">{preview.snapshot_date}</div>
                  </div>
                </div>

                {/* Auto-created Products Warning */}
                {preview.auto_created_count > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-amber-800">
                        {t('inventory.autoCreatedWarning', { count: preview.auto_created_count }, `${preview.auto_created_count} products will be auto-created`)}
                      </div>
                      <button
                        onClick={() => setShowAutoCreatedList(!showAutoCreatedList)}
                        className="text-xs text-amber-700 hover:text-amber-900"
                      >
                        {showAutoCreatedList ? t('common.hide', 'Hide') : t('common.show', 'Show')}
                      </button>
                    </div>
                    {showAutoCreatedList && (
                      <div className="mt-2 max-h-32 overflow-auto">
                        <div className="text-xs text-amber-700 space-y-1">
                          {preview.auto_created_products.map((sku, i) => (
                            <div key={i}>• {sku}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Zero-filled Products Info */}
                {preview.zero_filled_count > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-blue-800">
                        {t('inventory.zeroFilledInfo', { count: preview.zero_filled_count }, `${preview.zero_filled_count} products will get zero-quantity records`)}
                      </div>
                      <button
                        onClick={() => setShowZeroFilledList(!showZeroFilledList)}
                        className="text-xs text-blue-700 hover:text-blue-900"
                      >
                        {showZeroFilledList ? t('common.hide', 'Hide') : t('common.show', 'Show')}
                      </button>
                    </div>
                    {showZeroFilledList && (
                      <div className="mt-2 max-h-32 overflow-auto">
                        <div className="text-xs text-blue-700 space-y-1">
                          {preview.zero_filled_products.map((sku, i) => (
                            <div key={i}>• {sku}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Sample Rows Table */}
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">SKU</th>
                        <th className="px-2 py-1 text-right">{t('inventory.warehouseQty', 'Warehouse m²')}</th>
                        <th className="px-2 py-1 text-right">{t('inventory.inTransitQty', 'In Transit m²')}</th>
                        <th className="px-2 py-1 text-left">{t('inventory.date', 'Date')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.sample_rows.map((row, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1">{row.sku}</td>
                          <td className="px-2 py-1 text-right">{row.warehouse_qty}</td>
                          <td className="px-2 py-1 text-right">{row.in_transit_qty}</td>
                          <td className="px-2 py-1">{row.snapshot_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Confirm / Cancel Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleConfirm}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {t('inventory.confirmUpload', 'Confirm Upload')}
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
              <div className="text-center py-12">
                <LoadingSpinner size="lg" />
                <p className="text-gray-600 mt-4">{t('inventory.saving', 'Saving...')}</p>
              </div>
            )}

            {/* Success State */}
            {uploadState === 'success' && result && (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <p className="text-gray-900 font-medium text-lg">
                  {t('inventory.recordsUpdated', { count: result.records_created })}
                </p>
                <button
                  onClick={handleClose}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('inventory.close')}
                </button>
              </div>
            )}

            {/* Error State */}
            {uploadState === 'error' && (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">❌</div>
                <p className="text-red-600 font-medium mb-2">
                  {t('inventory.uploadError')}
                </p>
                {errorMessage && (
                  <p className="text-gray-600 text-sm mb-4">{errorMessage}</p>
                )}
                {errorDetails.length > 0 && (
                  <div className="mt-4 text-left bg-red-50 rounded-lg p-4 max-h-40 overflow-auto">
                    <p className="text-sm font-medium text-red-800 mb-2">
                      {t('upload.validationErrors')}
                    </p>
                    <ul className="text-xs text-red-700 space-y-1">
                      {errorDetails.slice(0, 5).map((err, idx) => (
                        <li key={idx}>
                          {err.sheet} fila {err.row}
                          {err.field && ` (${err.field})`}: {err.error}
                        </li>
                      ))}
                      {errorDetails.length > 5 && (
                        <li className="text-red-500 italic">
                          {t('upload.andMore', {
                            count: errorDetails.length - 5,
                          })}
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                <button
                  onClick={handleReset}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('inventory.tryAgain')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
