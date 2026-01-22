import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { dataHubApi } from '../requests/dataHub';
import type { SIESAUploadResponse } from '../requests/dataHub';
import { UploadResultPanel } from './UploadResultPanel';
import { LoadingSpinner } from './LoadingSpinner';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface SIESAUploadCardProps {
  lastUpdated?: string | null;
  recordCount?: number;
  onUploadSuccess?: () => void;
}

export function SIESAUploadCard({ lastUpdated, recordCount, onUploadSuccess }: SIESAUploadCardProps) {
  const { t, i18n } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [result, setResult] = useState<SIESAUploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setUploadState('uploading');
    setErrorMessage(null);
    setResult(null);

    try {
      const uploadResult = await dataHubApi.uploadSIESA(fileToUpload);
      setResult(uploadResult);
      setUploadState('success');
      onUploadSuccess?.();
    } catch (err: any) {
      setUploadState('error');
      setErrorMessage(
        err.response?.data?.error?.message || t('dataHub.uploadFailed')
      );
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadState('idle');
    setResult(null);
    setErrorMessage(null);
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
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        📦 {t('dataHub.inventory.title')}
      </h3>

      {uploadState === 'idle' && (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : file
                ? 'border-green-500 bg-green-50'
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
                {t('dataHub.inventory.dropzone')}
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

          {errorMessage && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {errorMessage}
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500">
            <p>{t('dataHub.inventory.lastUpload')}: {formatLastUpdated()}</p>
            {recordCount !== undefined && recordCount > 0 && (
              <p>{recordCount.toLocaleString()} {t('dataHub.inventory.lotsCount')}</p>
            )}
          </div>
        </>
      )}

      {uploadState === 'uploading' && (
        <div className="py-8 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">{t('dataHub.uploading')}</p>
        </div>
      )}

      {uploadState === 'success' && result && (
        <>
          <UploadResultPanel type="siesa" result={result} onClose={handleReset} />
          <button
            onClick={handleReset}
            className="mt-4 w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            {t('dataHub.uploadAnother')}
          </button>
        </>
      )}

      {uploadState === 'error' && (
        <>
          <UploadResultPanel type="error" message={errorMessage || ''} onClose={handleReset} />
          <button
            onClick={handleReset}
            className="mt-4 w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {t('common.tryAgain')}
          </button>
        </>
      )}
    </div>
  );
}
