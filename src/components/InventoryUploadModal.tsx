import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadApi } from '../requests/upload';
import type { InventoryPreview, InventoryUploadResponse } from '../requests/upload';
import { LoadingSpinner } from './LoadingSpinner';
import { UploadPreviewModal } from './UploadPreviewModal';
import { EditablePreviewTable } from './uploads/EditablePreviewTable';
import type { EditableColumn } from './uploads/EditablePreviewTable';

interface InventoryUploadCardProps {
  lastUpdated?: string | null;
  recordCount?: number;
  onUploadSuccess?: () => void;
}

type UploadState = 'idle' | 'parsing' | 'preview' | 'confirming' | 'success' | 'error';

interface UploadError {
  sheet: string;
  row: number;
  field?: string;
  error: string;
}

export function InventoryUploadCard({
  lastUpdated,
  recordCount,
  onUploadSuccess,
}: InventoryUploadCardProps) {
  const { t, i18n } = useTranslation();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [preview, setPreview] = useState<InventoryPreview | null>(null);
  const [result, setResult] = useState<InventoryUploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<UploadError[]>([]);
  const [showAutoCreatedList, setShowAutoCreatedList] = useState(false);
  const [showZeroFilledList, setShowZeroFilledList] = useState(false);
  const [modifications, setModifications] = useState<Map<string, Record<string, unknown>>>(new Map());
  const [deletions, setDeletions] = useState<Set<string>>(new Set());

  const isValidFile = (file: File): boolean => {
    return (
      file.name.endsWith('.xlsx') ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  };

  const handleUpload = async (file: File) => {
    setUploadState('parsing');
    setModalOpen(true);
    setErrorMessage(null);
    setErrorDetails([]);
    setPreview(null);
    setResult(null);

    try {
      const previewData = await uploadApi.previewInventory(file);
      setPreview(previewData);
      setUploadState('preview');
    } catch (err: unknown) {
      setUploadState('error');

      // Extract error details if available
      const axiosErr = err as { response?: { data?: { error?: { message?: string; details?: Array<{ sheet?: string; row?: number; field?: string; error?: string }> } } }; message?: string };
      if (axiosErr.response?.data?.error?.details) {
        const details = axiosErr.response.data.error.details;
        if (Array.isArray(details)) {
          setErrorDetails(
            details.map((d) => ({
              sheet: d.sheet || 'INVENTARIO',
              row: d.row || 0,
              field: d.field,
              error: d.error || 'Unknown error',
            }))
          );
        }
      }

      setErrorMessage(
        axiosErr.response?.data?.error?.message ||
          axiosErr.message ||
          t('inventory.uploadError')
      );
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setUploadState('confirming');

    try {
      const modsArray = Array.from(modifications.entries()).map(([productId, changes]) => ({
        product_id: productId,
        ...(changes.warehouse_qty !== undefined ? { warehouse_qty: changes.warehouse_qty as number } : {}),
        ...(changes.in_transit_qty !== undefined ? { in_transit_qty: changes.in_transit_qty as number } : {}),
      }));
      const deletionsArray = Array.from(deletions);

      const payload = modsArray.length > 0 || deletionsArray.length > 0
        ? { modifications: modsArray, deletions: deletionsArray }
        : undefined;

      const uploadResult = await uploadApi.confirmInventory(preview.preview_id, payload);
      setResult(uploadResult);
      setUploadState('success');
      onUploadSuccess?.();
    } catch (err: unknown) {
      setUploadState('error');
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setErrorMessage(
        axiosErr.response?.data?.error?.message ||
          axiosErr.message ||
          t('inventory.uploadError')
      );
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setUploadState('idle');
    setModalOpen(false);
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

  const inventoryColumns: EditableColumn[] = [
    { key: 'sku', label: 'SKU', editable: false, type: 'text', width: 'w-48' },
    { key: 'warehouse_qty', label: t('inventory.warehouseQty', 'Bodega (m\u00B2)'), editable: true, type: 'number', width: 'w-32' },
    { key: 'in_transit_qty', label: t('inventory.inTransitQty', 'En tr\u00E1nsito (m\u00B2)'), editable: true, type: 'number', width: 'w-32' },
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
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {t('inventory.uploadTitle')}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {t('inventory.formatHint')}
      </p>

      {/* Drag-Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
            {t('inventory.dragDropExcel')}
          </p>
          <p className="mt-1 text-xs text-gray-500">XLSX</p>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {/* Last Updated Info */}
      <div className="mt-4 text-sm text-gray-500">
        <p>{t('dataHub.inventory.lastUpload')}: {formatLastUpdated()}</p>
        {recordCount !== undefined && recordCount > 0 && (
          <p>{recordCount.toLocaleString()} {t('inventory.records', 'records')}</p>
        )}
      </div>

      {/* Upload Preview Modal */}
      <UploadPreviewModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        title={t('inventory.uploadTitle')}
      >
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
            <div className="grid grid-cols-4 gap-3">
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
                    {t('inventory.autoCreatedWarning', { count: preview.auto_created_count, defaultValue: '{{count}} products will be auto-created' })}
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
                    {t('inventory.zeroFilledInfo', { count: preview.zero_filled_count, defaultValue: '{{count}} products will get zero-quantity records' })}
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

            {/* Editable Preview Table */}
            <EditablePreviewTable
              rows={preview.rows as unknown as Record<string, unknown>[]}
              columns={inventoryColumns}
              rowKeyField="product_id"
              onModify={handleModify}
              onDelete={handleDelete}
              onUndoDelete={handleUndoDelete}
              modifications={modifications}
              deletions={deletions}
            />

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
              onClick={handleModalClose}
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
      </UploadPreviewModal>
    </div>
  );
}
