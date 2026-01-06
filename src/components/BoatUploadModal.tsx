import { useState, useCallback } from 'react';
import { boatsApi } from '../requests/boats';
import type { BoatUploadResult } from '../requests/boats';
import { LoadingSpinner } from './LoadingSpinner';

interface BoatUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function BoatUploadModal({ isOpen, onClose, onSuccess }: BoatUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [result, setResult] = useState<BoatUploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setErrorMessage('Please upload an Excel file (.xlsx or .xls)');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
      setErrorMessage(null);
    } else if (selectedFile) {
      setErrorMessage('Please upload an Excel file (.xlsx or .xls)');
    }
  }, []);

  const isValidFile = (file: File): boolean => {
    return (
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploadState('uploading');
    setErrorMessage(null);
    setResult(null);

    try {
      const uploadResult = await boatsApi.upload(file);
      setResult(uploadResult);

      if (uploadResult.imported > 0 || uploadResult.updated > 0 || uploadResult.skipped > 0) {
        setUploadState('success');
      } else if (uploadResult.errors.length > 0) {
        setUploadState('error');
        setErrorMessage('No boats were imported due to errors');
      } else {
        setUploadState('error');
        setErrorMessage('No boat schedules found in file');
      }
    } catch (err: any) {
      setUploadState('error');
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to upload file'
      );
    }
  };

  const handleClose = () => {
    if (uploadState === 'success') {
      onSuccess();
    }
    // Reset state
    setFile(null);
    setUploadState('idle');
    setResult(null);
    setErrorMessage(null);
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Upload TIBA Schedule
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          {uploadState === 'idle' && (
            <>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
                      className="mx-auto h-10 w-10 text-green-500"
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
                    <button
                      onClick={() => setFile(null)}
                      className="mt-2 text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
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
                      <label className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                        Click to upload
                        <input
                          type="file"
                          className="hidden"
                          accept=".xlsx,.xls"
                          onChange={handleFileSelect}
                        />
                      </label>{' '}
                      or drag and drop
                    </p>
                    <p className="mt-1 text-xs text-gray-500">TIBA Excel file (.xlsx or .xls)</p>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  {errorMessage}
                </div>
              )}

              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload
                </button>
              </div>
            </>
          )}

          {uploadState === 'uploading' && (
            <div className="py-8 text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-gray-600">Uploading and processing...</p>
            </div>
          )}

          {uploadState === 'success' && result && (
            <div className="py-4 text-center">
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
              <h3 className="mt-3 text-lg font-medium text-gray-900">Upload Successful</h3>
              <div className="mt-2 text-sm text-gray-600">
                <p><span className="font-medium">{result.imported}</span> boats imported</p>
                <p><span className="font-medium">{result.updated}</span> boats updated</p>
                {result.skipped > 0 && (
                  <p><span className="font-medium">{result.skipped}</span> already up to date</p>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-left text-sm">
                  <p className="font-medium text-yellow-800">{result.errors.length} row(s) skipped:</p>
                  <ul className="mt-1 text-yellow-700 text-xs">
                    {result.errors.slice(0, 3).map((err, i) => (
                      <li key={i}>Row {err.row}: {err.error}</li>
                    ))}
                    {result.errors.length > 3 && (
                      <li>...and {result.errors.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}

              <button
                onClick={handleClose}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          )}

          {uploadState === 'error' && (
            <div className="py-4 text-center">
              <svg
                className="mx-auto h-12 w-12 text-red-500"
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
              <h3 className="mt-3 text-lg font-medium text-gray-900">Upload Failed</h3>
              <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>

              {result && result.errors.length > 0 && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-left text-sm max-h-32 overflow-y-auto">
                  <ul className="text-red-700 text-xs">
                    {result.errors.map((err, i) => (
                      <li key={i}>Row {err.row}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => {
                  setUploadState('idle');
                  setResult(null);
                  setErrorMessage(null);
                }}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
