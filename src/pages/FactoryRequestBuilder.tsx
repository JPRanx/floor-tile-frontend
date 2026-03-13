import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { factoryRequestsApi } from '../requests/factoryRequests';
import type { FactoryRequestCycle, FactoryRequestCycleItem } from '../requests/factoryRequests';

// Container constants (match backend/config/shipping.py)
const PALLETS_PER_CONTAINER = 13; // ~13.73 by weight, floor to be safe
const M2_PER_PALLET = 134.4;

interface BoatGroup {
  boatId: string | null;
  boatName: string;
  departure: string | null;
  items: FactoryRequestCycleItem[];
}

const URGENCY_ORDER: Record<string, number> = { critical: 0, urgent: 1, soon: 2, ok: 3 };

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
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
        // Select all requestable items by default
        setSelected(new Set(match.items.filter(i => i.should_request).map(i => i.product_id)));
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

  // Format month
  const monthDisplay = month
    ? new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(new Date(month + '-01'))
    : '';

  // Group items by target boat
  const boatGroups = useMemo((): BoatGroup[] => {
    if (!cycle) return [];
    const groupMap = new Map<string, BoatGroup>();

    // Sort items by urgency first
    const sorted = [...cycle.items].sort((a, b) =>
      (URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9)
    );

    for (const item of sorted) {
      const key = item.target_boat_id || '_unassigned';
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          boatId: item.target_boat_id,
          boatName: item.target_boat || t('factoryRequests.noBoat', 'Sin barco asignado'),
          departure: item.target_boat_departure,
          items: [],
        });
      }
      groupMap.get(key)!.items.push(item);
    }

    // Boats with departures first (sorted by date), unassigned last
    return [...groupMap.values()].sort((a, b) => {
      if (!a.departure && b.departure) return 1;
      if (a.departure && !b.departure) return -1;
      if (a.departure && b.departure) return a.departure.localeCompare(b.departure);
      return 0;
    });
  }, [cycle, t]);

  // Selection helpers
  const toggleItem = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleBoatGroup = (group: BoatGroup) => {
    const ids = group.items.map(i => i.product_id);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  // Compute selected stats per group
  const groupStats = (group: BoatGroup) => {
    const selectedItems = group.items.filter(i => selected.has(i.product_id));
    const pallets = selectedItems.reduce((sum, i) => sum + i.request_pallets, 0);
    const m2 = selectedItems.reduce((sum, i) => sum + i.request_m2, 0);
    const containers = Math.ceil(pallets / PALLETS_PER_CONTAINER);
    const lastContainerPallets = pallets % PALLETS_PER_CONTAINER || (pallets > 0 ? PALLETS_PER_CONTAINER : 0);
    const lastContainerPct = Math.round((lastContainerPallets / PALLETS_PER_CONTAINER) * 100);
    return { pallets, m2, containers, lastContainerPct, count: selectedItems.length };
  };

  // Total selected stats
  const totalStats = useMemo(() => {
    if (!cycle) return { pallets: 0, m2: 0, containers: 0, products: 0 };
    const items = cycle.items.filter(i => selected.has(i.product_id));
    const pallets = items.reduce((sum, i) => sum + i.request_pallets, 0);
    const m2 = items.reduce((sum, i) => sum + i.request_m2, 0);
    return {
      pallets,
      m2,
      containers: Math.ceil(pallets / PALLETS_PER_CONTAINER),
      products: items.length,
    };
  }, [cycle, selected]);

  const urgencyBadge = (item: FactoryRequestCycleItem) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-500/20 text-red-400',
      urgent: 'bg-orange-500/20 text-orange-400',
      soon: 'bg-amber-500/20 text-amber-400',
      ok: 'bg-slate-500/20 text-slate-400',
    };
    const labels: Record<string, string> = {
      critical: 'CRITICO',
      urgent: 'URGENTE',
      soon: 'PRONTO',
      ok: 'OK',
    };
    return (
      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${styles[item.urgency] || styles.ok}`}>
        {labels[item.urgency] || item.urgency.toUpperCase()}
      </span>
    );
  };

  // Container fill visualization
  const containerBar = (pallets: number) => {
    if (pallets === 0) return null;
    const fullContainers = Math.floor(pallets / PALLETS_PER_CONTAINER);
    const remainder = pallets % PALLETS_PER_CONTAINER;
    const bars: JSX.Element[] = [];

    for (let i = 0; i < fullContainers; i++) {
      bars.push(
        <div key={`full-${i}`} className="h-3 w-8 rounded-sm bg-indigo-500" title={`${PALLETS_PER_CONTAINER}p`} />
      );
    }
    if (remainder > 0) {
      const pct = Math.round((remainder / PALLETS_PER_CONTAINER) * 100);
      bars.push(
        <div key="partial" className="h-3 w-8 rounded-sm bg-slate-700 overflow-hidden" title={`${remainder}p (${pct}%)`}>
          <div className="h-full bg-indigo-500/60 rounded-sm" style={{ width: `${pct}%` }} />
        </div>
      );
    }

    return <div className="flex items-center gap-0.5">{bars}</div>;
  };

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
          <button onClick={() => navigate('/')}
            className="px-4 py-2 text-sm text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors">
            {'\u2190'} {t('factoryRequests.backToPlanning', 'Volver al Planning')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sticky header */}
      <div className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')}
                className="text-slate-400 hover:text-white transition-colors text-sm">
                {'\u2190'} Planning
              </button>
              <div className="h-5 w-px bg-slate-700" />
              <div>
                <h1 className="text-base font-semibold text-white capitalize">{monthDisplay}</h1>
                <p className="text-[11px] text-slate-500">{factoryName}</p>
              </div>
            </div>

            {/* Live totals */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <span className="text-slate-500">{t('factoryRequests.selected', 'Seleccionados')}:</span>
                <span className="text-white font-medium">{totalStats.products}</span>
                <span className="text-slate-600">|</span>
                <span className="text-indigo-400 font-medium">{totalStats.pallets}p</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300">{Math.round(totalStats.m2).toLocaleString()} m²</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300">
                  {totalStats.containers} {totalStats.containers === 1
                    ? t('factoryRequests.container', 'contenedor')
                    : t('factoryRequests.containers', 'contenedores')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Boat groups */}
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-6">
        {boatGroups.map(group => {
          const stats = groupStats(group);
          const allSelected = group.items.every(i => selected.has(i.product_id));
          const someSelected = group.items.some(i => selected.has(i.product_id));
          const departureDisplay = group.departure
            ? new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(new Date(group.departure))
            : null;

          return (
            <div key={group.boatId || '_unassigned'} className="rounded-xl border border-slate-800 overflow-hidden">
              {/* Boat header */}
              <div className="px-4 py-3 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={() => toggleBoatGroup(group)}
                    className="w-4 h-4 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500/50 bg-slate-800"
                  />
                  <div>
                    <span className={`font-medium ${group.boatId ? 'text-white' : 'text-slate-500 italic'}`}>
                      {group.boatName}
                    </span>
                    {departureDisplay && (
                      <span className="ml-2 text-slate-500 text-xs">
                        {t('factoryRequests.departs', 'Sale')} {departureDisplay}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Container fill bars */}
                  {containerBar(stats.pallets)}

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{stats.count}/{group.items.length} {t('factoryRequests.products', 'productos')}</span>
                    <span className="text-indigo-400 font-medium">{stats.pallets}p</span>
                    <span>
                      {stats.containers} {stats.containers === 1 ? 'cont.' : 'cont.'}
                      {stats.containers > 0 && (
                        <span className="text-slate-600 ml-1">({stats.lastContainerPct}%)</span>
                      )}
                    </span>
                  </div>

                  {/* OB link */}
                  {group.boatId && (
                    <button
                      onClick={() => navigate(`/order-builder?boat_id=${group.boatId}`)}
                      className="px-2.5 py-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-md transition-colors"
                    >
                      Order Builder {'\u2192'}
                    </button>
                  )}
                </div>
              </div>

              {/* Product rows */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] text-slate-600 uppercase tracking-wider">
                    <th className="pl-4 pr-2 py-1.5 w-8"></th>
                    <th className="pr-3 py-1.5">{t('factoryRequests.col.urgency', 'Estado')}</th>
                    <th className="pr-3 py-1.5">SKU</th>
                    <th className="pr-3 py-1.5 text-right">{t('factoryRequests.col.coverage', 'Cobertura')}</th>
                    <th className="pr-3 py-1.5 text-right">{t('factoryRequests.col.gap', 'Deficit')}</th>
                    <th className="pr-3 py-1.5 text-right">Pallets</th>
                    <th className="pr-3 py-1.5 text-right">m²</th>
                    <th className="pr-4 py-1.5 text-right">{t('factoryRequests.col.readyDate', 'Listo')}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map(item => {
                    const isSelected = selected.has(item.product_id);
                    return (
                      <tr
                        key={item.product_id}
                        onClick={() => toggleItem(item.product_id)}
                        className={`border-t border-slate-800/20 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-500/5 hover:bg-indigo-500/10'
                            : 'opacity-40 hover:opacity-60 hover:bg-slate-800/20'
                        }`}
                      >
                        <td className="pl-4 pr-2 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItem(item.product_id)}
                            onClick={e => e.stopPropagation()}
                            className="w-3.5 h-3.5 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500/50 bg-slate-800"
                          />
                        </td>
                        <td className="pr-3 py-2">{urgencyBadge(item)}</td>
                        <td className="pr-3 py-2">
                          <span className="text-slate-200 font-medium">{item.sku}</span>
                          {item.is_low_volume && (
                            <span className="ml-2 text-[9px] text-slate-600">{item.low_volume_reason}</span>
                          )}
                        </td>
                        <td className="pr-3 py-2 text-right">
                          <span className={
                            item.coverage_days < 30 ? 'text-red-400' :
                            item.coverage_days < 60 ? 'text-amber-400' : 'text-slate-400'
                          }>
                            {Math.round(item.coverage_days)}d
                          </span>
                        </td>
                        <td className="pr-3 py-2 text-right text-slate-400">
                          {Math.round(item.gap_m2).toLocaleString()}
                        </td>
                        <td className="pr-3 py-2 text-right">
                          <span className="text-indigo-400 font-medium">{item.request_pallets}</span>
                        </td>
                        <td className="pr-3 py-2 text-right text-slate-500">
                          {Math.round(item.request_m2).toLocaleString()}
                        </td>
                        <td className="pr-4 py-2 text-right text-slate-500 text-xs">
                          {item.estimated_ready_date
                            ? new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(new Date(item.estimated_ready_date))
                            : '\u2014'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
