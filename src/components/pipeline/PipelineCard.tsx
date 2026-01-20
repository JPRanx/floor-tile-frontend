import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import type { PipelineOrderItem, PipelineShipmentItem } from '../../requests/pipeline';

interface PipelineCardProps {
  item: PipelineOrderItem | PipelineShipmentItem;
  type: 'ordered' | 'shipped' | 'in_transit' | 'delivered';
  color: 'slate' | 'emerald' | 'indigo' | 'amber';
  delay: number;
  onClick?: () => void;
}

// Design tokens - hover glow effects
const hoverGlows: Record<string, string> = {
  slate: 'hover:shadow-[0_0_20px_rgba(148,163,184,0.2)]',
  emerald: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]',
  indigo: 'hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]',
  amber: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]',
};

// Design tokens - accent text colors
const accentColors: Record<string, string> = {
  slate: 'text-slate-400',
  emerald: 'text-emerald-400',
  indigo: 'text-indigo-400',
  amber: 'text-amber-400',
};

// Type guard for shipment items
function isShipmentItem(item: PipelineOrderItem | PipelineShipmentItem): item is PipelineShipmentItem {
  return 'shipment_id' in item;
}

export function PipelineCard({ item, type, color, delay, onClick }: PipelineCardProps) {
  const { t, i18n } = useTranslation();
  const [visible, setVisible] = useState(false);
  const locale = i18n.language === 'es' ? es : enUS;

  // Animate in with staggered delay
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), 'MMM d', { locale });
    } catch {
      return dateStr;
    }
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale });
    } catch {
      return dateStr;
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'ordered':
        return (
          <>
            <div className="flex justify-between items-start mb-2">
              <span className="text-white font-medium text-sm">
                {item.pv_number || t('pipeline.noPV')}
              </span>
              <span className="text-slate-500 text-xs">
                {formatTimeAgo(item.created_at)}
              </span>
            </div>
            {item.products_preview && (
              <p className="text-slate-400 text-xs truncate mb-2">
                {item.products_preview}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{Math.round(item.total_m2).toLocaleString()} m²</span>
              <span>•</span>
              <span>{item.item_count} {t('pipeline.items')}</span>
            </div>
          </>
        );

      case 'shipped':
        if (!isShipmentItem(item)) return null;
        return (
          <>
            <div className="flex justify-between items-start mb-2">
              <span className="text-white font-medium text-sm">
                {item.pv_number || t('pipeline.noPV')}
              </span>
              {item.etd && (
                <span className={`text-xs ${accentColors[color]}`}>
                  ETD: {formatDate(item.etd)}
                </span>
              )}
            </div>
            {item.vessel_name && (
              <p className="text-slate-400 text-xs mb-2">
                {item.vessel_name}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{Math.round(item.total_m2).toLocaleString()} m²</span>
              {item.booking_number && (
                <>
                  <span>•</span>
                  <span className="truncate">{item.booking_number}</span>
                </>
              )}
            </div>
          </>
        );

      case 'in_transit':
        if (!isShipmentItem(item)) return null;
        return (
          <>
            <div className="flex justify-between items-start mb-2">
              <span className="text-white font-medium text-sm">
                {item.pv_number || t('pipeline.noPV')}
              </span>
              {item.eta && (
                <span className={`text-xs ${accentColors[color]}`}>
                  ETA: {formatDate(item.eta)}
                </span>
              )}
            </div>
            {item.vessel_name && (
              <p className="text-slate-400 text-xs mb-2">
                {item.vessel_name}
              </p>
            )}
            <div className="text-xs text-slate-500">
              {Math.round(item.total_m2).toLocaleString()} m²
            </div>
          </>
        );

      case 'delivered':
        if (!isShipmentItem(item)) return null;
        return (
          <>
            <div className="flex justify-between items-start mb-2">
              <span className="text-white font-medium text-sm">
                {item.pv_number || t('pipeline.noPV')}
              </span>
              <span className={`text-xs ${accentColors[color]}`}>
                {item.delivered_date ? formatDate(item.delivered_date) : t('pipeline.delivered')}
              </span>
            </div>
            {item.vessel_name && (
              <p className="text-slate-400 text-xs mb-2">
                {item.vessel_name}
              </p>
            )}
            <div className="text-xs text-slate-500">
              {Math.round(item.total_m2).toLocaleString()} m²
            </div>
          </>
        );
    }
  };

  return (
    <div
      className={`
        bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-3
        transition-all duration-300 cursor-pointer
        ${hoverGlows[color]}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      onClick={onClick}
    >
      {renderContent()}
    </div>
  );
}
