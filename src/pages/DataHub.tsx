import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DataFreshnessBar } from '../components/DataFreshnessBar';
import { SACUploadCard } from '../components/SACUploadCard';
import { InventoryUploadCard } from '../components/InventoryUploadModal';
import { SIESAUploadCard } from '../components/SIESAUploadCard';
import { InTransitUploadCard } from '../components/InTransitUploadCard';
import { BoatUploadCard } from '../components/BoatUploadModal';
import { ProductionUploadCard } from '../components/ProductionUploadCard';
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
    <div className="min-h-screen px-6 py-8" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1
            className="text-lg font-medium tracking-[0.15em] uppercase"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('dataHub.title')}
          </h1>
          <p
            className="text-xs mt-1 tracking-widest uppercase"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('dataHub.subtitle')}
          </p>
        </div>

        {/* System Health Bar */}
        <DataFreshnessBar key={refreshKey} />

        {/* Sales Section */}
        <Section label={t('dataHub.sections.sales')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SACUploadCard
              lastUpdated={freshness?.sales.last_updated}
              recordCount={freshness?.sales.record_count}
              onUploadSuccess={handleUploadSuccess}
            />
          </div>
        </Section>

        {/* Inventory Section */}
        <Section label={t('dataHub.sections.inventory')}>
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
            <InTransitUploadCard onUploadSuccess={handleUploadSuccess} />
          </div>
        </Section>

        {/* Logistics Section */}
        <Section label={t('dataHub.sections.logistics')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BoatUploadCard
              lastUpdated={freshness?.boats.last_updated}
              recordCount={freshness?.boats.record_count}
              onUploadSuccess={handleUploadSuccess}
            />
            <ProductionUploadCard onUploadSuccess={handleUploadSuccess} />
          </div>
        </Section>

        {/* Upload History */}
        <UploadHistory refreshKey={refreshKey} />

        {/* Help Section */}
        <div
          className="p-6"
          style={{
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-subtle)',
            backgroundColor: 'var(--color-bg-surface)',
          }}
        >
          <h3
            className="text-xs tracking-widest uppercase font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('dataHub.help.title')}
          </h3>
          <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <p>
              <strong style={{ color: 'var(--color-text-primary)' }}>{t('dataHub.sales.title')}:</strong> {t('dataHub.help.sacDescription')}
            </p>
            <p>
              <strong style={{ color: 'var(--color-text-primary)' }}>{t('dataHub.inventory.title')}:</strong> {t('dataHub.help.siesaDescription')}
            </p>
            <p>
              <strong style={{ color: 'var(--color-text-primary)' }}>{t('dataHub.sections.logistics')}:</strong> {t('dataHub.help.productionDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h2
        className="text-xs tracking-widest uppercase font-medium mb-3"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label}
      </h2>
      {children}
    </div>
  );
}
