import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { factoryRequestsApi } from '../requests/factoryRequests';
import type { FactoryRequestCycle, FactoryRequestCycleItem } from '../requests/factoryRequests';

type SortField = 'sku' | 'urgency' | 'gap_m2' | 'request_pallets' | 'coverage_days' | 'target_boat';
type SortDir = 'asc' | 'desc';

const URGENCY_ORDER: Record<string, number> = { urgent: 0, warning: 1, ok: 2 };

export function FactoryRequestBuilder() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const month = searchParams.get('month') || '';
  const factoryId = searchParams.get('factory_id') || '';

  const [cycle, setCycle] = useState<FactoryRequestCycle | null>(null);
  const [factoryName, setFactoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('urgency');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const fetchData = useCallback(async () => {
    if (!factoryId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await factoryRequestsApi.getHorizon(factoryId);
      setFactoryName(data.factory_name);
      const match = data.cycles.find(c => c.month === month);
      if (match) {
        setCycle(match);
      } else {
        setError(t('factoryRequests.noCycleFound', 'No se encontraron datos para este mes'));
      }
    } catch {
      setError(t('factoryRequests.loadError', 'Error al cargar datos'));
    } finally {
      setLoading(false);
    }
  }, [factoryId, month, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Format month for display
  const monthDisplay = month
    ? new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(new Date(month + '-01'))
    : '';

  // Sort items
  const sortedItems = cycle ? [...cycle.items].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'sku': return dir * a.sku.localeCompare(b.sku);
      case 'urgency': return dir * ((URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9));
      case 'gap_m2': return dir * (a.gap_m2 - b.gap_m2);
      case 'request_pallets': return dir * (a.request_pallets - b.request_pallets);
      case 'coverage_days': return dir * (a.coverage_days - b.coverage_days);
      case 'target_boat': return dir * (a.target_boat || '').localeCompare(b.target_boat || '');
      default: return 0;
    }
  }) : [];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'urgency' ? 'asc' : 'desc');
    }
  };

  const sortIcon = (field: SortField) =>
    sortField === field ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';

  const urgencyBadge = (item: FactoryRequestCycleItem) => {
    if (item.urgency === 'urgent') return <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-500/20 text-red-400">URGENTE</span>;
    if (item.urgency === 'warning') return <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-500/20 text-amber-400">ADVERTENCIA</span>;
    return <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-500/20 text-slate-400">OK</span>;
  };

  // Capacity bar color
  const capColor = !cycle ? 'bg-slate-600' :
    cycle.utilization_pct > 90 ? 'bg-red-500' :
    cycle.utilization_pct > 70 ? 'bg-amber-500' : 'bg-emerald-500';

  // Signal colors
  const signalColor = !cycle ? 'text-slate-400' :
    cycle.signal_type === 'order_today' ? 'text-amber-400' :
    cycle.signal_type === 'production_delayed' ? 'text-orange-400' :
    cycle.signal_type === 'in_production' ? 'text-emerald-400' : 'text-slate-400';

  const signalText = !cycle ? '' :
    cycle.signal_type === 'order_today' ? t('planning.factoryRequest.orderToday', 'Pedir hoy') :
    cycle.signal_type === 'production_delayed' ? t('planning.factoryRequest.delayed', 'Retrasado') :
    cycle.signal_type === 'in_production' ? t('planning.factoryRequest.inProduction', 'En produccion') :
    t('planning.factoryRequest.onTrack', 'En camino');

  // Deadline display
  const deadlineDisplay = cycle?.deadline
    ? new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(cycle.deadline))
    : null;

  const deadlineUrgent = (cycle?.days_until_deadline ?? 999) < 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">{t('common.loading', 'Cargando...')}</div>
      </div>
    );
  }

  if (error || !cycle) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error || t('factoryRequests.noCycleFound', 'No se encontraron datos')}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors"
          >
            {'\u2190'} {t('factoryRequests.backToPlanning', 'Volver al Planning')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-slate-400 hover:text-white transition-colors text-sm"
              >
                {'\u2190'} Planning
              </button>
              <div className="h-5 w-px bg-slate-700" />
              <div>
                <h1 className="text-base font-semibold text-white capitalize">
                  {monthDisplay}
                </h1>
                <p className="text-[11px] text-slate-500">{factoryName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-sm font-medium ${signalColor}`}>{signalText}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-6 text-xs">
            {/* Deadline */}
            {deadlineDisplay && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">{t('factoryRequests.deadline', 'Fecha limite')}:</span>
                <span className={deadlineUrgent ? 'text-red-400 font-medium' : 'text-slate-300'}>
                  {deadlineDisplay}
                  {deadlineUrgent && (
                    <span className="ml-1 text-red-400/70">
                      ({Math.abs(cycle.days_until_deadline!)}d {t('factoryRequests.overdue', 'vencido')})
                    </span>
                  )}
                </span>
              </div>
            )}

            <div className="h-4 w-px bg-slate-700/50" />

            {/* Products + pallets */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">{t('factoryRequests.productsLabel', 'Productos')}:</span>
              <span className="text-slate-300">{cycle.product_count}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Pallets:</span>
              <span className="text-slate-300">{cycle.total_pallets}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">m²:</span>
              <span className="text-slate-300">{Math.round(cycle.total_m2).toLocaleString()}</span>
            </div>

            <div className="h-4 w-px bg-slate-700/50" />

            {/* Capacity bar */}
            <div className="flex items-center gap-2 min-w-[180px]">
              <span className="text-slate-500">{t('factoryRequests.capacity', 'Cuota')}:</span>
              <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${capColor} transition-all`}
                  style={{ width: `${Math.min(100, cycle.utilization_pct)}%` }}
                />
              </div>
              <span className="text-slate-400 text-[10px]">{Math.round(cycle.utilization_pct)}%</span>
            </div>

            <div className="h-4 w-px bg-slate-700/50" />

            {/* Target boats */}
            {cycle.target_boats.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">{t('factoryRequests.targetBoats', 'Barcos')}:</span>
                <span className="text-slate-300">{cycle.target_boats.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product table */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-800">
              <th className="pb-2 pr-3 cursor-pointer hover:text-slate-300" onClick={() => handleSort('urgency')}>
                {t('factoryRequests.col.urgency', 'Estado')}{sortIcon('urgency')}
              </th>
              <th className="pb-2 pr-3 cursor-pointer hover:text-slate-300" onClick={() => handleSort('sku')}>
                SKU{sortIcon('sku')}
              </th>
              <th className="pb-2 pr-3 text-right cursor-pointer hover:text-slate-300" onClick={() => handleSort('coverage_days')}>
                {t('factoryRequests.col.coverage', 'Cobertura')}{sortIcon('coverage_days')}
              </th>
              <th className="pb-2 pr-3 text-right cursor-pointer hover:text-slate-300" onClick={() => handleSort('gap_m2')}>
                {t('factoryRequests.col.gap', 'Deficit m²')}{sortIcon('gap_m2')}
              </th>
              <th className="pb-2 pr-3 text-right cursor-pointer hover:text-slate-300" onClick={() => handleSort('request_pallets')}>
                {t('factoryRequests.col.pallets', 'Pallets')}{sortIcon('request_pallets')}
              </th>
              <th className="pb-2 pr-3 text-right">
                m²
              </th>
              <th className="pb-2 pr-3 cursor-pointer hover:text-slate-300" onClick={() => handleSort('target_boat')}>
                {t('factoryRequests.col.targetBoat', 'Barco destino')}{sortIcon('target_boat')}
              </th>
              <th className="pb-2 text-right">
                {t('factoryRequests.col.readyDate', 'Listo')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map(item => (
              <tr
                key={item.product_id}
                className={`border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors ${
                  item.is_low_volume ? 'opacity-50' : ''
                }`}
              >
                <td className="py-2.5 pr-3">
                  {urgencyBadge(item)}
                </td>
                <td className="py-2.5 pr-3">
                  <span className="text-slate-200 font-medium">{item.sku}</span>
                  {item.is_low_volume && (
                    <span className="ml-2 text-[9px] text-slate-600">{item.low_volume_reason}</span>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-right">
                  <span className={
                    item.coverage_days < 30 ? 'text-red-400' :
                    item.coverage_days < 60 ? 'text-amber-400' : 'text-slate-400'
                  }>
                    {Math.round(item.coverage_days)}d
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right text-slate-400">
                  {Math.round(item.gap_m2).toLocaleString()}
                </td>
                <td className="py-2.5 pr-3 text-right">
                  <span className="text-indigo-400 font-medium">{item.request_pallets}</span>
                </td>
                <td className="py-2.5 pr-3 text-right text-slate-500">
                  {Math.round(item.request_m2).toLocaleString()}
                </td>
                <td className="py-2.5 pr-3">
                  {item.target_boat ? (
                    <span className="text-slate-300 text-xs">{item.target_boat}</span>
                  ) : (
                    <span className="text-slate-600 text-xs">—</span>
                  )}
                </td>
                <td className="py-2.5 text-right text-slate-500 text-xs">
                  {item.estimated_ready_date
                    ? new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(new Date(item.estimated_ready_date))
                    : '—'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedItems.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            {t('factoryRequests.noProducts', 'No hay productos para este ciclo')}
          </div>
        )}
      </div>
    </div>
  );
}
