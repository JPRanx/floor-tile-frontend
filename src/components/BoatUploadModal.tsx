import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { boatsApi } from '../requests/boats';
import type { BoatUploadResult, BoatPreview } from '../requests/boats';
import { LoadingSpinner } from './LoadingSpinner';
import { UploadPreviewModal } from './UploadPreviewModal';
import { ParseDiagnosticPanel } from './uploads/ParseDiagnosticPanel';

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
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [foundColumns, setFoundColumns] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const isValidFile = (file: File): boolean => {
    return (
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );
  };

  const formatDateForDisplay = (value: string): string => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
    return value;
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
      const axiosErr = err as { response?: { data?: { error?: { message?: string; details?: { missing_columns?: string[]; found_columns?: string[] } } } } };
      const details = axiosErr.response?.data?.error?.details;
      if (details?.missing_columns) setMissingColumns(details.missing_columns);
      if (details?.found_columns) setFoundColumns(details.found_columns);
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
      const uploadResult = await boatsApi.confirmUpload(preview.preview_id);
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
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setFile(null);
    setUploadState('idle');
    setPreview(null);
    setResult(null);
    setErrorMessage(null);
    setMissingColumns([]);
    setFoundColumns([]);
  };

  const rows = preview?.rows ?? preview?.sample_rows ?? [];

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-200 mb-1">
        {t('boatUpload.title')}
      </h3>
      <p className="text-sm text-slate-500 mb-4">
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
            {t('boatUpload.clickToUpload', 'Click to upload')}{' '}
            {t('boatUpload.orDragDrop', 'or drag and drop')}
          </p>
          <p className="mt-1 text-xs text-slate-500">XLSX, XLS</p>
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

      <div className="mt-4 text-sm text-slate-500">
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
        wide={uploadState === 'preview'}
      >
        {/* Parsing State */}
        {uploadState === 'parsing' && (
          <div className="py-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-slate-400">{t('boatUpload.parsing', 'Parsing file...')}</p>
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
                    <th className="px-3 py-2 text-left text-xs text-slate-400">Buque</th>
                    <th className="px-3 py-2 text-left text-xs text-slate-400">Salida</th>
                    <th className="px-3 py-2 text-left text-xs text-slate-400">Llegada</th>
                    <th className="px-3 py-2 text-left text-xs text-slate-400">Carrier</th>
                    <th className="px-3 py-2 text-left text-xs text-slate-400">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-700/30">
                      <td className="px-3 py-1.5 text-slate-200">{row.vessel_name || '\u2014'}</td>
                      <td className="px-3 py-1.5 text-slate-400">{formatDateForDisplay(row.departure_date)}</td>
                      <td className="px-3 py-1.5 text-slate-400">{formatDateForDisplay(row.arrival_date)}</td>
                      <td className="px-3 py-1.5 text-slate-400">{row.carrier || '\u2014'}</td>
                      <td className="px-3 py-1.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          row.action === 'create' ? 'bg-emerald-500/20 text-emerald-400' :
                          row.action === 'update' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-slate-600/50 text-slate-400'
                        }`}>
                          {row.action}
                        </span>
                      </td>
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
                  <div className="text-xs text-slate-500">Nuevos</div>
                  <div className="text-xl font-bold text-slate-200">{preview.new_boats}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Actualizados</div>
                  <div className="text-xl font-bold text-slate-200">{preview.updated_boats}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Sin cambios</div>
                  <div className="text-xl font-bold text-slate-200">{preview.skipped_boats}</div>
                </div>
                {preview.earliest_departure && preview.latest_departure && (
                  <div className="bg-slate-900 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Rango de fechas</div>
                    <div className="text-sm font-bold text-slate-200">
                      {formatDateForDisplay(preview.earliest_departure)} – {formatDateForDisplay(preview.latest_departure)}
                    </div>
                  </div>
                )}
              </div>

              {/* Warnings */}
              {preview.warnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  {preview.warnings.map((warning, i) => (
                    <div key={i} className="text-xs text-amber-400">{'\u2022'} {warning}</div>
                  ))}
                </div>
              )}

              {/* Skipped Rows */}
              {preview.skipped_rows.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <div className="text-sm text-red-400 font-medium">
                    {preview.skipped_rows.length} filas omitidas
                  </div>
                  <div className="mt-1 text-xs text-slate-400 space-y-0.5">
                    {preview.skipped_rows.slice(0, 5).map((skip, i) => (
                      <div key={i}>{'\u2022'} Fila {skip.row}: {skip.reason}</div>
                    ))}
                    {preview.skipped_rows.length > 5 && (
                      <div className="text-slate-500">...y {preview.skipped_rows.length - 5} más</div>
                    )}
                  </div>
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
          <div className="py-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-slate-400">{t('boatUpload.confirming', 'Saving...')}</p>
          </div>
        )}

        {/* Success State */}
        {uploadState === 'success' && result && (
          <>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <h4 className="font-medium text-emerald-400">Carga exitosa</h4>
              <div className="mt-2 space-y-1 text-sm text-emerald-300/80">
                <p>{result.imported} barcos importados</p>
                <p>{result.updated} barcos actualizados</p>
                {result.skipped > 0 && (
                  <p>{result.skipped} sin cambios</p>
                )}
              </div>
            </div>

            {result.skipped_rows && result.skipped_rows.length > 0 && (
              <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <div className="text-sm text-amber-400 font-medium">
                  {result.skipped_rows.length} filas omitidas
                </div>
                <div className="mt-1 text-xs text-slate-400 space-y-0.5">
                  {result.skipped_rows.slice(0, 3).map((skip, i) => (
                    <div key={i}>{'\u2022'} Fila {skip.row}: {skip.reason}</div>
                  ))}
                  {result.skipped_rows.length > 3 && (
                    <div className="text-slate-500">...y {result.skipped_rows.length - 3} más</div>
                  )}
                </div>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="text-sm text-red-400 font-medium">Errores</div>
                <div className="mt-1 text-xs text-slate-400 space-y-0.5">
                  {result.errors.slice(0, 3).map((err, i) => (
                    <div key={i}>{'\u2022'} {err}</div>
                  ))}
                  {result.errors.length > 3 && (
                    <div className="text-slate-500">...y {result.errors.length - 3} más</div>
                  )}
                </div>
              </div>
            )}

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
              errorMessage={errorMessage || t('boatUpload.uploadFailed')}
              missingColumns={missingColumns}
              foundColumns={foundColumns}
              onRetry={handleModalClose}
            />
            {result && result.errors && result.errors.length > 0 && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-left text-sm max-h-32 overflow-y-auto">
                <ul className="text-red-700 text-xs">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </UploadPreviewModal>
    </div>
  );
}
