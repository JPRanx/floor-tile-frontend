import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { boatsApi } from '../requests/boats';
import type { BoatUploadResult, BoatPreview } from '../requests/boats';
import { LoadingSpinner } from './LoadingSpinner';
import { UploadPreviewModal } from './UploadPreviewModal';

interface BoatUploadCardProps {
  lastUpdated?: string | null;
  recordCount?: number;
  onUploadSuccess?: () => void;
}

type UploadState = 'idle' | 'parsing' | 'preview' | 'confirming' | 'success' | 'error';

export function BoatUploadCard({ lastUpdated, recordCount, onUploadSuccess }: BoatUploadCardProps) {
  const { t, i18n } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [preview, setPreview] = useState<BoatPreview | null>(null);
  const [result, setResult] = useState<BoatUploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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
    } catch (err: any) {
      setUploadState('error');
      setErrorMessage(
        err.response?.data?.error?.message || t('boatUpload.uploadFailed', 'Upload failed')
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
      const uploadResult = await boatsApi.confirmUpload(preview.preview_id);
      setResult(uploadResult);
      setUploadState('success');
      onUploadSuccess?.();
    } catch (err: any) {
      setUploadState('error');
      setErrorMessage(
        err.response?.data?.error?.message || t('boatUpload.confirmFailed', 'Save failed')
      );
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setFile(null);
    setUploadState('idle');
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
                {new Date(preview.earliest_departure).toLocaleDateString()} – {new Date(preview.latest_departure).toLocaleDateString()}
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

            {/* Sample Rows Table */}
            {preview.sample_rows.length > 0 && (
              <div className="overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700">{t('boatUpload.vessel', 'Vessel')}</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700">{t('boatUpload.departure', 'Departure')}</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700">{t('boatUpload.arrival', 'Arrival')}</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700">{t('boatUpload.transit', 'Transit')}</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700">{t('boatUpload.action', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.sample_rows.map((row, i) => (
                      <tr key={i}>
                        <td className="px-2 py-2 text-gray-900">{row.vessel_name || '-'}</td>
                        <td className="px-2 py-2 text-gray-600">{new Date(row.departure_date).toLocaleDateString()}</td>
                        <td className="px-2 py-2 text-gray-600">{new Date(row.arrival_date).toLocaleDateString()}</td>
                        <td className="px-2 py-2 text-center text-gray-600">{row.transit_days}d</td>
                        <td className="px-2 py-2 text-center">
                          {row.action === 'new' && (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                              {t('boatUpload.actionNew', 'NEW')}
                            </span>
                          )}
                          {row.action === 'update' && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                              {t('boatUpload.actionUpdate', 'UPDATE')}
                            </span>
                          )}
                          {row.action === 'skip' && (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                              {t('boatUpload.actionSkip', 'SKIP')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

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
