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
  const [selectedBoatId, setSelectedBoatId] = useState<string | null>(null);
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
    setSelectedBoatId(null);
    setShowUnmatched(false);
    setShowDetails(false);
    setShowReconciliation(false);
    setMissingColumns([]);
    setFoundColumns([]);
    setModalOpen(true);

    try {
      const data = await dataHubApi.parseInTransit(f);
      setParseResult(data);
      // Pre-select suggested boat
      const suggested = data.candidate_boats.find(b => b.is_suggested);
      if (suggested) setSelectedBoatId(suggested.boat_id);
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
      const data = await dataHubApi.uploadInTransit(file, selectedBoatId || undefined);
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
    setSelectedBoatId(null);
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

  const selectedBoat = parseResult?.candidate_boats.find(b => b.boat_id === selectedBoatId);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {t('dataHub.inTransit.title', 'Despacho / En Transito')}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
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
      >
        {/* Parsing state */}
        {uploadState === 'parsing' && (
          <div className="py-12 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">
              {t('dataHub.inTransit.parsing', 'Analizando archivo...')}
            </p>
          </div>
        )}

        {/* Preview state — show products + boat selector */}
        {uploadState === 'preview' && parseResult && (
          <div className="space-y-5">
            {/* Boat selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('dataHub.inTransit.selectBoat', 'Seleccionar barco')}
              </label>
              <select
                value={selectedBoatId || ''}
                onChange={(e) => setSelectedBoatId(e.target.value || null)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">
                  {t('dataHub.inTransit.noBoatSelected', 'Sin barco — solo actualizar inventario')}
                </option>
                {parseResult.candidate_boats.map((boat) => (
                  <option key={boat.boat_id} value={boat.boat_id}>
                    {boat.vessel_name} — {t('dataHub.inTransit.departure', 'Sale')} {boat.departure_date}
                    {boat.carrier ? ` (${boat.carrier})` : ''}
                    {boat.draft_status === 'drafting' ? ` — Borrador (${boat.draft_pallets ?? 0} pal.)` : ''}
                    {boat.draft_status === 'action_needed' ? ' — Requiere revisión' : ''}
                    {boat.draft_status === 'ordered' ? ' — Ya pedido' : ''}
                    {boat.draft_status === 'confirmed' ? ' — Confirmado' : ''}
                    {!boat.draft_status ? ` — ${t('dataHub.inTransit.noDraft', 'Sin borrador')}` : ''}
                    {boat.is_suggested ? ` ★` : ''}
                  </option>
                ))}
              </select>
              {selectedBoat && !selectedBoat.draft_status && (
                <p className="mt-1.5 text-xs text-amber-600">
                  {t('dataHub.inTransit.noDraftWarning', 'Este barco no tiene borrador — solo se actualizará el inventario en tránsito.')}
                </p>
              )}
              {selectedBoat && (selectedBoat.draft_status === 'ordered' || selectedBoat.draft_status === 'confirmed') && (
                <p className="mt-1.5 text-xs text-amber-600">
                  {t('dataHub.inTransit.alreadyOrderedWarning', 'Este barco ya fue marcado como pedido/confirmado.')}
                </p>
              )}
            </div>

            {/* Summary bar */}
            <div className="flex gap-3">
              <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-blue-900">{parseResult.products.length}</div>
                <div className="text-xs text-blue-600">{t('dataHub.inTransit.productsFound', 'productos')}</div>
              </div>
              <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-blue-900">{parseResult.total_m2.toLocaleString()}</div>
                <div className="text-xs text-blue-600">m² total</div>
              </div>
              {parseResult.unmatched_skus.length > 0 && (
                <div className="flex-1 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-amber-900">{parseResult.unmatched_skus.length}</div>
                  <div className="text-xs text-amber-600">{t('dataHub.inTransit.unmatchedSkus', 'no encontrados')}</div>
                </div>
              )}
            </div>

            {/* Unmatched SKUs warning */}
            {parseResult.unmatched_skus.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <button
                  onClick={() => setShowUnmatched(!showUnmatched)}
                  className="text-sm text-amber-700 hover:text-amber-900 font-medium"
                >
                  {showUnmatched ? '\u25BC' : '\u25B6'} {parseResult.unmatched_skus.length}{' '}
                  {t('dataHub.inTransit.unmatchedSkusLabel', 'SKUs no encontrados en el sistema')}
                </button>
                {showUnmatched && (
                  <div className="mt-2 bg-white rounded p-2 text-xs text-gray-700 max-h-32 overflow-y-auto">
                    {parseResult.unmatched_skus.map((sku, i) => (
                      <div key={i} className="py-0.5">{'\u2022'} {sku}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Products table */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {t('dataHub.inTransit.parsedProducts', 'Productos en despacho')}
              </h4>
              <div className="overflow-auto max-h-64 border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">m²</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parseResult.products.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 text-gray-900">{p.sku}</td>
                        <td className="px-3 py-1.5 text-right text-gray-700">{p.in_transit_m2.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {selectedBoatId && selectedBoat?.draft_status === 'drafting'
                ? t('dataHub.inTransit.confirmUpload', 'Subir y marcar como pedido')
                : t('dataHub.inTransit.confirmUploadNoDraft', 'Subir inventario en tránsito')
              }
            </button>
          </div>
        )}

        {/* Uploading state */}
        {uploadState === 'uploading' && (
          <div className="py-12 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">
              {t('dataHub.inTransit.uploading', 'Procesando archivo...')}
            </p>
          </div>
        )}

        {/* Success state */}
        {uploadState === 'success' && uploadResult && (
          <div className="space-y-4">
            {/* Draft promoted badge */}
            {uploadResult.promoted_boat_name && (
              <div className="p-3 bg-green-100 border border-green-300 rounded-lg flex items-center gap-2">
                <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-green-800">
                  {t('dataHub.inTransit.draftPromoted', 'Borrador promovido a Pedido')} — {uploadResult.promoted_boat_name}
                </span>
              </div>
            )}

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800">
                {t('dataHub.inTransit.successTitle', 'Carga exitosa')}
              </h4>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="text-sm text-gray-500">
                    {t('dataHub.inTransit.productsUpdated', 'Productos actualizados')}
                  </div>
                  <div className="text-lg font-bold text-gray-900">{uploadResult.products_updated}</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="text-sm text-gray-500">
                    {t('dataHub.inTransit.productsReset', 'Productos reseteados')}
                  </div>
                  <div className="text-lg font-bold text-gray-900">{uploadResult.products_reset}</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100 col-span-2">
                  <div className="text-sm text-gray-500">
                    {t('dataHub.inTransit.totalInTransitM2', 'Total en transito m\u00B2')}
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {uploadResult.total_in_transit_m2.toLocaleString()} m²
                  </div>
                </div>
              </div>

              {/* Snapshot date */}
              <div className="mt-3 text-sm text-green-700">
                {t('dataHub.inTransit.snapshotDateLabel', 'Fecha de corte')}: {uploadResult.snapshot_date}
              </div>

              {/* Excluded orders */}
              {uploadResult.excluded_orders.length > 0 && (
                <div className="mt-2 text-sm text-green-700">
                  {t('dataHub.inTransit.excludedOrders', 'Pedidos excluidos')}: {uploadResult.excluded_orders.join(', ')}
                </div>
              )}
            </div>

            {/* Unmatched SKUs */}
            {uploadResult.unmatched_skus.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <button
                  onClick={() => setShowUnmatched(!showUnmatched)}
                  className="text-sm text-amber-700 hover:text-amber-900 font-medium"
                >
                  {showUnmatched ? '\u25BC' : '\u25B6'} {uploadResult.unmatched_skus.length}{' '}
                  {t('dataHub.inTransit.unmatchedSkus', 'SKUs no encontrados')}
                </button>
                {showUnmatched && (
                  <div className="mt-2 bg-white rounded p-2 text-xs text-gray-700 max-h-32 overflow-y-auto">
                    {uploadResult.unmatched_skus.map((sku, i) => (
                      <div key={i} className="py-0.5">{'\u2022'} {sku}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Details */}
            {uploadResult.details.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-sm text-blue-700 hover:text-blue-900 font-medium"
                >
                  {showDetails ? '\u25BC' : '\u25B6'}{' '}
                  {t('dataHub.inTransit.viewDetails', 'Ver detalle por producto')} ({uploadResult.details.length})
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
                        {uploadResult.details.map((d, i) => (
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

            {/* Reconciliation */}
            {uploadResult.reconciliation && (
              <div className={`rounded-lg p-3 border ${
                uploadResult.reconciliation.mismatched > 0 || uploadResult.reconciliation.dispatch_only > 0 || uploadResult.reconciliation.draft_only > 0
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-green-50 border-green-200'
              }`}>
                <button
                  onClick={() => setShowReconciliation(!showReconciliation)}
                  className={`text-sm font-medium ${
                    uploadResult.reconciliation.mismatched > 0
                      ? 'text-orange-700 hover:text-orange-900'
                      : 'text-green-700 hover:text-green-900'
                  }`}
                >
                  {showReconciliation ? '\u25BC' : '\u25B6'}{' '}
                  {t('dataHub.inTransit.reconciliation', 'Conciliacion vs Borradores')}
                </button>
                <div className="mt-2 flex gap-3 text-xs">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                    {uploadResult.reconciliation.matched} {t('dataHub.inTransit.matched', 'coinciden')}
                  </span>
                  {uploadResult.reconciliation.mismatched > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                      {uploadResult.reconciliation.mismatched} {t('dataHub.inTransit.mismatched', 'difieren')}
                    </span>
                  )}
                  {uploadResult.reconciliation.dispatch_only > 0 && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded">
                      {uploadResult.reconciliation.dispatch_only} {t('dataHub.inTransit.dispatchOnly', 'solo en despacho')}
                    </span>
                  )}
                  {uploadResult.reconciliation.draft_only > 0 && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                      {uploadResult.reconciliation.draft_only} {t('dataHub.inTransit.draftOnly', 'solo en borrador')}
                    </span>
                  )}
                </div>
                {showReconciliation && uploadResult.reconciliation.items.length > 0 && (
                  <div className="mt-3 overflow-auto max-h-48">
                    <table className="w-full text-sm">
                      <thead className="bg-white/60">
                        <tr>
                          <th className="px-2 py-1 text-left">SKU</th>
                          <th className="px-2 py-1 text-right">{t('dataHub.inTransit.dispatchM2', 'Despacho m\u00B2')}</th>
                          <th className="px-2 py-1 text-right">{t('dataHub.inTransit.draftM2', 'Borrador m\u00B2')}</th>
                          <th className="px-2 py-1 text-right">{t('dataHub.inTransit.diffM2', 'Dif m\u00B2')}</th>
                          <th className="px-2 py-1 text-left">{t('dataHub.inTransit.boat', 'Barco')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {uploadResult.reconciliation.items.map((item, i) => (
                          <tr key={i} className={
                            item.status === 'mismatch' ? 'bg-red-50' :
                            item.status === 'dispatch_only' ? 'bg-amber-50' :
                            'bg-purple-50'
                          }>
                            <td className="px-2 py-1 font-medium">{item.sku}</td>
                            <td className="px-2 py-1 text-right">{item.dispatch_m2.toLocaleString()}</td>
                            <td className="px-2 py-1 text-right">{item.draft_m2.toLocaleString()}</td>
                            <td className={`px-2 py-1 text-right font-medium ${
                              item.diff_m2 > 0 ? 'text-red-600' : item.diff_m2 < 0 ? 'text-blue-600' : ''
                            }`}>
                              {item.diff_m2 > 0 ? '+' : ''}{item.diff_m2.toLocaleString()}
                            </td>
                            <td className="px-2 py-1 text-gray-600">{item.boat_name || '\u2014'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {showReconciliation && uploadResult.reconciliation.items.length === 0 && (
                  <p className="mt-2 text-sm text-green-700">
                    {t('dataHub.inTransit.allMatch', 'Todos los productos coinciden con los borradores.')}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleModalClose}
              className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              {t('common.close', 'Cerrar')}
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
