import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadApi } from '../requests/upload';
import type { UploadError } from '../requests/upload';
import { LoadingSpinner } from '../components/LoadingSpinner';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface UploadResult {
  inventoryCreated: number;
  salesCreated: number;
  errors: UploadError[];
}

export function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  // Auto-redirect after success
  useEffect(() => {
    if (uploadState === 'success' && redirectCountdown !== null) {
      if (redirectCountdown <= 0) {
        navigate('/');
        return;
      }
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [uploadState, redirectCountdown, navigate]);

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
    } else {
      setErrorMessage('Please upload an Excel file (.xlsx)');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
      setErrorMessage(null);
    } else if (selectedFile) {
      setErrorMessage('Please upload an Excel file (.xlsx)');
    }
  }, []);

  const isValidFile = (file: File): boolean => {
    return file.name.endsWith('.xlsx') ||
           file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploadState('uploading');
    setErrorMessage(null);
    setResult(null);

    const errors: UploadError[] = [];
    let inventoryCreated = 0;
    let salesCreated = 0;

    try {
      // Upload inventory
      try {
        const inventoryResult = await uploadApi.uploadInventory(file);
        inventoryCreated = inventoryResult.records_created;
      } catch (err: any) {
        if (err.response?.data?.error?.details) {
          const details = err.response.data.error.details;
          if (Array.isArray(details)) {
            details.forEach((d: any) => {
              errors.push({
                sheet: d.sheet || 'INVENTARIO',
                row: d.row || 0,
                field: d.field,
                error: d.error || 'Unknown error',
              });
            });
          }
        } else {
          errors.push({
            sheet: 'INVENTARIO',
            row: 0,
            error: err.response?.data?.error?.message || 'Failed to upload inventory',
          });
        }
      }

      // Upload sales
      try {
        const salesResult = await uploadApi.uploadSales(file);
        salesCreated = salesResult.created;
      } catch (err: any) {
        if (err.response?.data?.error?.details) {
          const details = err.response.data.error.details;
          if (Array.isArray(details)) {
            details.forEach((d: any) => {
              errors.push({
                sheet: d.sheet || 'VENTAS',
                row: d.row || 0,
                field: d.field,
                error: d.error || 'Unknown error',
              });
            });
          }
        } else {
          errors.push({
            sheet: 'VENTAS',
            row: 0,
            error: err.response?.data?.error?.message || 'Failed to upload sales',
          });
        }
      }

      setResult({ inventoryCreated, salesCreated, errors });

      if (inventoryCreated > 0 || salesCreated > 0) {
        setUploadState('success');
        setRedirectCountdown(3);
      } else if (errors.length > 0) {
        setUploadState('error');
      } else {
        setUploadState('error');
        setErrorMessage('No records were created. Check your Excel file format.');
      }

    } catch (err: any) {
      setUploadState('error');
      setErrorMessage(err.message || 'An unexpected error occurred');
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadState('idle');
    setResult(null);
    setErrorMessage(null);
    setRedirectCountdown(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Data</h1>
        <p className="text-gray-600">
          Upload the owner Excel template with inventory and sales data
        </p>
      </div>

      {/* Upload Zone */}
      {uploadState === 'idle' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : file
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {file ? (
              <div>
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
                <p className="mt-2 text-sm font-medium text-gray-900">{file.name}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <button
                  onClick={() => setFile(null)}
                  className="mt-3 text-sm text-red-600 hover:text-red-800"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div>
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
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
                  <label className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                    Click to upload
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx"
                      onChange={handleFileSelect}
                    />
                  </label>{' '}
                  or drag and drop
                </p>
                <p className="mt-1 text-xs text-gray-500">Excel files only (.xlsx)</p>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          )}

          {file && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleUpload}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload File
              </button>
            </div>
          )}
        </div>
      )}

      {/* Uploading State */}
      {uploadState === 'uploading' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Uploading and processing...</p>
            <p className="mt-1 text-sm text-gray-500">
              This may take a moment for large files
            </p>
          </div>
        </div>
      )}

      {/* Success State */}
      {uploadState === 'success' && result && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-green-500"
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
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Upload Successful
            </h2>
            <div className="mt-4 space-y-2">
              <p className="text-gray-600">
                <span className="font-medium">{result.inventoryCreated}</span> inventory records created
              </p>
              <p className="text-gray-600">
                <span className="font-medium">{result.salesCreated}</span> sales records created
              </p>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
                <p className="text-sm font-medium text-yellow-800">
                  {result.errors.length} row(s) had warnings:
                </p>
                <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                  {result.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>
                      {err.sheet} row {err.row}: {err.error}
                    </li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>...and {result.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            <p className="mt-6 text-sm text-gray-500">
              Redirecting to Dashboard in {redirectCountdown} seconds...
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              Go now
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {uploadState === 'error' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
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
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Upload Failed
            </h2>

            {errorMessage && (
              <p className="mt-2 text-gray-600">{errorMessage}</p>
            )}

            {result && result.errors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left max-h-64 overflow-y-auto">
                <p className="text-sm font-medium text-red-800 mb-2">
                  Validation errors:
                </p>
                <ul className="text-sm text-red-700 space-y-1">
                  {result.errors.map((err, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-medium whitespace-nowrap">
                        {err.sheet} row {err.row}:
                      </span>
                      <span>{err.error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={handleReset}
              className="mt-6 px-6 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900">Expected File Format</h3>
        <p className="mt-2 text-sm text-gray-600">
          Upload the <span className="font-medium">Plantilla_Input_Pisos.xlsx</span> template with:
        </p>
        <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-1">
          <li><span className="font-medium">INVENTARIO</span> sheet: Fecha Conteo, SKU, Bodega (m²), En Tránsito (m²)</li>
          <li><span className="font-medium">VENTAS</span> sheet: Fecha, SKU, Cantidad (m²)</li>
        </ul>
      </div>
    </div>
  );
}
