import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { shipmentsApi } from '../requests/shipments';
import type { IngestResponse, CandidateShipment } from '../requests/shipments';
import { LoadingSpinner } from './LoadingSpinner';
import { FactoryOrderSelector } from './FactoryOrderSelector';
import { UploadPreviewModal } from './UploadPreviewModal';

interface ShipmentUploadCardProps {
  onSuccess: () => void;
  lastUpdated?: string | null;
  onUploadSuccess?: () => void;
}

type UploadState = 'idle' | 'parsing' | 'preview' | 'confirming' | 'selecting_shipment' | 'success' | 'error';

export function ShipmentUploadCard({
  onSuccess,
  lastUpdated,
  onUploadSuccess
}: ShipmentUploadCardProps) {
  const { t, i18n } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [parseResult, setParseResult] = useState<IngestResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Manual assignment state
  const [candidateShipments, setCandidateShipments] = useState<CandidateShipment[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  // Editable fields
  const [editedData, setEditedData] = useState<{
    shp_number: string;
    booking_number: string;
    pv_number: string;
    containers: string;
    etd: string;
    eta: string;
    atd: string;
    ata: string;
    pol: string;
    pod: string;
    vessel: string;
    voyage: string;
    factory_order_id: string | null;
  }>({
    shp_number: '',
    booking_number: '',
    pv_number: '',
    containers: '',
    etd: '',
    eta: '',
    atd: '',
    ata: '',
    pol: '',
    pod: '',
    vessel: '',
    voyage: '',
    factory_order_id: null,
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const isValidFile = (file: File): boolean => {
    return file.name.endsWith('.pdf') || file.type === 'application/pdf';
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

  // Auto-upload file immediately after selection
  const handleFileAndUpload = useCallback(async (selectedFile: File) => {
    if (!isValidFile(selectedFile)) {
      setErrorMessage(t('shipmentUpload.pleaseUploadPdf'));
      return;
    }

    setFile(selectedFile);
    setErrorMessage(null);
    setUploadState('parsing');
    setParseResult(null);
    setPreviewId(null);
    setModalOpen(true);

    // Create timeout promise (2 minutes for Claude Vision PDF parsing)
    const timeoutMs = 120000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    });

    try {
      // Race between API call and timeout
      const result = await Promise.race([
        shipmentsApi.previewPdf(selectedFile),
        timeoutPromise,
      ]);
      setParseResult(result);
      setPreviewId(result.preview_id);

      if (result.action === 'parsed_pending_confirmation' && result.parsed_data) {
        const data = result.parsed_data;
        setEditedData({
          shp_number: data.shp_number?.value || '',
          booking_number: data.booking_number?.value || '',
          pv_number: data.pv_number?.value || '',
          containers: data.containers.join(', '),
          etd: data.etd?.value || '',
          eta: data.eta?.value || '',
          atd: data.atd?.value || '',
          ata: data.ata?.value || '',
          pol: data.pol?.value || '',
          pod: data.pod?.value || '',
          vessel: data.vessel?.value || '',
          voyage: data.voyage?.value || '',
          factory_order_id: null,
        });
        setUploadState('preview');
      } else {
        setUploadState('error');
        setErrorMessage('Unexpected response from server');
      }
    } catch (err: any) {
      setUploadState('error');
      if (err.message === 'TIMEOUT') {
        setErrorMessage(t('shipmentUpload.timeout'));
      } else if (err.response?.data?.error?.message) {
        setErrorMessage(err.response.data.error.message);
      } else if (err.response?.status === 500) {
        setErrorMessage(t('shipmentUpload.serverError'));
      } else if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
        setErrorMessage(t('shipmentUpload.networkError'));
      } else {
        setErrorMessage(t('shipmentUpload.parseFailed'));
      }
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

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.85) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceBadge = (confidence: number): string => {
    if (confidence >= 0.85) return t('shipmentUpload.confidenceHigh');
    if (confidence >= 0.6) return t('shipmentUpload.confidenceMedium');
    return t('shipmentUpload.confidenceLow');
  };

  const parseDate = (dateStr: string): string | undefined => {
    if (!dateStr) return undefined;
    try {
      // Try parsing dates in format like "06-Dec-25" or "27-Nov-25"
      const parts = dateStr.match(/(\d{1,2})-(\w{3})-(\d{2,4})/);
      if (parts) {
        const day = parts[1];
        const monthStr = parts[2];
        let year = parts[3];

        // Handle 2-digit years
        if (year.length === 2) {
          year = `20${year}`;
        }

        // Month mapping
        const months: Record<string, string> = {
          'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
          'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
          'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        };

        const month = months[monthStr.toLowerCase()];
        if (month) {
          return `${year}-${month}-${day.padStart(2, '0')}`;
        }
      }

      // If already in ISO format or other parseable format
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      console.error('Failed to parse date:', dateStr, e);
    }
    return undefined;
  };

  const handleConfirm = async () => {
    if (!parseResult?.parsed_data || !previewId) return;

    setUploadState('confirming');
    setErrorMessage(null);

    try {
      const confirmData = {
        document_type: parseResult.parsed_data.document_type,
        shp_number: editedData.shp_number || undefined,
        booking_number: editedData.booking_number || undefined,
        containers: editedData.containers
          ? editedData.containers.split(',').map(c => c.trim()).filter(Boolean)
          : undefined,
        etd: parseDate(editedData.etd),
        eta: parseDate(editedData.eta),
        atd: parseDate(editedData.atd),
        ata: parseDate(editedData.ata),
        pol: editedData.pol || undefined,
        pod: editedData.pod || undefined,
        vessel: editedData.vessel || undefined,
        voyage: editedData.voyage || undefined,
        source: 'manual' as const,
        notes: `Uploaded by Ashley via web interface. Original file: ${file?.name}`,
        original_parsed_data: parseResult.parsed_data,
        factory_order_id: editedData.factory_order_id || undefined,
      };

      const result = await shipmentsApi.confirmPreview(previewId, confirmData);

      if (result.success) {
        setParseResult(result);
        setUploadState('success');
        onUploadSuccess?.();
      } else if (result.action === 'needs_assignment' && result.candidate_shipments) {
        // HBL/MBL couldn't auto-match - show shipment selection
        setCandidateShipments(result.candidate_shipments);
        setSelectedShipmentId(null);
        setUploadState('selecting_shipment');
        setErrorMessage(result.message);
      } else {
        setUploadState('error');
        setErrorMessage(result.message || 'Failed to create shipment');
      }
    } catch (err: any) {
      setUploadState('error');
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to confirm shipment'
      );
    }
  };

  const handleAssignmentConfirm = async () => {
    if (!parseResult?.parsed_data || !selectedShipmentId) return;

    setUploadState('confirming');
    setErrorMessage(null);

    try {
      const confirmData = {
        document_type: parseResult.parsed_data.document_type,
        shp_number: editedData.shp_number || undefined,
        booking_number: editedData.booking_number || undefined,
        containers: editedData.containers
          ? editedData.containers.split(',').map(c => c.trim()).filter(Boolean)
          : undefined,
        etd: parseDate(editedData.etd),
        eta: parseDate(editedData.eta),
        atd: parseDate(editedData.atd),
        ata: parseDate(editedData.ata),
        pol: editedData.pol || undefined,
        pod: editedData.pod || undefined,
        vessel: editedData.vessel || undefined,
        voyage: editedData.voyage || undefined,
        source: 'manual' as const,
        notes: `Uploaded by Ashley via web interface. Original file: ${file?.name}. Manually assigned.`,
        target_shipment_id: selectedShipmentId,
        original_parsed_data: parseResult.parsed_data,
      };

      const result = await shipmentsApi.confirmIngest(confirmData);

      if (result.success) {
        setParseResult(result);
        setUploadState('success');
        onUploadSuccess?.();
      } else {
        setUploadState('error');
        setErrorMessage(result.message || 'Failed to update shipment');
      }
    } catch (err: any) {
      setUploadState('error');
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to confirm assignment'
      );
    }
  };

  const handleModalClose = () => {
    if (uploadState === 'success') {
      onSuccess();
    }
    // Reset state
    setModalOpen(false);
    setFile(null);
    setUploadState('idle');
    setParseResult(null);
    setErrorMessage(null);
    setPreviewId(null);
    setCandidateShipments([]);
    setSelectedShipmentId(null);
    setEditedData({
      shp_number: '',
      booking_number: '',
      pv_number: '',
      containers: '',
      etd: '',
      eta: '',
      atd: '',
      ata: '',
      pol: '',
      pod: '',
      vessel: '',
      voyage: '',
      factory_order_id: null,
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {t('shipmentUpload.title')}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {t('shipmentUpload.fileTypes', 'Booking, BL, Packing List (.pdf)')}
      </p>

      {/* Drag-drop zone */}
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
            {t('shipmentUpload.clickToUpload', 'Click to upload')}{' '}
            {t('shipmentUpload.orDragDrop', 'or drag and drop')}
          </p>
          <p className="mt-1 text-xs text-gray-500">PDF</p>
          <input
            type="file"
            className="hidden"
            accept=".pdf"
            onChange={handleFileSelect}
          />
        </label>
      </div>

      {errorMessage && !modalOpen && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p>{t('dataHub.production.lastUpload', 'Last upload')}: {formatLastUpdated()}</p>
      </div>

      {/* Preview Modal */}
      <UploadPreviewModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        title={t('shipmentUpload.title')}
      >
        {/* Parsing State */}
        {uploadState === 'parsing' && (
          <div className="py-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">{t('shipmentUpload.parsing')}</p>
          </div>
        )}

        {/* Preview State */}
        {uploadState === 'preview' && parseResult?.parsed_data && (
          <div className="space-y-4">
            {/* Summary Stats Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {t('shipmentUpload.documentSummary', 'Document Summary')}
              </h3>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Document Type */}
                <div>
                  <span className="text-gray-600">{t('shipmentUpload.documentType')}:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-medium text-gray-900 uppercase">
                      {parseResult.parsed_data.document_type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${getConfidenceColor(parseResult.parsed_data.document_type_confidence)}`}>
                      {Math.round(parseResult.parsed_data.document_type_confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* Overall Confidence */}
                <div>
                  <span className="text-gray-600">{t('shipmentUpload.overallConfidence')}:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-medium text-gray-900">
                      {Math.round(parseResult.parsed_data.overall_confidence * 100)}%
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${getConfidenceColor(parseResult.parsed_data.overall_confidence)}`}>
                      {getConfidenceBadge(parseResult.parsed_data.overall_confidence)}
                    </span>
                  </div>
                </div>

                {/* Vessel */}
                {parseResult.parsed_data.vessel && (
                  <div>
                    <span className="text-gray-600">{t('shipmentUpload.vesselName')}:</span>
                    <div className="font-medium text-gray-900 mt-1">
                      {parseResult.parsed_data.vessel.value}
                    </div>
                  </div>
                )}

                {/* Container Count */}
                {parseResult.parsed_data.containers.length > 0 && (
                  <div>
                    <span className="text-gray-600">{t('shipmentUpload.containers')}:</span>
                    <div className="font-medium text-gray-900 mt-1">
                      {parseResult.parsed_data.containers.length} {t('shipmentUpload.containerUnit', 'container(s)')}
                    </div>
                  </div>
                )}

                {/* BL Number */}
                {parseResult.parsed_data.shp_number && (
                  <div>
                    <span className="text-gray-600">{t('shipmentUpload.blNumber', 'B/L Number')}:</span>
                    <div className="font-medium text-gray-900 mt-1">
                      {parseResult.parsed_data.shp_number.value}
                    </div>
                  </div>
                )}

                {/* Booking Number */}
                {parseResult.parsed_data.booking_number && (
                  <div>
                    <span className="text-gray-600">{t('shipmentUpload.bookingNumber')}:</span>
                    <div className="font-medium text-gray-900 mt-1">
                      {parseResult.parsed_data.booking_number.value}
                    </div>
                  </div>
                )}

                {/* ETD */}
                {parseResult.parsed_data.etd && (
                  <div>
                    <span className="text-gray-600">{t('shipmentUpload.etd')}:</span>
                    <div className="font-medium text-gray-900 mt-1">
                      {parseResult.parsed_data.etd.value}
                    </div>
                  </div>
                )}

                {/* ETA */}
                {parseResult.parsed_data.eta && (
                  <div>
                    <span className="text-gray-600">{t('shipmentUpload.eta')}:</span>
                    <div className="font-medium text-gray-900 mt-1">
                      {parseResult.parsed_data.eta.value}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-600">
              {t('shipmentUpload.reviewInstructions')}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* SHP Number */}
              {parseResult.parsed_data.shp_number && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('shipmentUpload.shpNumber')}
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${getConfidenceColor(parseResult.parsed_data.shp_number.confidence)}`}>
                      {getConfidenceBadge(parseResult.parsed_data.shp_number.confidence)}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editedData.shp_number}
                    onChange={(e) => setEditedData({ ...editedData, shp_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}

              {/* Booking Number */}
              {parseResult.parsed_data.booking_number && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('shipmentUpload.bookingNumber')}
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${getConfidenceColor(parseResult.parsed_data.booking_number.confidence)}`}>
                      {getConfidenceBadge(parseResult.parsed_data.booking_number.confidence)}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editedData.booking_number}
                    onChange={(e) => setEditedData({ ...editedData, booking_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}

              {/* POL */}
              {parseResult.parsed_data.pol && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('shipmentUpload.portOfLoading')}
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${getConfidenceColor(parseResult.parsed_data.pol.confidence)}`}>
                      {getConfidenceBadge(parseResult.parsed_data.pol.confidence)}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editedData.pol}
                    onChange={(e) => setEditedData({ ...editedData, pol: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}

              {/* POD */}
              {parseResult.parsed_data.pod && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('shipmentUpload.portOfDischarge')}
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${getConfidenceColor(parseResult.parsed_data.pod.confidence)}`}>
                      {getConfidenceBadge(parseResult.parsed_data.pod.confidence)}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editedData.pod}
                    onChange={(e) => setEditedData({ ...editedData, pod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}

              {/* ETD */}
              {parseResult.parsed_data.etd && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('shipmentUpload.etd')}
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${getConfidenceColor(parseResult.parsed_data.etd.confidence)}`}>
                      {getConfidenceBadge(parseResult.parsed_data.etd.confidence)}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editedData.etd}
                    onChange={(e) => setEditedData({ ...editedData, etd: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}

              {/* ETA */}
              {parseResult.parsed_data.eta && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('shipmentUpload.eta')}
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${getConfidenceColor(parseResult.parsed_data.eta.confidence)}`}>
                      {getConfidenceBadge(parseResult.parsed_data.eta.confidence)}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editedData.eta}
                    onChange={(e) => setEditedData({ ...editedData, eta: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}

              {/* Vessel */}
              {parseResult.parsed_data.vessel && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('shipmentUpload.vesselName')}
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${getConfidenceColor(parseResult.parsed_data.vessel.confidence)}`}>
                      {getConfidenceBadge(parseResult.parsed_data.vessel.confidence)}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editedData.vessel}
                    onChange={(e) => setEditedData({ ...editedData, vessel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}

              {/* Containers */}
              {parseResult.parsed_data.containers.length > 0 && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('shipmentUpload.containers')} ({parseResult.parsed_data.containers.length})
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${getConfidenceColor(parseResult.parsed_data.containers_confidence)}`}>
                      {getConfidenceBadge(parseResult.parsed_data.containers_confidence)}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editedData.containers}
                    onChange={(e) => setEditedData({ ...editedData, containers: e.target.value })}
                    placeholder={t('shipmentUpload.containerPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}

              {/* Factory Order Link - Only show for booking documents */}
              {parseResult.parsed_data.document_type === 'booking' && (
                <div className="col-span-2">
                  <FactoryOrderSelector
                    value={editedData.factory_order_id}
                    onChange={(factoryOrderId) => setEditedData({ ...editedData, factory_order_id: factoryOrderId })}
                  />
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setUploadState('idle');
                  setModalOpen(false);
                  setFile(null);
                  setParseResult(null);
                  setErrorMessage(null);
                  setPreviewId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                {t('shipmentUpload.confirmCreate')}
              </button>
            </div>
          </div>
        )}

        {/* Confirming State */}
        {uploadState === 'confirming' && (
          <div className="py-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">
              {t('shipmentUpload.creating')}
            </p>
          </div>
        )}

        {/* Success State */}
        {uploadState === 'success' && (
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
            <h3 className="mt-3 text-lg font-medium text-gray-900">
              {t('shipmentUpload.shipmentCreated')}
            </h3>
            {parseResult?.shp_number && (
              <p className="mt-2 text-sm text-gray-600">
                <strong>{t('shipmentUpload.shpNumber')}:</strong> {parseResult.shp_number}
              </p>
            )}
            <button
              onClick={handleModalClose}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              {t('shipmentUpload.done')}
            </button>
          </div>
        )}

        {/* Selecting Shipment State */}
        {uploadState === 'selecting_shipment' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm text-yellow-800">
                <strong>{t('shipmentUpload.manualAssignment')}</strong>
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                {errorMessage || t('shipmentUpload.noMatchingShipment')}
              </p>
            </div>

            <p className="text-sm text-gray-600">
              {t('shipmentUpload.selectShipment', { docType: parseResult?.parsed_data?.document_type?.toUpperCase() || '' })}
            </p>

            <div className="overflow-y-auto border border-gray-200 rounded">
              {candidateShipments.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 text-center">
                  {t('shipmentUpload.noShipmentsAvailable')}
                </p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {candidateShipments.map((shipment) => (
                    <label
                      key={shipment.id}
                      className={`flex items-start p-3 cursor-pointer hover:bg-gray-50 ${
                        selectedShipmentId === shipment.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipment_selection"
                        value={shipment.id}
                        checked={selectedShipmentId === shipment.id}
                        onChange={() => setSelectedShipmentId(shipment.id)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {shipment.shp_number || t('shipmentUpload.noSHP')}
                          {shipment.booking_number && (
                            <span className="ml-2 text-gray-500">
                              ({t('shipmentUpload.booking')}: {shipment.booking_number})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {shipment.vessel_name || 'No vessel'} | Status: {shipment.status}
                          {shipment.etd && ` | ETD: ${shipment.etd}`}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setUploadState('preview');
                  setCandidateShipments([]);
                  setSelectedShipmentId(null);
                  setErrorMessage(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {t('shipmentUpload.backToEdit')}
              </button>
              <button
                onClick={handleAssignmentConfirm}
                disabled={!selectedShipmentId}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('shipmentUpload.assignToSelected')}
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
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
            <h3 className="mt-3 text-lg font-medium text-gray-900">{t('shipmentUpload.uploadFailed')}</h3>
            <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>

            <button
              onClick={() => {
                setUploadState('idle');
                setParseResult(null);
                setErrorMessage(null);
                setModalOpen(false);
              }}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700"
            >
              {t('common.tryAgain')}
            </button>
          </div>
        )}
      </UploadPreviewModal>
    </div>
  );
}
