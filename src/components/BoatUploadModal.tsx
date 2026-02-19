import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { boatsApi } from '../requests/boats';
import type { BoatUploadResult, BoatPreview } from '../requests/boats';
import { LoadingSpinner } from './LoadingSpinner';
import { UploadPreviewModal } from './UploadPreviewModal';
import { EditablePreviewTable, formatDateForDisplay } from './uploads/EditablePreviewTable';
import type { EditableColumn } from './uploads/EditablePreviewTable';

interface BoatUploadCardProps {
  lastUpdated?: string | null;
  recordCount?: number;
  onUploadSuccess?: () => void;
}

type UploadState = 'idle' | 'parsing' | 'preview' | 'confirming' | 'success' | 'error';

export function BoatUploadCard({ lastUpdated, recordCount, onUploadSuccess }: BoatUploadCardProps) {
  const { t, i18n } = useTranslation();
  const [, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [preview, setPreview] = useState<BoatPreview | null>(null);
  const [result, setResult] = useState<BoatUploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modifications, setModifications] = useState<Map<string, Record<string, unknown>>>(new Map());
  const [deletions, setDeletions] = useState<Set<string>>(new Set());

  const isValidFile = (file: File): boolean => {
    return (
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileAndUpload = useCallback(async (selectedFile: File) => {
    if (!isValidFile(selectedFile)) {
      setErrorMessage(t('boatUpload.pleaseUploadExcel'));
      return;
    }

    setFile(selectedFile);
    setErrorMessage(null);
    setUploadState('parsing');
    setResult(null);
    setPreview(null);
    setModalOpen(true);

    try {
      const previewData = await boatsApi.preview(selectedFile);
      setPreview(previewData);
      setUploadState('preview');
    } catch (err: unknown) {
      setUploadState('error');
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setErrorMessage(
        axiosErr.response?.data?.error?.message || t('boatUpload.uploadFailed', 'Upload failed')
      );
    }
  }, [t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileAndUpload(droppedFile);
    }
  }, [handleFileAndUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileAndUpload(selectedFile);
    }
  }, [handleFileAndUpload]);

  const handleConfirm = async () => {
    if (!preview) return;

    setUploadState('confirming');
    setErrorMessage(null);

    try {
      const modsArray = Array.from(modifications.entries()).map(([rowKey, changes]) => ({
        row_index: parseInt(rowKey, 10),
        ...(changes.departure_date !== undefined ? { departure_date: changes.departure_date as string } : {}),
        ...(changes.arrival_date !== undefined ? { arrival_date: changes.arrival_date as string } : {}),
        ...(changes.vessel_name !== undefined ? { vessel_name: changes.vessel_name as string } : {}),
        ...(changes.carrier !== undefined ? { carrier: changes.carrier as string } : {}),
      }));
      const deletionsArray = Array.from(deletions).map((k) => parseInt(k, 10));

      const payload = modsArray.length > 0 || deletionsArray.length > 0
        ? { modifications: modsArray, deletions: deletionsArray }
        : undefined;

      const uploadResult = await boatsApi.confirmUpload(preview.preview_id, payload);
      setResult(uploadResult);
      setUploadState('success');
      onUploadSuccess?.();
    } catch (err: unknown) {
      setUploadState('error');
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setErrorMessage(
        axiosErr.response?.data?.error?.message || t('boatUpload.confirmFailed', 'Save failed')
      );
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setFile(null);
    setUploadState('idle');
    setModalOpen(false);
    setModifications(new Map());
    setDeletions(new Set());
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setFile(null);
    setUploadState('idle');
    setPreview(null);
    setResult(null);
    setErrorMessage(null);
    setModifications(new Map());
    setDeletions(new Set());
  };

  const handleModify = useCallback((rowKey: string, field: string, value: unknown) => {
    setModifications((prev) => {
      const next = new Map(prev);
      const existing = next.get(rowKey) ?? {};
      next.set(rowKey, { ...existing, [field]: value });
      return next;
    });
  }, []);

  const handleDeleteRow = useCallback((rowKey: string) => {
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

  const boatColumns: EditableColumn[] = [
    { key: 'vessel_name', label: 'Buque', editable: true, type: 'text', width: 'w-36' },
    { key: 'departure_date', label: 'Salida', editable: true, type: 'text', width: 'w-28' },
    { key: 'arrival_date', label: 'Llegada', editable: true, type: 'text', width: 'w-28' },
    { key: 'carrier', label: 'Carrier', editable: true, type: 'text', width: 'w-28' },
    { key: 'origin_port', label: 'Origen', editable: false, type: 'text', width: 'w-28' },
    { key: 'action', label: 'Acci\u00F3n', editable: false, type: 'text', width: 'w-20' },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {t('boatUpload.title')}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {t('boatUpload.fileTypes', 'Horario TIBA (.xlsx, .xls)')}
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
            {t('boatUpload.clickToUpload', 'Click to upload')}{' '}
            {t('boatUpload.orDragDrop', 'or drag and drop')}
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

      {errorMessage && !modalOpen && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p>{t('dataHub.production.lastUpload', 'Last upload')}: {formatLastUpdated()}</p>
        {recordCount !== undefined && recordCount > 0 && (
          <p>{recordCount.toLocaleString()} {t('boatUpload.itemsCount', 'schedules')}</p>
        )}
      </div>

      {/* Preview Modal */}
      <UploadPreviewModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        title={t('boatUpload.title')}
      >
        {/* Parsing State */}
        {uploadState === 'parsing' && (
          <div className="py-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">{t('boatUpload.parsing', 'Parsing file...')}</p>
          </div>
        )}

        {/* Preview State */}
        {uploadState === 'preview' && preview && (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{preview.new_boats}</div>
                <div className="text-xs text-green-600">{t('boatUpload.new', 'New')}</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{preview.updated_boats}</div>
                <div className="text-xs text-blue-600">{t('boatUpload.updates', 'Updates')}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-700">{preview.skipped_boats}</div>
                <div className="text-xs text-gray-600">{t('boatUpload.unchanged', 'Unchanged')}</div>
              </div>
            </div>

            {/* Date Range */}
            {preview.earliest_departure && preview.latest_departure && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                <span className="font-medium">{t('boatUpload.dateRange', 'Date range:')}</span>{' '}
                {formatDateForDisplay(preview.earliest_departure)} – {formatDateForDisplay(preview.latest_departure)}
              </div>
            )}

            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800">{t('boatUpload.warnings', 'Warnings:')}</p>
                <ul className="mt-1 text-xs text-yellow-700 space-y-1">
                  {preview.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Editable Preview Table */}
            <EditablePreviewTable
              rows={(preview.rows ?? preview.sample_rows) as unknown as Record<string, unknown>[]}
              columns={boatColumns}
              rowKeyField="row_index"
              onModify={handleModify}
              onDelete={handleDeleteRow}
              onUndoDelete={handleUndoDelete}
              modifications={modifications}
              deletions={deletions}
            />

            {/* Skipped Rows */}
            {preview.skipped_rows.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">
                  {t('boatUpload.skippedRows', 'Skipped rows:')} {preview.skipped_rows.length}
                </p>
                <ul className="mt-1 text-xs text-red-700 space-y-1">
                  {preview.skipped_rows.slice(0, 5).map((skip, i) => (
                    <li key={i}>Row {skip.row}: {skip.reason}</li>
                  ))}
                  {preview.skipped_rows.length > 5 && (
                    <li>{t('boatUpload.andMore', 'And {count} more...', { count: preview.skipped_rows.length - 5 })}</li>
                  )}
                </ul>
              </div>
            )}

            {/* Preview Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                {t('boatUpload.confirm', 'Confirm Upload')}
              </button>
            </div>
          </div>
        )}

        {/* Confirming State */}
        {uploadState === 'confirming' && (
          <div className="py-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">{t('boatUpload.confirming', 'Saving...')}</p>
          </div>
        )}

        {/* Success State */}
        {uploadState === 'success' && result && (
          <div className="py-4 text-center">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-3 text-lg font-medium text-gray-900">{t('boatUpload.uploadSuccessful')}</h3>
            <div className="mt-2 text-sm text-gray-600">
              <p>{t('boatUpload.boatsImported', { count: result.imported })}</p>
              <p>{t('boatUpload.boatsUpdated', { count: result.updated })}</p>
              {result.skipped > 0 && (
                <p>{t('boatUpload.boatsUpToDate', { count: result.skipped })}</p>
              )}
            </div>

            {result.skipped_rows && result.skipped_rows.length > 0 && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-left text-sm">
                <p className="font-medium text-yellow-800">{t('boatUpload.rowsSkipped', 'Rows skipped: {count}', { count: result.skipped_rows.length })}</p>
                <ul className="mt-1 text-yellow-700 text-xs">
                  {result.skipped_rows.slice(0, 3).map((skip, i) => (
                    <li key={i}>Row {skip.row}: {skip.reason}</li>
                  ))}
                  {result.skipped_rows.length > 3 && (
                    <li>{t('boatUpload.andMore', 'And {count} more...', { count: result.skipped_rows.length - 3 })}</li>
                  )}
                </ul>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-left text-sm">
                <p className="font-medium text-red-800">{t('boatUpload.errors', 'Errors:')}</p>
                <ul className="mt-1 text-red-700 text-xs">
                  {result.errors.slice(0, 3).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {result.errors.length > 3 && (
                    <li>{t('boatUpload.andMore', 'And {count} more...', { count: result.errors.length - 3 })}</li>
                  )}
                </ul>
              </div>
            )}

            <button
              onClick={handleModalClose}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              {t('shipmentUpload.done')}
            </button>
          </div>
        )}

        {/* Error State */}
        {uploadState === 'error' && (
          <div className="py-4 text-center">
            <svg
              className="mx-auto h-12 w-12 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-3 text-lg font-medium text-gray-900">{t('boatUpload.uploadFailed')}</h3>
            <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>

            {result && result.errors && result.errors.length > 0 && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-left text-sm max-h-32 overflow-y-auto">
                <ul className="text-red-700 text-xs">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => {
                setUploadState('idle');
                setPreview(null);
                setResult(null);
                setErrorMessage(null);
                setModifications(new Map());
                setDeletions(new Set());
                setModalOpen(false);
              }}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700"
            >
              {t('common.tryAgain', 'Try Again')}
            </button>
          </div>
        )}
      </UploadPreviewModal>
    </div>
  );
}
