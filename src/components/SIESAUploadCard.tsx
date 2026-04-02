import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { dataHubApi } from '../requests/dataHub';
import type { SIESAPreview, SIESAUploadResponse, SIESAModification } from '../requests/dataHub';
import { LoadingSpinner } from './LoadingSpinner';
import { ProductSearchDropdown } from './ProductSearchDropdown';
import { UploadPreviewModal } from './UploadPreviewModal';
import { EditablePreviewTable } from './uploads/EditablePreviewTable';
import type { EditableColumn } from './uploads/EditablePreviewTable';
import { ParseDiagnosticPanel } from './uploads/ParseDiagnosticPanel';

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
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [preview, setPreview] = useState<SIESAPreview | null>(null);
  const [result, setResult] = useState<SIESAUploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [foundColumns, setFoundColumns] = useState<string[]>([]);
  const [showUnmatchedList, setShowUnmatchedList] = useState(false);
  const [manualMappings, setManualMappings] = useState<Record<string, { productId: string; sku: string }>>({});
  const [modifications, setModifications] = useState<Map<string, Record<string, unknown>>>(new Map());
  const [deletions, setDeletions] = useState<Set<string>>(new Set());

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
    setModalOpen(true);
    setErrorMessage(null);
    setResult(null);
    setPreview(null);

    try {
      const previewData = await dataHubApi.previewSIESA(fileToUpload);
      setPreview(previewData);
      setUploadState('preview');
    } catch (err: any) {
      const details = err.response?.data?.error?.details;
      if (details?.missing_columns) setMissingColumns(details.missing_columns);
      if (details?.found_columns) setFoundColumns(details.found_columns);
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
      const mappings = Object.entries(manualMappings)
        .filter(([, v]) => v.productId)
        .map(([key, v]) => ({ original_key: key, mapped_product_id: v.productId }));

      // Build modifications array from Map
      const modsArray: SIESAModification[] = Array.from(modifications.entries()).map(([lotCode, changes]) => ({
        lot_code: lotCode,
        ...(changes.factory_available_m2 !== undefined ? { factory_available_m2: changes.factory_available_m2 as number } : {}),
      }));
      const deletionsArray = Array.from(deletions);

      const uploadResult = await dataHubApi.confirmSIESA(
        preview.preview_id,
        mappings.length > 0 ? mappings : undefined,
        modsArray.length > 0 ? modsArray : undefined,
        deletionsArray.length > 0 ? deletionsArray : undefined,
      );
      setResult(uploadResult);
      setUploadState('success');
      onUploadSuccess?.();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setErrorMessage(
        axiosErr.response?.data?.error?.message || t('dataHub.uploadFailed')
      );
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
    setShowUnmatchedList(false);
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

  const siesaColumns: EditableColumn[] = [
    { key: 'sku', label: 'SKU', editable: false, type: 'text', width: 'w-48' },
    { key: 'lot_code', label: 'Lote', editable: false, type: 'text', width: 'w-32' },
    { key: 'factory_available_m2', label: 'Disponible (m\u00B2)', editable: true, type: 'number', width: 'w-32' },
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
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">
        {t('dataHub.inventory.title')}
      </h3>

      {/* Idle State - Card Content */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : file
            ? 'border-green-500 bg-green-50'
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
            {t('dataHub.inventory.dropzone')}
          </p>
          <p className="mt-1 text-xs text-slate-500">XLS / XLSX</p>
          <input
            type="file"
            className="hidden"
            accept=".xls,.xlsx"
            onChange={handleFileSelect}
          />
        </label>
      </div>

      {/* Inline error for invalid file type (not in modal) */}
      {errorMessage && uploadState === 'idle' && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="mt-4 text-sm text-slate-500">
        <p>{t('dataHub.inventory.lastUpload')}: {formatLastUpdated()}</p>
        {recordCount !== undefined && recordCount > 0 && (
          <p>{recordCount.toLocaleString()} {t('dataHub.inventory.lotsCount')}</p>
        )}
      </div>

      {/* Upload Preview Modal */}
      <UploadPreviewModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        title={t('dataHub.inventory.title')}
        wide={uploadState === 'preview'}
      >
        {/* Parsing State */}
        {uploadState === 'parsing' && (
          <div className="py-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-slate-400">{t('dataHub.inventory.parsing', 'Parsing file...')}</p>
          </div>
        )}

        {/* Preview State — Dual Pane */}
        {uploadState === 'preview' && preview && (
          <div className="flex gap-6 min-h-0">
            {/* Left: Editable lots table */}
            <div className="flex-1 min-w-0 overflow-auto max-h-[65vh]">
              <EditablePreviewTable
                rows={preview.rows as unknown as Record<string, unknown>[]}
                columns={siesaColumns}
                rowKeyField="lot_code"
                onModify={handleModify}
                onDelete={handleDelete}
                onUndoDelete={handleUndoDelete}
                modifications={modifications}
                deletions={deletions}
              />
            </div>

            {/* Right: Summary + Confirm */}
            <div className="w-72 shrink-0 flex flex-col gap-4">
              {/* Summary stats */}
              <div className="space-y-3">
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Filas</div>
                  <div className="text-xl font-bold text-slate-200">{preview.total_rows}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Lotes</div>
                  <div className="text-xl font-bold text-slate-200">{preview.lots_count}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Productos</div>
                  <div className="text-xl font-bold text-slate-200">{preview.unique_products}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Total m²</div>
                  <div className="text-xl font-bold text-slate-200">{preview.total_m2_available.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Total kg</div>
                  <div className="text-xl font-bold text-slate-200">{preview.total_weight_kg.toLocaleString()}</div>
                </div>
              </div>

              {/* Match rate */}
              <div className="text-xs text-slate-500 text-center">
                {preview.match_rate_pct.toFixed(1)}% match rate
              </div>

              {/* Unmatched warnings */}
              {preview.unmatched_count > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <div className="text-sm text-red-400 font-medium">{preview.unmatched_count} sin match</div>
                  <button
                    onClick={() => setShowUnmatchedList(!showUnmatchedList)}
                    className="text-xs text-red-400/70 hover:text-red-300 mt-1"
                  >
                    {showUnmatchedList ? '\u25BC' : '\u25B6'} ver detalles
                  </button>
                  {showUnmatchedList && (
                    <div className="mt-2 space-y-2 max-h-48 overflow-auto">
                      <p className="text-xs text-slate-500">Mapear a producto existente:</p>
                      {preview.unmatched_products.map((prod, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-red-400 flex-1 truncate" title={prod}>{'\u2022'} {prod}</span>
                          <ProductSearchDropdown
                            onSelect={(productId, sku) =>
                              setManualMappings((prev) => ({
                                ...prev,
                                [prod]: { productId, sku },
                              }))
                            }
                            selectedSku={manualMappings[prod]?.sku || null}
                            placeholder="Buscar..."
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Warehouse Breakdown */}
              {preview.warehouses.length > 0 && (
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-2">Bodegas</div>
                  <div className="space-y-1 text-xs">
                    {preview.warehouses.map((wh, i) => (
                      <div key={i} className="flex justify-between text-slate-400">
                        <span>{wh.name}</span>
                        <span>{wh.total_m2.toLocaleString()} m²</span>
                      </div>
                    ))}
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
            <p className="mt-4 text-slate-400">{t('dataHub.inventory.saving', 'Saving...')}</p>
          </div>
        )}

        {/* Success State */}
        {uploadState === 'success' && result && (
          <>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <h4 className="font-medium text-emerald-400">Carga exitosa</h4>
              <div className="mt-2 space-y-1 text-sm text-emerald-300/80">
                <p>{result.lots_created} lotes creados</p>
                <p>{result.unique_products} productos actualizados</p>
                <p>{result.total_m2_available.toLocaleString()} m² disponibles</p>
                <p className="font-medium text-emerald-400">
                  {result.match_rate_pct.toFixed(1)}% match rate
                </p>
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
          <ParseDiagnosticPanel
            errorMessage={errorMessage || t('dataHub.uploadFailed', 'Upload Failed')}
            missingColumns={missingColumns}
            foundColumns={foundColumns}
            onRetry={handleReset}
          />
        )}
      </UploadPreviewModal>
    </div>
  );
}
