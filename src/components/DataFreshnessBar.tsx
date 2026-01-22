import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dataHubApi } from '../requests/dataHub';
import type { DataFreshnessResponse } from '../requests/dataHub';

interface FreshnessItemProps {
  icon: string;
  label: string;
  lastUpdated: string | null;
  status: 'fresh' | 'stale' | 'very_stale';
}

function FreshnessItem({ icon, label, lastUpdated, status }: FreshnessItemProps) {
  const { t, i18n } = useTranslation();

  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return t('dataHub.never');

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      // Today - show time
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

  const getStatusConfig = () => {
    switch (status) {
      case 'fresh':
        return {
          icon: '✓',
          text: t('dataHub.fresh'),
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-700',
          iconColor: 'text-green-500',
        };
      case 'stale':
        return {
          icon: '⚠️',
          text: t('dataHub.stale'),
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          iconColor: 'text-yellow-500',
        };
      case 'very_stale':
        return {
          icon: '❌',
          text: t('dataHub.veryStale'),
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          iconColor: 'text-red-500',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex flex-col items-center p-3 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className={`font-medium ${config.textColor}`}>{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className={config.iconColor}>{config.icon}</span>
        <span className={`text-sm ${config.textColor}`}>
          {formatTimestamp(lastUpdated)}
        </span>
      </div>
      <span className={`text-xs ${config.textColor} opacity-75`}>{config.text}</span>
    </div>
  );
}

export function DataFreshnessBar() {
  const { t } = useTranslation();
  const [freshness, setFreshness] = useState<DataFreshnessResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFreshness();
  }, []);

  const loadFreshness = async () => {
    try {
      const data = await dataHubApi.getFreshness();
      setFreshness(data);
    } catch (error) {
      console.error('Failed to load freshness data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-center h-20">
          <span className="text-gray-400">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (!freshness) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-500 mb-3">{t('dataHub.systemHealth')}</h3>
      <div className="grid grid-cols-3 gap-3">
        <FreshnessItem
          icon="📊"
          label={t('dataHub.salesLabel')}
          lastUpdated={freshness.sales.last_updated}
          status={freshness.sales.status}
        />
        <FreshnessItem
          icon="📦"
          label={t('dataHub.inventoryLabel')}
          lastUpdated={freshness.inventory.last_updated}
          status={freshness.inventory.status}
        />
        <FreshnessItem
          icon="🚢"
          label={t('dataHub.boatsLabel')}
          lastUpdated={freshness.boats.last_updated}
          status={freshness.boats.status}
        />
      </div>
    </div>
  );
}
