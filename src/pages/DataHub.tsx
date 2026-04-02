import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DataFreshnessBar } from '../components/DataFreshnessBar';
import { SACUploadCard } from '../components/SACUploadCard';
import { InventoryUploadCard } from '../components/InventoryUploadModal';
import { SIESAUploadCard } from '../components/SIESAUploadCard';
import { InTransitUploadCard } from '../components/InTransitUploadCard';
import { UnfulfilledDemandCard } from '../components/UnfulfilledDemandCard';
import { CommittedOrdersCard } from '../components/CommittedOrdersCard';
import { BoatUploadCard } from '../components/BoatUploadModal';
import { ProductionUploadCard } from '../components/ProductionUploadCard';
import { ShipmentUploadCard } from '../components/ShipmentUploadModal';
import { UploadHistory } from '../components/UploadHistory';
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
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">{t('dataHub.title')}</h1>
          <p className="text-slate-400">{t('dataHub.subtitle')}</p>
        </div>

        {/* System Health Bar */}
        <DataFreshnessBar key={refreshKey} />

        {/* Sales Section */}
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">{t('dataHub.sections.sales')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SACUploadCard
              lastUpdated={freshness?.sales.last_updated}
              recordCount={freshness?.sales.record_count}
              onUploadSuccess={handleUploadSuccess}
            />
          </div>
        </div>

        {/* Inventory Section */}
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">{t('dataHub.sections.inventory')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InventoryUploadCard
              lastUpdated={freshness?.inventory.last_updated}
              recordCount={freshness?.inventory.record_count}
              onUploadSuccess={handleUploadSuccess}
            />
            <SIESAUploadCard
              lastUpdated={freshness?.inventory.last_updated}
              recordCount={freshness?.inventory.record_count}
              onUploadSuccess={handleUploadSuccess}
            />
            <InTransitUploadCard
              onUploadSuccess={handleUploadSuccess}
            />
            <UnfulfilledDemandCard
              onUploadSuccess={handleUploadSuccess}
            />
            <CommittedOrdersCard
              onUploadSuccess={handleUploadSuccess}
            />
          </div>
        </div>

        {/* Logistics Section */}
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">{t('dataHub.sections.logistics')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BoatUploadCard
              lastUpdated={freshness?.boats.last_updated}
              recordCount={freshness?.boats.record_count}
              onUploadSuccess={handleUploadSuccess}
            />
            <ProductionUploadCard
              onUploadSuccess={handleUploadSuccess}
            />
            <ShipmentUploadCard
              onSuccess={handleUploadSuccess}
              onUploadSuccess={handleUploadSuccess}
            />
          </div>
        </div>

        {/* Upload History */}
        <UploadHistory refreshKey={refreshKey} />

        {/* Help Section */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
          <h3 className="font-medium text-slate-200">{t('dataHub.help.title')}</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-400">
            <p>
              <strong className="text-slate-300">{t('dataHub.sales.title')}:</strong> {t('dataHub.help.sacDescription')}
            </p>
            <p>
              <strong className="text-slate-300">{t('dataHub.inventory.title')}:</strong> {t('dataHub.help.siesaDescription')}
            </p>
            <p>
              <strong className="text-slate-300">{t('dataHub.sections.logistics')}:</strong> {t('dataHub.help.productionDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
