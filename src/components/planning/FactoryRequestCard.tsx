import { useTranslation } from 'react-i18next';
import type { FactoryOrderSignal } from '../../requests/planning';

interface FactorySignalCardProps {
  signal: FactoryOrderSignal;
  onClick?: () => void;
}

export function FactorySignalCard({ signal, onClick }: FactorySignalCardProps) {
  const { t } = useTranslation();

  // Signal type -> status text + color
  let statusText: string;
  let statusColor: string;

  if (signal.signal_type === 'on_track') {
    statusText = t('planning.factoryRequest.onTrack', 'En camino');
    statusColor = 'text-slate-400';
  } else if (signal.signal_type === 'in_production') {
    statusText = t('planning.factoryRequest.inProduction', 'En produccion');
    statusColor = 'text-emerald-400';
  } else if (signal.signal_type === 'order_today') {
    statusText = t('planning.factoryRequest.orderToday', 'Pedir hoy');
    statusColor = 'text-amber-400';
  } else if (signal.signal_type === 'production_delayed') {
    statusText = t('planning.factoryRequest.delayed', 'Retrasado');
    statusColor = 'text-orange-400';
  } else {
    statusText = signal.signal_type;
    statusColor = 'text-slate-400';
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
        {t('planning.factoryRequest.title', 'Produccion')}
      </div>

      {/* Signal status */}
      <div className={`text-sm font-medium mt-1 ${statusColor}`}>
        {statusText}
      </div>

      {/* Product count + pallets */}
      {signal.product_count != null && signal.estimated_pallets != null && (
        <div className="text-slate-400 text-[10px] mt-1.5">
          {signal.product_count} {t('planning.factoryRequest.products', 'productos')}
          {' \u00B7 '}
          {signal.estimated_pallets}p
        </div>
      )}

      {/* Target boat */}
      {signal.target_boat_name && (
        <div className="text-slate-500 text-[10px] mt-0.5 truncate">
          {'\u2192'} {signal.target_boat_name}
        </div>
      )}

      {/* Days until order */}
      {signal.days_until_order != null && (
        <div className={`text-[10px] mt-1.5 ${signal.days_until_order < 0 ? 'text-red-400' : 'text-slate-500'}`}>
          {signal.days_until_order < 0
            ? `${Math.abs(signal.days_until_order)}d ${t('planning.factoryRequest.overdue', 'vencido')}`
            : `${signal.days_until_order}d ${t('planning.factoryRequest.remaining', 'restantes')}`
          }
        </div>
      )}
    </button>
  );
}
