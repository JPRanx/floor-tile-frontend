import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadApi } from '../requests/upload';
import { LoadingSpinner } from './LoadingSpinner';

interface InventoryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

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
  const [recordsCreated, setRecordsCreated] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<UploadError[]>([]);

  const isValidFile = (file: File): boolean => {
    return (
      file.name.endsWith('.xlsx') ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  };

  const handleUpload = async (file: File) => {
    setUploadState('uploading');
    setErrorMessage(null);
    setErrorDetails([]);

    try {
      const result = await uploadApi.uploadInventory(file);
      setRecordsCreated(result.records_created);
      setUploadState('success');
      onSuccess();
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
    setRecordsCreated(0);
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
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

            {uploadState === 'uploading' && (
              <div className="text-center py-12">
                <LoadingSpinner size="lg" />
                <p className="text-gray-600 mt-4">{t('inventory.uploading')}</p>
              </div>
            )}

            {uploadState === 'success' && (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <p className="text-gray-900 font-medium text-lg">
                  {t('inventory.recordsUpdated', { count: recordsCreated })}
                </p>
                <button
                  onClick={handleClose}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('inventory.close')}
                </button>
              </div>
            )}

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
