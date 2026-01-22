import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProductTrend } from '../../requests/intelligence';
import { Sparkline } from './Sparkline';
import { TrendArrow } from './TrendArrow';
import { ConfidenceBadge } from './ConfidenceBadge';

interface ProductDetailPanelProps {
  product: ProductTrend | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailPanel({ product, isOpen, onClose }: ProductDetailPanelProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!product) return null;

  const formatRevenue = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatM2 = (value: number) => {
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K m²`;
    return `${value.toLocaleString()} m²`;
  };

  const getSparklineColor = () => {
    switch (product.trend_direction) {
      case 'UP': return 'emerald';
      case 'DOWN': return 'rose';
      default: return 'amber';
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm z-40
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`
          fixed right-0 top-0 h-full w-full sm:w-[400px] z-50
          bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50
          transform transition-transform duration-300 ease-out
          overflow-y-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 p-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{product.sku}</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-slate-400 text-sm mt-1">{product.category}</p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Large Sparkline */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <Sparkline
              data={product.sparkline}
              color={getSparklineColor()}
              height={100}
              animated={false}
            />
          </div>

          {/* Statistics */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>📊</span>
              {t('intelligence.productDetail.statistics')}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{t('intelligence.productDetail.velocity')}</span>
                <span className="text-white font-medium">{formatM2(product.avg_weekly_m2)}/sem</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{t('intelligence.productDetail.vsLastMonth')}</span>
                <TrendArrow
                  direction={product.trend_direction}
                  strength={product.trend_strength}
                  changePct={product.velocity_change_pct}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{t('intelligence.productDetail.confidence')}</span>
                <ConfidenceBadge level={product.confidence} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">CV</span>
                <span className="text-white font-medium">{(product.cv * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Revenue & Volume */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                {t('intelligence.totalRevenue')}
              </p>
              <p className="text-emerald-400 font-bold text-xl">
                {formatRevenue(product.total_revenue_usd)}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                ~{formatRevenue(product.avg_weekly_revenue_usd)}/sem
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                {t('intelligence.totalVolume')}
              </p>
              <p className="text-indigo-400 font-bold text-xl">
                {formatM2(product.total_m2)}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                ~{formatM2(product.avg_weekly_m2)}/sem
              </p>
            </div>
          </div>

          {/* Sample Info */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{t('intelligence.productDetail.sampleWeeks')}</span>
              <span className="text-white font-medium">{product.sample_weeks} semanas</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 p-4">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
          >
            {t('intelligence.productDetail.close')}
          </button>
        </div>
      </div>
    </>
  );
}
