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
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-1">
          {t('dataHub.sales.title')}
        </h3>
        <p className="text-sm text-slate-500 mb-4">
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
              : 'border-slate-600 hover:border-blue-400 hover:bg-slate-900'
          }`}
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
              {t('dataHub.sales.dropzone')}
            </p>
            <p className="mt-1 text-xs text-slate-500">CSV, XLS, XLSX</p>
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

        <div className="mt-4 text-sm text-slate-500">
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
        wide={uploadState === 'preview'}
      >
        {/* Parsing State */}
        {uploadState === 'parsing' && (
          <div className="py-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-slate-400">Analizando archivo...</p>
          </div>
        )}

        {/* Preview State — Dual Pane */}
        {uploadState === 'preview' && preview && (
          <div className="flex gap-6 min-h-0">
            {/* Left: Parsed rows */}
            <div className="flex-1 min-w-0 overflow-auto max-h-[65vh]">
              <table className="w-full text-sm">
                <thead className="bg-slate-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-slate-400">SKU</th>
                    <th className="px-3 py-2 text-left text-xs text-slate-400">Fecha</th>
                    <th className="px-3 py-2 text-right text-xs text-slate-400">m²</th>
                    <th className="px-3 py-2 text-left text-xs text-slate-400">Cliente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {preview.sample_rows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-700/30">
                      <td className="px-3 py-1.5 text-slate-200 font-medium">{row.sku}</td>
                      <td className="px-3 py-1.5 text-slate-400">{row.sale_date}</td>
                      <td className="px-3 py-1.5 text-right text-slate-300">{row.quantity_m2}</td>
                      <td className="px-3 py-1.5 text-slate-500 truncate max-w-[200px]">{row.customer || '\u2014'}</td>
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
                  <div className="text-xs text-slate-500">Filas</div>
                  <div className="text-xl font-bold text-slate-200">{preview.row_count}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Total m²</div>
                  <div className="text-xl font-bold text-slate-200">{(preview.total_m2 ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Clientes</div>
                  <div className="text-xl font-bold text-slate-200">{preview.unique_customers}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Rango de fechas</div>
                  <div className="text-sm font-bold text-slate-200">{preview.date_range_start} – {preview.date_range_end}</div>
                </div>
              </div>

              {/* Warnings — only if problems */}
              {preview.unmatched_count > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <div className="text-sm text-red-400 font-medium">{preview.unmatched_count} sin match</div>
                  <button
                    onClick={() => setShowUnmatched(!showUnmatched)}
                    className="text-xs text-red-400/70 hover:text-red-300 mt-1"
                  >
                    {showUnmatched ? '\u25BC' : '\u25B6'} ver detalles
                  </button>
                  {showUnmatched && (
                    <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                      {preview.unmatched_products.map((p, i) => (
                        <div key={i}>{'\u2022'} {p}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {preview.warnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  {preview.warnings.map((w, i) => (
                    <div key={i} className="text-xs text-amber-400">{'\u2022'} {w}</div>
                  ))}
                </div>
              )}

              {/* Match rate — compact */}
              <div className="text-xs text-slate-500 text-center">
                {preview.match_rate_pct}% match rate
              </div>

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
          <div className="py-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-slate-400">Guardando...</p>
          </div>
        )}

        {/* Success State */}
        {uploadState === 'success' && result && (
          <>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <h4 className="font-medium text-emerald-400">Carga exitosa</h4>
              <div className="mt-2 space-y-1 text-sm text-emerald-300/80">
                <p>{result.created} registros creados</p>
                {result.deleted > 0 && <p>{result.deleted} registros reemplazados</p>}
                {result.date_range_start && result.date_range_end && (
                  <p>{result.date_range_start} – {result.date_range_end}</p>
                )}
                <p className="font-medium text-emerald-400">
                  {result.unique_customers} clientes · {(result.total_m2_sold ?? 0).toLocaleString()} m²
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="mt-4 w-full px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600"
            >
              Cerrar
            </button>
          </>
        )}

        {/* Error State */}
        {uploadState === 'error' && (
          <ParseDiagnosticPanel
            errorMessage={errorMessage || 'Error en la carga'}
            missingColumns={missingColumns}
            foundColumns={foundColumns}
            onRetry={handleReset}
          />
        )}
      </UploadPreviewModal>
    </>
  );
}
