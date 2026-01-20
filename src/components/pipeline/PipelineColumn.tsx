import { useTranslation } from 'react-i18next';
import { PipelineCard } from './PipelineCard';
import type { PipelineOrderItem, PipelineShipmentItem } from '../../requests/pipeline';

interface PipelineColumnProps {
  title: string;
  icon: string;
  color: 'slate' | 'emerald' | 'indigo' | 'amber';
  items: PipelineOrderItem[] | PipelineShipmentItem[];
  type: 'ordered' | 'shipped' | 'in_transit' | 'delivered';
  onCardClick?: (item: PipelineOrderItem | PipelineShipmentItem) => void;
}

// Design tokens - border colors for column headers
const borderColors: Record<string, string> = {
  slate: 'border-slate-600',
  emerald: 'border-emerald-600/50',
  indigo: 'border-indigo-600/50',
  amber: 'border-amber-600/50',
};

// Design tokens - badge background colors
const badgeColors: Record<string, string> = {
  slate: 'bg-slate-700 text-slate-300',
  emerald: 'bg-emerald-900/50 text-emerald-400',
  indigo: 'bg-indigo-900/50 text-indigo-400',
  amber: 'bg-amber-900/50 text-amber-400',
};

export function PipelineColumn({ title, icon, color, items, type, onCardClick }: PipelineColumnProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`
        bg-slate-800/30 rounded-xl border ${borderColors[color]}
        min-h-[400px] flex flex-col
      `}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h3 className="text-white font-semibold">{title}</h3>
          <span
            className={`ml-auto text-xs px-2 py-1 rounded-full ${badgeColors[color]}`}
          >
            {items.length}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {items.length === 0 ? (
          <div className="text-slate-500 text-sm text-center py-8">
            {t('pipeline.noOrders')}
          </div>
        ) : (
          items.map((item, index) => (
            <PipelineCard
              key={item.id || index}
              item={item}
              type={type}
              color={color}
              delay={index * 100}
              onClick={() => onCardClick?.(item)}
            />
          ))
        )}
      </div>
    </div>
  );
}
