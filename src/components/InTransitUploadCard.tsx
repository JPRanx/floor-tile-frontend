import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { dataHubApi } from '../requests/dataHub';
import type { InTransitUploadResponse } from '../requests/dataHub';
import { LoadingSpinner } from './LoadingSpinner';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface InTransitUploadCardProps {
  onUploadSuccess?: () => void;
}

function getTodayString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function InTransitUploadCard({ onUploadSuccess }: InTransitUploadCardProps) {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [result, setResult] = useState<InTransitUploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const isValidFile = (f: File): boolean => {
    return (
      f.name.endsWith('.xlsx') ||
      f.name.endsWith('.xls') ||
      f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      f.type === 'application/vnd.ms-excel'
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

  const handleUpload = async (file: File) => {
    setUploadState('uploading');
    setErrorMessage(null);
    setResult(null);
    setShowUnmatched(false);
    setShowDetails(false);

    try {
      const data = await dataHubApi.uploadInTransit(file, getTodayString());
      setResult(data);
      setUploadState('success');
      onUploadSuccess?.();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string }; detail?: string } } };
      setErrorMessage(
        axiosErr.response?.data?.error?.message ||
        axiosErr.response?.data?.detail ||
        t('dataHub.inTransit.uploadError', 'Upload failed'),
      );
      setUploadState('error');
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && isValidFile(droppedFile)) {
        handleUpload(droppedFile);
      } else {
        setErrorMessage(
          t('dataHub.inTransit.pleaseUploadExcel', 'Please upload an Excel file (.xlsx or .xls)'),
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile && isValidFile(selectedFile)) {
        handleUpload(selectedFile);
      } else if (selectedFile) {
        setErrorMessage(
          t('dataHub.inTransit.pleaseUploadExcel', 'Please upload an Excel file (.xlsx or .xls)'),
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  const handleReset = () => {
    setUploadState('idle');
    setResult(null);
    setErrorMessage(null);
    setShowUnmatched(false);
    setShowDetails(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {t('dataHub.inTransit.title', 'Despacho / En Transito')}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {t('dataHub.inTransit.subtitle', 'Excel de despacho en transito (.xlsx, .xls)')}
      </p>

      {/* Idle State — just drag-drop */}
      {uploadState === 'idle' && (
        <>
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
                {t('dataHub.inTransit.dropzone', 'Arrastra el archivo Excel o haz clic para buscar')}
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
        </>
      )}

      {/* Uploading State */}
      {uploadState === 'uploading' && (
        <div className="py-8 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">
            {t('dataHub.inTransit.uploading', 'Procesando archivo...')}
          </p>
        </div>
      )}

      {/* Success State */}
      {uploadState === 'success' && result && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800">
              {t('dataHub.inTransit.successTitle', 'Carga exitosa')}
            </h4>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <div className="text-sm text-gray-500">
                  {t('dataHub.inTransit.productsUpdated', 'Productos actualizados')}
                </div>
                <div className="text-lg font-bold text-gray-900">{result.products_updated}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <div className="text-sm text-gray-500">
                  {t('dataHub.inTransit.productsReset', 'Productos reseteados')}
                </div>
                <div className="text-lg font-bold text-gray-900">{result.products_reset}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100 col-span-2">
                <div className="text-sm text-gray-500">
                  {t('dataHub.inTransit.totalInTransitM2', 'Total en transito m\u00B2')}
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {result.total_in_transit_m2.toLocaleString()} m²
                </div>
              </div>
            </div>

            {/* Snapshot date */}
            <div className="mt-3 text-sm text-green-700">
              {t('dataHub.inTransit.snapshotDateLabel', 'Fecha de corte')}: {result.snapshot_date}
            </div>

            {/* Excluded orders */}
            {result.excluded_orders.length > 0 && (
              <div className="mt-2 text-sm text-green-700">
                {t('dataHub.inTransit.excludedOrders', 'Pedidos excluidos')}: {result.excluded_orders.join(', ')}
              </div>
            )}
          </div>

          {/* Unmatched SKUs warning */}
          {result.unmatched_skus.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <button
                onClick={() => setShowUnmatched(!showUnmatched)}
                className="text-sm text-amber-700 hover:text-amber-900 font-medium"
              >
                {showUnmatched ? '\u25BC' : '\u25B6'} {result.unmatched_skus.length}{' '}
                {t('dataHub.inTransit.unmatchedSkus', 'SKUs no encontrados')}
              </button>
              {showUnmatched && (
                <div className="mt-2 bg-white rounded p-2 text-xs text-gray-700 max-h-32 overflow-y-auto">
                  {result.unmatched_skus.map((sku, i) => (
                    <div key={i} className="py-0.5">{'\u2022'} {sku}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Details expandable */}
          {result.details.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-700 hover:text-blue-900 font-medium"
              >
                {showDetails ? '\u25BC' : '\u25B6'}{' '}
                {t('dataHub.inTransit.viewDetails', 'Ver detalle por producto')} ({result.details.length})
              </button>
              {showDetails && (
                <div className="mt-2 overflow-auto max-h-48">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="px-2 py-1 text-left">SKU</th>
                        <th className="px-2 py-1 text-right">
                          {t('dataHub.inTransit.inTransitM2', 'En transito m\u00B2')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100">
                      {result.details.map((d, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1">{d.sku}</td>
                          <td className="px-2 py-1 text-right">
                            {d.in_transit_m2.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleReset}
            className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            {t('dataHub.uploadAnother', 'Upload Another')}
          </button>
        </div>
      )}

      {/* Error State */}
      {uploadState === 'error' && (
        <>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-800">
              {t('dataHub.uploadFailed', 'Upload Failed')}
            </h4>
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
