import { useState, useCallback } from 'react';
import { dataHubApi } from '../requests/dataHub';
import type { UnfulfilledDemandPreview, UnfulfilledDemandResponse, UnfulfilledDemandModification } from '../requests/dataHub';
import { LoadingSpinner } from './LoadingSpinner';
import { UploadPreviewModal } from './UploadPreviewModal';
import { EditablePreviewTable } from './uploads/EditablePreviewTable';
import type { EditableColumn } from './uploads/EditablePreviewTable';
import { ParseDiagnosticPanel } from './uploads/ParseDiagnosticPanel';

type UploadState = 'idle' | 'parsing' | 'preview' | 'confirming' | 'success' | 'error';

interface Props {
  onUploadSuccess: () => void;
}

const columns: EditableColumn[] = [
  { key: 'sku', label: 'Producto', editable: false, type: 'text', width: 'w-48' },
  { key: 'quantity_m2', label: 'Cantidad (m\u00B2)', editable: true, type: 'number', width: 'w-32' },
  { key: 'snapshot_date', label: 'Fecha', editable: false, type: 'text', width: 'w-28' },
];

export function UnfulfilledDemandCard({ onUploadSuccess }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [preview, setPreview] = useState<UnfulfilledDemandPreview | null>(null);
  const [result, setResult] = useState<UnfulfilledDemandResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [foundColumns, setFoundColumns] = useState<string[]>([]);
  const [modifications, setModifications] = useState<Map<string, Record<string, unknown>>>(new Map());
  const [deletions, setDeletions] = useState<Set<string>>(new Set());

  const isValidFile = (f: File): boolean => {
    return (
      f.name.endsWith('.xls') ||
      f.name.endsWith('.xlsx') ||
      f.type === 'application/vnd.ms-excel' ||
      f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
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

  const handleUpload = async (fileToUpload: File) => {
    setUploadState('parsing');
    setModalOpen(true);
    setErrorMessage(null);
    setResult(null);
    setPreview(null);
    setModifications(new Map());
    setDeletions(new Set());

    try {
      const previewData = await dataHubApi.previewUnfulfilledDemand(fileToUpload);
      setPreview(previewData);
      setUploadState('preview');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string; details?: { missing_columns?: string[]; found_columns?: string[] } }; detail?: string } } };
      const details = axiosErr.response?.data?.error?.details;
      if (details?.missing_columns) setMissingColumns(details.missing_columns);
      if (details?.found_columns) setFoundColumns(details.found_columns);
      setErrorMessage(
        axiosErr.response?.data?.error?.message ||
        axiosErr.response?.data?.detail ||
        'Error al procesar el archivo'
      );
      setUploadState('error');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFile(droppedFile)) {
      handleUpload(droppedFile);
    } else {
      setErrorMessage('Por favor sube un archivo Excel (.xlsx o .xls)');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      handleUpload(selectedFile);
    } else if (selectedFile) {
      setErrorMessage('Por favor sube un archivo Excel (.xlsx o .xls)');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async () => {
    if (!preview) return;
    setUploadState('confirming');

    try {
      // Build modifications array from Map
      const modsArray: UnfulfilledDemandModification[] = Array.from(modifications.entries()).map(
        ([sku, changes]) => ({
          sku,
          ...(changes.quantity_m2 !== undefined ? { quantity_m2: changes.quantity_m2 as number } : {}),
        })
      );
      const deletionsArray = Array.from(deletions);

      const uploadResult = await dataHubApi.confirmUnfulfilledDemand(
        preview.preview_id,
        modsArray.length > 0 ? modsArray : undefined,
        deletionsArray.length > 0 ? deletionsArray : undefined,
      );
      setResult(uploadResult);
      setUploadState('success');
      onUploadSuccess();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string }; detail?: string } } };
      setErrorMessage(
        axiosErr.response?.data?.error?.message ||
        axiosErr.response?.data?.detail ||
        'Error al confirmar la carga'
      );
      setUploadState('error');
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setUploadState('idle');
    setModalOpen(false);
  };

  const handleReset = () => {
    setUploadState('idle');
    setPreview(null);
    setResult(null);
    setErrorMessage(null);
    setMissingColumns([]);
    setFoundColumns([]);
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Productos Faltantes</h3>
          <p className="text-sm text-gray-500">Demanda no satisfecha por agotamiento</p>
        </div>
        <span className="text-2xl">{'\u26A0\uFE0F'}</span>
      </div>

      {/* Drag-and-drop zone */}
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
            Arrastra el archivo Excel o haz clic para buscar
          </p>
          <p className="mt-1 text-xs text-gray-500">XLS / XLSX</p>
          <input
            type="file"
            className="hidden"
            accept=".xls,.xlsx"
            onChange={handleFileSelect}
          />
        </label>
      </div>

      {/* Inline error for invalid file type */}
      {errorMessage && uploadState === 'idle' && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      {/* Upload Preview Modal */}
      <UploadPreviewModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        title="Productos Faltantes"
      >
        {/* Parsing State */}
        {uploadState === 'parsing' && (
          <div className="py-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Procesando archivo...</p>
          </div>
        )}

        {/* Preview State */}
        {uploadState === 'preview' && preview && (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Filas</div>
                <div className="text-lg font-bold text-gray-900">{preview.row_count}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Fecha corte</div>
                <div className="text-lg font-bold text-gray-900">{preview.snapshot_date}</div>
              </div>
            </div>

            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-sm font-medium text-amber-800 mb-1">Advertencias</div>
                {preview.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-amber-700">{'\u2022'} {w}</p>
                ))}
              </div>
            )}

            {/* Editable Table */}
            <EditablePreviewTable
              rows={preview.rows as unknown as Record<string, unknown>[]}
              columns={columns}
              rowKeyField="sku"
              onModify={handleModify}
              onDelete={handleDelete}
              onUndoDelete={handleUndoDelete}
              modifications={modifications}
              deletions={deletions}
            />

            {/* Confirm / Cancel Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Confirmar carga
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Confirming State */}
        {uploadState === 'confirming' && (
          <div className="py-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Guardando...</p>
          </div>
        )}

        {/* Success State */}
        {uploadState === 'success' && result && (
          <>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-green-800">Carga exitosa</h4>
                <div className="mt-2 space-y-1 text-sm text-green-700">
                  <p>{result.records_upserted} registros guardados</p>
                  <p>Fecha corte: {result.snapshot_date}</p>
                  <p>{result.message}</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleModalClose}
              className="mt-4 w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              Cargar otro archivo
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
    </div>
  );
}
