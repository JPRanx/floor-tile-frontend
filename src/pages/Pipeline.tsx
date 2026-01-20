import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { pipelineApi } from '../requests/pipeline';
import type { PipelineData, PipelineOrderItem, PipelineShipmentItem } from '../requests/pipeline';
import { StageSummaryCard } from '../components/pipeline/StageSummaryCard';
import { PipelineFlow } from '../components/pipeline/PipelineFlow';
import { PipelineColumn } from '../components/pipeline/PipelineColumn';
import { PipelineDetailModal } from '../components/pipeline/PipelineDetailModal';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function Pipeline() {
  const { t } = useTranslation();
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PipelineOrderItem | PipelineShipmentItem | null>(null);
  const [selectedType, setSelectedType] = useState<'ordered' | 'shipped' | 'in_transit' | 'delivered'>('ordered');

  const fetchData = async () => {
    try {
      const result = await pipelineApi.getOverview();
      setData(result);
    } catch (err) {
      setError(t('pipeline.loadError'));
      console.error('Failed to load pipeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [t]);

  const handleCardClick = (item: PipelineOrderItem | PipelineShipmentItem, type: 'ordered' | 'shipped' | 'in_transit' | 'delivered') => {
    setSelectedItem(item);
    setSelectedType(type);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  const handleStatusChange = () => {
    // Refresh the pipeline data when a status changes
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Stage configuration
  const stages: {
    key: 'ordered' | 'shipped' | 'in_transit' | 'delivered';
    labelKey: string;
    color: 'slate' | 'emerald' | 'indigo' | 'amber';
    icon: string;
  }[] = [
    { key: 'ordered', labelKey: 'pipeline.ordered', color: 'slate', icon: '📦' },
    { key: 'shipped', labelKey: 'pipeline.shipped', color: 'emerald', icon: '🚢' },
    { key: 'in_transit', labelKey: 'pipeline.inTransit', color: 'indigo', icon: '🌊' },
    { key: 'delivered', labelKey: 'pipeline.delivered', color: 'amber', icon: '✅' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title */}
        <h1 className="text-3xl font-bold text-white mb-8">
          {t('pipeline.title')}
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stages.map((stage) => (
            <StageSummaryCard
              key={stage.key}
              label={t(stage.labelKey)}
              count={data.counts[stage.key]}
              color={stage.color}
              icon={stage.icon}
            />
          ))}
        </div>

        {/* Animated Flow Line */}
        <PipelineFlow stageCount={4} />

        {/* Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {stages.map((stage) => (
            <PipelineColumn
              key={stage.key}
              title={t(stage.labelKey)}
              icon={stage.icon}
              color={stage.color}
              items={data.stages[stage.key]}
              type={stage.key}
              onCardClick={(item) => handleCardClick(item, stage.key)}
            />
          ))}
        </div>

        {/* Total Count Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            {t('pipeline.totalOrders', { count: data.counts.total })}
          </p>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <PipelineDetailModal
          item={selectedItem}
          type={selectedType}
          onClose={handleCloseModal}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
