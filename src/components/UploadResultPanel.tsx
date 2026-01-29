import { useTranslation } from 'react-i18next';
import type { SACUploadResponse, SIESAUploadResponse } from '../requests/dataHub';
import { formatDateUTC } from '../utils/dateUtils';

interface SACResultPanelProps {
  type: 'sac';
  result: SACUploadResponse;
  onClose: () => void;
}

interface SIESAResultPanelProps {
  type: 'siesa';
  result: SIESAUploadResponse;
  onClose: () => void;
}

interface ErrorPanelProps {
  type: 'error';
  message: string;
  onClose: () => void;
}

type UploadResultPanelProps = SACResultPanelProps | SIESAResultPanelProps | ErrorPanelProps;

export function UploadResultPanel(props: UploadResultPanelProps) {
  const { t } = useTranslation();

  if (props.type === 'error') {
    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-red-500 text-xl">❌</span>
          <div className="flex-1">
            <h4 className="font-medium text-red-800">{t('dataHub.uploadFailed')}</h4>
            <p className="text-sm text-red-700 mt-1">{props.message}</p>
          </div>
          <button
            onClick={props.onClose}
            className="text-red-500 hover:text-red-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (props.type === 'sac') {
    const { result } = props;
    const startDate = formatDateUTC(result.date_range_start);
    const endDate = formatDateUTC(result.date_range_end);

    return (
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-green-500 text-xl">✅</span>
          <div className="flex-1">
            <h4 className="font-medium text-green-800">{t('dataHub.sales.successTitle')}</h4>
            <div className="mt-2 space-y-1 text-sm text-green-700">
              <p>📅 {t('dataHub.sales.dateRange')}: {startDate} - {endDate}</p>
              <p>📊 {result.sales_created} {t('dataHub.sales.salesCount')}</p>
              <p>📦 {result.total_m2.toLocaleString()} {t('dataHub.sales.totalM2')}</p>
              <p>👥 {result.unique_customers} {t('dataHub.sales.customers')}</p>
              {result.top_product_sku && (
                <p>🏆 {t('dataHub.sales.topProduct')}: {result.top_product_sku} — {result.top_product_m2?.toLocaleString()} m²</p>
              )}
            </div>
            {result.skipped_non_tile > 0 && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-700">
                  ⚠️ {result.skipped_non_tile} {t('dataHub.sales.nonTileFiltered')}
                </p>
              </div>
            )}
            {result.errors.length > 0 && (
              <details className="mt-3">
                <summary className="text-sm text-yellow-700 cursor-pointer hover:underline">
                  {t('dataHub.viewErrors', { count: result.errors.length })}
                </summary>
                <ul className="mt-2 text-xs text-yellow-600 space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>Row {err.row}: {err.error}</li>
                  ))}
                  {result.errors.length > 10 && (
                    <li>...{t('common.andMore', { count: result.errors.length - 10 })}</li>
                  )}
                </ul>
              </details>
            )}
          </div>
          <button
            onClick={props.onClose}
            className="text-green-500 hover:text-green-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (props.type === 'siesa') {
    const { result } = props;
    const snapshotDate = formatDateUTC(result.snapshot_date);

    return (
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-green-500 text-xl">✅</span>
          <div className="flex-1">
            <h4 className="font-medium text-green-800">{t('dataHub.inventory.successTitle')}</h4>
            <div className="mt-2 space-y-1 text-sm text-green-700">
              <p>📅 {t('dataHub.inventory.snapshotDate')}: {snapshotDate}</p>
              <p>📦 {result.lots_created} {t('dataHub.inventory.lotsCount')}</p>
              <p>📐 {result.total_m2_available.toLocaleString()} {t('dataHub.inventory.availableM2')}</p>
              <p>⚖️ {result.total_weight_kg.toLocaleString()} {t('dataHub.inventory.totalWeight')}</p>
              <p>🚛 ~{result.containers_needed} {t('dataHub.inventory.containers')}</p>
            </div>
            {result.match_rate_pct === 100 ? (
              <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded">
                <p className="text-sm text-green-800">
                  ✓ {t('dataHub.inventory.allMatched')}
                </p>
              </div>
            ) : (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-700">
                  ⚠️ {t('dataHub.inventory.matchRate', { rate: result.match_rate_pct })}
                </p>
                {result.unmatched_products.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-yellow-600 cursor-pointer hover:underline">
                      {t('dataHub.inventory.unmatchedProducts', { count: result.unmatched_count })}
                    </summary>
                    <ul className="mt-1 text-xs text-yellow-600 space-y-1 max-h-24 overflow-y-auto">
                      {result.unmatched_products.slice(0, 10).map((product, i) => (
                        <li key={i}>• {product}</li>
                      ))}
                      {result.unmatched_products.length > 10 && (
                        <li>...{t('common.andMore', { count: result.unmatched_products.length - 10 })}</li>
                      )}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
          <button
            onClick={props.onClose}
            className="text-green-500 hover:text-green-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
