import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { dataHubApi } from '../requests/dataHub';
import type { InTransitUploadResponse, InTransitParseResponse } from '../requests/dataHub';
import { LoadingSpinner } from './LoadingSpinner';
import { UploadPreviewModal } from './UploadPreviewModal';
import { ParseDiagnosticPanel } from './uploads/ParseDiagnosticPanel';

type UploadState = 'idle' | 'parsing' | 'preview' | 'uploading' | 'success' | 'error';

interface InTransitUploadCardProps {
  onUploadSuccess?: () => void;
}

export function InTransitUploadCard({ onUploadSuccess }: InTransitUploadCardProps) {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<InTransitParseResponse | null>(null);
  const [uploadResult, setUploadResult] = useState<InTransitUploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [foundColumns, setFoundColumns] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showReconciliation, setShowReconciliation] = useState(false);

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

  const handleParse = async (f: File) => {
    setFile(f);
    setUploadState('parsing');
    setErrorMessage(null);
    setParseResult(null);
    setUploadResult(null);
    setShowUnmatched(false);
    setShowDetails(false);
    setShowReconciliation(false);
    setMissingColumns([]);
    setFoundColumns([]);
    setModalOpen(true);

    try {
      const data = await dataHubApi.parseInTransit(f);
      setParseResult(data);
      setUploadState('preview');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string; details?: { missing_columns?: string[]; found_columns?: string[] } }; detail?: string } } };
      const details = axiosErr.response?.data?.error?.details;
      if (details?.missing_columns) setMissingColumns(details.missing_columns);
      if (details?.found_columns) setFoundColumns(details.found_columns);
      setErrorMessage(
        axiosErr.response?.data?.error?.message ||
        axiosErr.response?.data?.detail ||
        t('dataHub.inTransit.uploadError', 'Upload failed'),
      );
      setUploadState('error');
    }
  };

  const handleConfirm = async () => {
    if (!file) return;
    setUploadState('uploading');

    try {
      const data = await dataHubApi.uploadInTransit(file);
      setUploadResult(data);
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
        handleParse(droppedFile);
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
        handleParse(selectedFile);
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
    setFile(null);
    setParseResult(null);
    setUploadResult(null);
    setErrorMessage(null);
    setMissingColumns([]);
    setFoundColumns([]);
    setModalOpen(false);
    setShowUnmatched(false);
    setShowDetails(false);
    setShowReconciliation(false);
  };

  const handleModalClose = () => {
    if (uploadState === 'success') {
      onUploadSuccess?.();
    }
    handleReset();
  };

  const matchedCount = parseResult?.booking_matches?.filter(m => m.boat_id).length ?? 0;
  const unmatchedOrderCount = parseResult?.booking_matches?.filter(m => !m.boat_id).length ?? 0;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-200 mb-1">
        {t('dataHub.inTransit.title', 'Despacho / En Transito')}
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        {t('dataHub.inTransit.subtitle', 'Excel de despacho en transito (.xlsx, .xls)')}
      </p>

      {/* Drag-drop zone — always visible when idle */}
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
            {t('dataHub.inTransit.dropzone', 'Arrastra el archivo Excel o haz clic para buscar')}
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

      {/* Inline error for invalid file type (when no modal is open) */}
      {errorMessage && !modalOpen && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      {/* Modal for parse preview, upload, success, and errors */}
      <UploadPreviewModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        title={t('dataHub.inTransit.title', 'Despacho / En Transito')}
        wide={uploadState === 'preview'}
      >
        {/* Parsing state */}
        {uploadState === 'parsing' && (
          <div className="py-12 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-slate-400">
              {t('dataHub.inTransit.parsing', 'Analizando archivo...')}
            </p>
          </div>
        )}

        {/* Preview state — Dual Pane: Boat-centric */}
        {uploadState === 'preview' && parseResult && (
          <div className="flex gap-6 min-h-0">
            {/* Left: Orders grouped by boat */}
            <div className="flex-1 min-w-0 overflow-auto max-h-[65vh] space-y-4">
              {(() => {
                // Group orders by vessel name
                const boatGroups: Record<string, typeof parseResult.booking_matches> = {};
                for (const match of (parseResult.booking_matches || [])) {
                  const key = match.vessel_name || 'Sin barco';
                  if (!boatGroups[key]) boatGroups[key] = [];
                  boatGroups[key].push(match);
                }
                return Object.entries(boatGroups).map(([vessel, orders]) => (
                  <div key={vessel} className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-700/30 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-200">{vessel}</span>
                      <span className="text-xs text-slate-500">
                        {orders.reduce((s, o) => s + o.items_count, 0)} prod &middot; {orders.reduce((s, o) => s + o.total_m2, 0).toLocaleString()} m²
                      </span>
                    </div>
                    {orders.map((order, oi) => (
                      <div key={oi}>
                        <div className="px-3 py-1.5 text-xs text-slate-500 border-b border-slate-700/30 bg-slate-800/30">
                          {order.factura} {order.booking_number && <span className="text-slate-600 ml-1">{order.booking_number}</span>}
                        </div>
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-slate-700/30">
                            {(order.items || []).map((item, ii) => (
                              <tr key={ii} className="hover:bg-slate-700/20">
                                <td className="px-3 py-1 text-slate-500 text-xs w-1/3">{item.raw_sku || item.sku}</td>
                                <td className="px-3 py-1 text-slate-200 font-medium">{item.sku}</td>
                                <td className="px-3 py-1 text-right text-slate-300">{item.m2.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>

            {/* Right: Summary + Confirm */}
            <div className="w-72 shrink-0 flex flex-col gap-4">
              <div className="space-y-3">
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Productos</div>
                  <div className="text-xl font-bold text-slate-200">{parseResult.products.length}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Total m²</div>
                  <div className="text-xl font-bold text-slate-200">{parseResult.total_m2.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Barcos</div>
                  <div className="text-xl font-bold text-slate-200">
                    {parseResult.booking_matches?.filter(m => m.boat_id).length || 0}
                  </div>
                </div>
              </div>

              {unmatchedOrderCount > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <div className="text-xs text-amber-400">{unmatchedOrderCount} orden(es) sin barco</div>
                </div>
              )}

              {/* Unmatched SKUs warning */}
              {parseResult.unmatched_skus.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <div className="text-sm text-red-400 font-medium">{parseResult.unmatched_skus.length} sin match</div>
                  <button
                    onClick={() => setShowUnmatched(!showUnmatched)}
                    className="text-xs text-red-400/70 hover:text-red-300 mt-1"
                  >
                    {showUnmatched ? '\u25BC' : '\u25B6'} ver detalles
                  </button>
                  {showUnmatched && (
                    <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                      {parseResult.unmatched_skus.map((sku, i) => (
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
                  {matchedCount > 0
                    ? `Subir despacho (${matchedCount} barco${matchedCount > 1 ? 's' : ''} detectado${matchedCount > 1 ? 's' : ''})`
                    : 'Subir inventario en tránsito'
                  }
                </button>
                <button
                  onClick={handleReset}
                  className="w-full px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Uploading state */}
        {uploadState === 'uploading' && (
          <div className="py-12 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-slate-400">
              {t('dataHub.inTransit.uploading', 'Procesando archivo...')}
            </p>
          </div>
        )}

        {/* Success state */}
        {uploadState === 'success' && uploadResult && (
          <div className="space-y-4">
            {/* Draft promoted badge */}
            {uploadResult.promoted_boat_name && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-emerald-400">
                  Borrador promovido a Pedido — {uploadResult.promoted_boat_name}
                </span>
              </div>
            )}

            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <h4 className="font-medium text-emerald-400">Carga exitosa</h4>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Productos actualizados</div>
                  <div className="text-lg font-bold text-slate-200">{uploadResult.products_updated}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Productos reseteados</div>
                  <div className="text-lg font-bold text-slate-200">{uploadResult.products_reset}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 col-span-2">
                  <div className="text-xs text-slate-500">Total en tránsito m²</div>
                  <div className="text-lg font-bold text-slate-200">
                    {uploadResult.total_in_transit_m2.toLocaleString()} m²
                  </div>
                </div>
              </div>

              {/* Snapshot date */}
              <div className="mt-3 text-sm text-emerald-300/80">
                Fecha de corte: {uploadResult.snapshot_date}
              </div>

              {/* Excluded orders */}
              {uploadResult.excluded_orders.length > 0 && (
                <div className="mt-2 text-sm text-emerald-300/80">
                  Pedidos excluidos: {uploadResult.excluded_orders.join(', ')}
                </div>
              )}
            </div>

            {/* Unmatched SKUs */}
            {uploadResult.unmatched_skus.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <button
                  onClick={() => setShowUnmatched(!showUnmatched)}
                  className="text-sm text-amber-400 hover:text-amber-300 font-medium"
                >
                  {showUnmatched ? '\u25BC' : '\u25B6'} {uploadResult.unmatched_skus.length} SKUs no encontrados
                </button>
                {showUnmatched && (
                  <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                    {uploadResult.unmatched_skus.map((sku, i) => (
                      <div key={i}>{'\u2022'} {sku}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Details */}
            {uploadResult.details.length > 0 && (
              <div className="bg-slate-900 rounded-lg p-3">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-sm text-slate-400 hover:text-slate-300 font-medium"
                >
                  {showDetails ? '\u25BC' : '\u25B6'} Ver detalle por producto ({uploadResult.details.length})
                </button>
                {showDetails && (
                  <div className="mt-2 overflow-auto max-h-48">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-700">
                        <tr>
                          <th className="px-2 py-1 text-left text-xs text-slate-400">SKU</th>
                          <th className="px-2 py-1 text-right text-xs text-slate-400">En tránsito m²</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {uploadResult.details.map((d, i) => (
                          <tr key={i}>
                            <td className="px-2 py-1 text-slate-300">{d.sku}</td>
                            <td className="px-2 py-1 text-right text-slate-300">
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

            {/* Reconciliation */}
            {uploadResult.reconciliation && (
              <div className={`rounded-lg p-3 border ${
                uploadResult.reconciliation.mismatched > 0 || uploadResult.reconciliation.dispatch_only > 0 || uploadResult.reconciliation.draft_only > 0
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}>
                <button
                  onClick={() => setShowReconciliation(!showReconciliation)}
                  className={`text-sm font-medium ${
                    uploadResult.reconciliation.mismatched > 0
                      ? 'text-amber-400 hover:text-amber-300'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  {showReconciliation ? '\u25BC' : '\u25B6'} Conciliación vs Borradores
                </button>
                <div className="mt-2 flex gap-3 text-xs">
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">
                    {uploadResult.reconciliation.matched} coinciden
                  </span>
                  {uploadResult.reconciliation.mismatched > 0 && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">
                      {uploadResult.reconciliation.mismatched} difieren
                    </span>
                  )}
                  {uploadResult.reconciliation.dispatch_only > 0 && (
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded">
                      {uploadResult.reconciliation.dispatch_only} solo en despacho
                    </span>
                  )}
                  {uploadResult.reconciliation.draft_only > 0 && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                      {uploadResult.reconciliation.draft_only} solo en borrador
                    </span>
                  )}
                </div>
                {showReconciliation && uploadResult.reconciliation.items.length > 0 && (
                  <div className="mt-3 overflow-auto max-h-48">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-700">
                        <tr>
                          <th className="px-2 py-1 text-left text-xs text-slate-400">SKU</th>
                          <th className="px-2 py-1 text-right text-xs text-slate-400">Despacho m²</th>
                          <th className="px-2 py-1 text-right text-xs text-slate-400">Borrador m²</th>
                          <th className="px-2 py-1 text-right text-xs text-slate-400">Dif m²</th>
                          <th className="px-2 py-1 text-left text-xs text-slate-400">Barco</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {uploadResult.reconciliation.items.map((item, i) => (
                          <tr key={i} className={
                            item.status === 'mismatch' ? 'bg-red-500/5' :
                            item.status === 'dispatch_only' ? 'bg-amber-500/5' :
                            'bg-purple-500/5'
                          }>
                            <td className="px-2 py-1 font-medium text-slate-300">{item.sku}</td>
                            <td className="px-2 py-1 text-right text-slate-300">{item.dispatch_m2.toLocaleString()}</td>
                            <td className="px-2 py-1 text-right text-slate-300">{item.draft_m2.toLocaleString()}</td>
                            <td className={`px-2 py-1 text-right font-medium ${
                              item.diff_m2 > 0 ? 'text-red-400' : item.diff_m2 < 0 ? 'text-blue-400' : 'text-slate-400'
                            }`}>
                              {item.diff_m2 > 0 ? '+' : ''}{item.diff_m2.toLocaleString()}
                            </td>
                            <td className="px-2 py-1 text-slate-500">{item.boat_name || '\u2014'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {showReconciliation && uploadResult.reconciliation.items.length === 0 && (
                  <p className="mt-2 text-sm text-emerald-400">
                    Todos los productos coinciden con los borradores.
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleModalClose}
              className="w-full px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Error state */}
        {uploadState === 'error' && (
          <ParseDiagnosticPanel
            errorMessage={errorMessage || t('dataHub.uploadFailed', 'Upload Failed')}
            missingColumns={missingColumns}
            foundColumns={foundColumns}
            onRetry={() => {
              if (file) {
                handleParse(file);
              } else {
                handleReset();
              }
            }}
          />
        )}
      </UploadPreviewModal>
    </div>
  );
}
