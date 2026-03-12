import { useTranslation } from 'react-i18next';
import type { FactoryRequestCycle } from '../../requests/factoryRequests';

interface MonthCycleCardProps {
  cycle: FactoryRequestCycle;
  onClick?: () => void;
}

export function MonthCycleCard({ cycle, onClick }: MonthCycleCardProps) {
  const { t, i18n } = useTranslation();

  // Format month display using Intl (e.g., "Marzo 2026")
  const monthDate = new Date(cycle.month + '-01');
  const monthDisplay = new Intl.DateTimeFormat(i18n.language, {
    month: 'long',
    year: 'numeric',
  }).format(monthDate);

  // Signal type -> status text + color
  let statusText: string;
  let statusColor: string;

  if (cycle.signal_type === 'on_track') {
    statusText = t('planning.factoryRequest.onTrack', 'En camino');
    statusColor = 'text-slate-400';
  } else if (cycle.signal_type === 'in_production') {
    statusText = t('planning.factoryRequest.inProduction', 'En produccion');
    statusColor = 'text-emerald-400';
  } else if (cycle.signal_type === 'order_today') {
    statusText = t('planning.factoryRequest.orderToday', 'Pedir hoy');
    statusColor = 'text-amber-400';
  } else if (cycle.signal_type === 'production_delayed') {
    statusText = t('planning.factoryRequest.delayed', 'Retrasado');
    statusColor = 'text-orange-400';
  } else {
    statusText = cycle.signal_type;
    statusColor = 'text-slate-400';
  }

  // Capacity bar color
  const capColor =
    cycle.utilization_pct > 90
      ? 'bg-red-500'
      : cycle.utilization_pct > 70
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  // Target boats display (truncate to 2)
  const boatsDisplay = cycle.target_boats.slice(0, 2).join(', ');
  const moreBoats = cycle.target_boats.length > 2 ? ` +${cycle.target_boats.length - 2}` : '';

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
      {/* Month name */}
      <div className="text-indigo-400 text-[10px] font-medium uppercase tracking-wide">
        {monthDisplay}
      </div>

      {/* Signal status */}
      <div className={`text-sm font-medium mt-1 ${statusColor}`}>
        {statusText}
      </div>

      {/* Product count + pallets */}
      <div className="text-slate-400 text-[10px] mt-1.5">
        {t('planning.monthCycle.products', '{{count}} productos', { count: cycle.product_count })}
        {' \u00B7 '}
        {t('planning.monthCycle.pallets', '{{count}} pallets', { count: cycle.total_pallets })}
      </div>

      {/* Target boats */}
      {cycle.target_boats.length > 0 && (
        <div className="text-slate-500 text-[10px] mt-0.5 truncate">
          {'\u2192'} {boatsDisplay}{moreBoats}
        </div>
      )}

      {/* Capacity bar */}
      <div className="mt-2">
        <div className="w-full h-1 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${capColor} transition-all duration-300`}
            style={{ width: `${Math.min(100, cycle.utilization_pct)}%` }}
          />
        </div>
        <div className="text-[9px] text-slate-600 mt-0.5">
          {Math.round(cycle.utilization_pct)}% {t('planning.monthCycle.capacityLabel', 'cuota')}
        </div>
      </div>
    </button>
  );
}
