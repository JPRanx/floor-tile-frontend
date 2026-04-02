import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadApi } from '../requests/upload';
import type { InventoryPreview, InventoryUploadResponse } from '../requests/upload';
import { LoadingSpinner } from './LoadingSpinner';
import { UploadPreviewModal } from './UploadPreviewModal';
import { ParseDiagnosticPanel } from './uploads/ParseDiagnosticPanel';

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
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [foundColumns, setFoundColumns] = useState<string[]>([]);
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

      const axiosErr = err as { response?: { data?: { error?: { message?: string; details?: Record<string, unknown> & { missing_columns?: string[]; found_columns?: string[] } } } }; message?: string };
      if (axiosErr.response?.data?.error?.details) {
        const details = axiosErr.response.data.error.details;
        if (details.missing_columns) setMissingColumns(details.missing_columns);
        if (details.found_columns) setFoundColumns(details.found_columns);
        if (Array.isArray(details)) {
          setErrorDetails(
            (details as Array<{ sheet?: string; row?: number; field?: string; error?: string }>).map((d) => ({
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
      const uploadResult = await uploadApi.confirmInventory(preview.preview_id);
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
    setMissingColumns([]);
    setFoundColumns([]);
    setPreview(null);
    setResult(null);
    setShowAutoCreatedList(false);
    setShowZeroFilledList(false);
    setModalOpen(false);
  };

  const handleModalClose = () => {
    handleReset();
  };

  const formatDateForDisplay = (value: string): string => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
    return value;
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
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-200 mb-1">
        {t('inventory.uploadTitle')}
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        {t('inventory.formatHint')}
      </p>

      {/* Drag-Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-600 hover:border-blue-400 hover:bg-slate-900'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <label className="cursor-pointer block">
          <svg
            className="mx-auto h-10 w-10 text-slate-500"
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
          <p className="mt-2 text-sm text-slate-400">
            {t('inventory.dragDropExcel')}
          </p>
          <p className="mt-1 text-xs text-slate-500">XLSX</p>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {/* Last Updated Info */}
      <div className="mt-4 text-sm text-slate-500">
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
        wide={uploadState === 'preview'}
      >
        {/* Parsing State */}
        {uploadState === 'parsing' && (
          <div className="text-center py-12">
            <LoadingSpinner size="lg" />
            <p className="text-slate-400 mt-4">{t('inventory.parsing', 'Parsing file...')}</p>
          </div>
        )}

        {/* Preview State -- Dual Pane */}
        {uploadState === 'preview' && preview && (
          <div className="flex gap-6 min-h-0">
            {/* Left: Read-only rows table */}
            <div className="flex-1 min-w-0 overflow-auto max-h-[65vh]">
              <table className="w-full text-sm">
                <thead className="bg-slate-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-slate-400">Producto</th>
                    <th className="px-3 py-2 text-right text-xs text-slate-400">Bodega m²</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-700/30">
                      <td className="px-3 py-1.5 text-slate-200 font-medium">{row.sku}</td>
                      <td className="px-3 py-1.5 text-right text-slate-300">{row.warehouse_qty.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right: Summary + Confirm */}
            <div className="w-72 shrink-0 flex flex-col gap-4">
              {/* Summary stats */}
              <div className="space-y-3">
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Productos</div>
                  <div className="text-xl font-bold text-slate-200">{preview.product_count}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Fecha snapshot</div>
                  <div className="text-sm font-bold text-slate-200">{formatDateForDisplay(preview.snapshot_date)}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Filas</div>
                  <div className="text-xl font-bold text-slate-200">{preview.row_count}</div>
                </div>
              </div>

              {/* Auto-created Products Warning */}
              {preview.auto_created_count > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <div className="text-sm text-amber-400 font-medium">
                    {preview.auto_created_count} productos se crearán automáticamente
                  </div>
                  <button
                    onClick={() => setShowAutoCreatedList(!showAutoCreatedList)}
                    className="text-xs text-amber-400/70 hover:text-amber-300 mt-1"
                  >
                    {showAutoCreatedList ? '\u25BC' : '\u25B6'} ver detalles
                  </button>
                  {showAutoCreatedList && (
                    <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                      {preview.auto_created_products.map((sku, i) => (
                        <div key={i}>{'\u2022'} {sku}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Zero-filled Products Info */}
              {preview.zero_filled_count > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <div className="text-sm text-amber-400 font-medium">
                    {preview.zero_filled_count} productos con cantidad cero
                  </div>
                  <button
                    onClick={() => setShowZeroFilledList(!showZeroFilledList)}
                    className="text-xs text-amber-400/70 hover:text-amber-300 mt-1"
                  >
                    {showZeroFilledList ? '\u25BC' : '\u25B6'} ver detalles
                  </button>
                  {showZeroFilledList && (
                    <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                      {preview.zero_filled_products.map((sku, i) => (
                        <div key={i}>{'\u2022'} {sku}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 mt-auto">
                <button
                  onClick={handleConfirm}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-medium"
                >
                  Confirmar
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirming State */}
        {uploadState === 'confirming' && (
          <div className="text-center py-12">
            <LoadingSpinner size="lg" />
            <p className="text-slate-400 mt-4">{t('inventory.saving', 'Saving...')}</p>
          </div>
        )}

        {/* Success State */}
        {uploadState === 'success' && result && (
          <>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <h4 className="font-medium text-emerald-400">Carga exitosa</h4>
              <div className="mt-2 space-y-1 text-sm text-emerald-300/80">
                <p>{result.records_created} registros actualizados</p>
              </div>
            </div>
            <button
              onClick={handleModalClose}
              className="mt-4 w-full px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600"
            >
              Cerrar
            </button>
          </>
        )}

        {/* Error State */}
        {uploadState === 'error' && (
          <div className="py-4">
            <ParseDiagnosticPanel
              errorMessage={errorMessage || t('inventory.uploadError')}
              missingColumns={missingColumns}
              foundColumns={foundColumns}
              onRetry={handleReset}
            />
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
          </div>
        )}
      </UploadPreviewModal>
    </div>
  );
}
