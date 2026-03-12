import { useTranslation } from 'react-i18next';
import type { FactoryOrderSignal } from '../../requests/planning';
import { formatDateShort } from '../../utils/dateUtils';

interface FactoryRequestCardProps {
  signal: FactoryOrderSignal;
  onClick?: () => void;
}

export function FactoryRequestCard({ signal, onClick }: FactoryRequestCardProps) {
  const { t, i18n } = useTranslation();

  // Signal type → display text + color
  let statusText: string;
  let statusColor: string;

  const isStale = signal.signal_type === 'order_today' && signal.days_until_order !== null && signal.days_until_order < -14;

  if (isStale) {
    statusText = t('planning.factoryRequest.reviewSignal');
    statusColor = 'text-slate-400';
  } else if (signal.signal_type === 'on_track') {
    statusText = t('planning.factoryRequest.onTrack');
    statusColor = 'text-slate-400';
  } else if (signal.signal_type === 'in_production') {
    statusText = t('planning.factoryRequest.inProduction');
    statusColor = 'text-emerald-400';
  } else if (signal.signal_type === 'order_today') {
    statusText = t('planning.factoryRequest.orderToday');
    statusColor = 'text-amber-400';
  } else if (signal.signal_type === 'production_delayed') {
    statusText = t('planning.factoryRequest.delayed');
    statusColor = 'text-orange-400';
  } else {
    return null; // no_production — don't render
  }

  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 w-48 rounded-xl border p-3 text-left
        transition-all duration-200
        bg-indigo-500/5 border-indigo-500/20
        ${onClick ? 'cursor-pointer hover:bg-indigo-500/10 hover:border-indigo-500/30' : 'cursor-default'}
      `}
    >
      {/* Title */}
      <div className="text-indigo-400 text-[10px] font-medium uppercase tracking-wide">
        {t('planning.factoryRequest.title')}
      </div>

      {/* Signal status */}
      <div className={`text-sm font-medium mt-1 ${statusColor}`}>
        {statusText}
      </div>

      {/* Product count + pallets */}
      <div className="text-slate-400 text-[10px] mt-1.5">
        {signal.product_count !== null && t('planning.factoryRequest.products', { count: signal.product_count })}
        {signal.estimated_pallets !== null && ` · ${t('planning.factoryRequest.pallets', { count: signal.estimated_pallets })}`}
      </div>

      {/* Target boat */}
      {signal.target_boat_departure && (
        <div className="text-slate-500 text-[10px] mt-0.5">
          {t('planning.factoryRequest.targetBoat', {
            date: formatDateShort(signal.target_boat_departure, i18n.language)
          })}
        </div>
      )}
    </button>
  );
}
