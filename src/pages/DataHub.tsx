import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DataFreshnessBar } from '../components/DataFreshnessBar';
import { SalesUploadCard } from '../components/SalesUploadCard';
import { SACUploadCard } from '../components/SACUploadCard';
import { SIESAUploadCard } from '../components/SIESAUploadCard';
import { ProductionUploadCard } from '../components/ProductionUploadCard';
import { dataHubApi } from '../requests/dataHub';
import type { DataFreshnessResponse } from '../requests/dataHub';

export function DataHub() {
  const { t } = useTranslation();
  const [freshness, setFreshness] = useState<DataFreshnessResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadFreshness();
  }, [refreshKey]);

  const loadFreshness = async () => {
    try {
      const data = await dataHubApi.getFreshness();
      setFreshness(data);
    } catch (error) {
      console.error('Failed to load freshness data:', error);
    }
  };

  const handleUploadSuccess = () => {
    // Refresh freshness data after successful upload
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dataHub.title')}</h1>
        <p className="text-gray-600">{t('dataHub.subtitle')}</p>
      </div>

      {/* System Health Bar */}
      <DataFreshnessBar key={refreshKey} />

      {/* Main Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SalesUploadCard
          lastUpdated={freshness?.sales.last_updated}
          recordCount={freshness?.sales.record_count}
          onUploadSuccess={handleUploadSuccess}
        />
        <SACUploadCard
          lastUpdated={freshness?.sales.last_updated}
          recordCount={freshness?.sales.record_count}
          onUploadSuccess={handleUploadSuccess}
        />
        <SIESAUploadCard
          lastUpdated={freshness?.inventory.last_updated}
          recordCount={freshness?.inventory.record_count}
          onUploadSuccess={handleUploadSuccess}
        />
        <ProductionUploadCard
          onUploadSuccess={handleUploadSuccess}
        />
      </div>

      {/* Other Data Sources Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('dataHub.otherSources.title')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Boats Link */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚢</span>
                  <span className="font-medium text-gray-900">
                    {t('dataHub.otherSources.boats')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {freshness?.boats.last_updated
                    ? t('dataHub.lastUpdatedAgo', {
                        time: formatTimeAgo(freshness.boats.last_updated, t),
                      })
                    : t('dataHub.never')}
                </p>
              </div>
              <Link
                to="/boats"
                className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                {t('dataHub.otherSources.boatsLink')} →
              </Link>
            </div>
          </div>

          {/* Shipping Documents Link */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <span className="font-medium text-gray-900">
                    {t('dataHub.otherSources.shippingDocs')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {t('dataHub.otherSources.manageShipments')}
                </p>
              </div>
              <Link
                to="/shipments"
                className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                {t('dataHub.otherSources.viewShipments')} →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h3 className="font-medium text-blue-900">{t('dataHub.help.title')}</h3>
        <div className="mt-3 space-y-2 text-sm text-blue-800">
          <p>
            <strong>📊 {t('dataHub.sales.title')}:</strong> {t('dataHub.help.sacDescription')}
          </p>
          <p>
            <strong>📦 {t('dataHub.inventory.title')}:</strong> {t('dataHub.help.siesaDescription')}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: string, t: (key: string, options?: any) => string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return t('dataHub.today');
  } else if (diffDays === 1) {
    return t('dataHub.yesterday');
  } else {
    return t('dataHub.daysAgo', { count: diffDays });
  }
}
