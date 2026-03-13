import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { factoryRequestsApi } from '../requests/factoryRequests';
import type { FactoryRequestHorizonResponse, FactoryRequestProduct } from '../requests/factoryRequests';

const PALLETS_PER_CONTAINER = 13;

export function FactoryRequestBuilder() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const factoryId = searchParams.get('factory_id') || '';

  const [data, setData] = useState<FactoryRequestHorizonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!factoryId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await factoryRequestsApi.getHorizon(factoryId);
      setData(result);
      setSelected(new Set(result.products.map(p => p.product_id)));
    } catch {
      setError(t('factoryRequests.loadError', 'Error al cargar datos'));
    } finally {
      setLoading(false);
    }
  }, [factoryId, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Selection
  const toggleItem = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!data) return;
    const allIds = data.products.map(p => p.product_id);
    const allSelected = allIds.every(id => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(allIds));
  };

  // Live totals
  const totals = useMemo(() => {
    if (!data) return { products: 0, pallets: 0, m2: 0, containers: 0 };
    const items = data.products.filter(p => selected.has(p.product_id));
    const pallets = items.reduce((s, p) => s + p.total_factory_need_pallets, 0);
    return {
      products: items.length,
      pallets,
      m2: items.reduce((s, p) => s + Number(p.total_factory_need_m2), 0),
      containers: Math.ceil(pallets / PALLETS_PER_CONTAINER),
    };
  }, [data, selected]);

  const urgencyBadge = (p: FactoryRequestProduct) => {
    const cfg: Record<string, { bg: string; text: string; label: string }> = {
      overdue: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'VENCIDO' },
      order_now: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'PEDIR YA' },
      upcoming: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'PROXIMO' },
    };
    const c = cfg[p.urgency] || cfg.upcoming;
    return <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  const urgencyAccent = (p: FactoryRequestProduct) => {
    if (p.urgency === 'overdue') return 'border-l-2 border-l-red-500/60';
    if (p.urgency === 'order_now') return 'border-l-2 border-l-amber-500/60';
    return '';
  };

  const formatDate = (d: string) =>
    new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(new Date(d));

  // Container bar
  const containerBar = (pallets: number) => {
    if (pallets === 0) return null;
    const full = Math.floor(pallets / PALLETS_PER_CONTAINER);
    const rem = pallets % PALLETS_PER_CONTAINER;
    const bars: ReactNode[] = [];
    for (let i = 0; i < full; i++) {
      bars.push(<div key={`f${i}`} className="h-3 w-6 rounded-sm bg-indigo-500" title={`${PALLETS_PER_CONTAINER}p`} />);
    }
    if (rem > 0) {
      const pct = Math.round((rem / PALLETS_PER_CONTAINER) * 100);
      bars.push(
        <div key="r" className="h-3 w-6 rounded-sm bg-slate-700 overflow-hidden" title={`${rem}p (${pct}%)`}>
          <div className="h-full bg-indigo-500/60" style={{ width: `${pct}%` }} />
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

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error || t('factoryRequests.loadError', 'Error')}</p>
          <button onClick={() => navigate('/')}
            className="px-4 py-2 text-sm text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors">
            {'\u2190'} {t('factoryRequests.backToPlanning', 'Volver al Planning')}
          </button>
        </div>
      </div>
    );
  }

  const allSelected = data.products.length > 0 && data.products.every(p => selected.has(p.product_id));
  const someSelected = data.products.some(p => selected.has(p.product_id));
  const readyDisplay = formatDate(data.estimated_ready_date);
  const leadDays = data.production_lead_days + data.transport_to_port_days;

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
                <h1 className="text-base font-semibold text-white">
                  {t('factoryRequests.title', 'Solicitud de Produccion')}
                </h1>
                <p className="text-[11px] text-slate-500">
                  {data.factory_name} · {leadDays}d {t('factoryRequests.leadTime', 'tiempo de entrega')} · {t('factoryRequests.readyBy', 'Listo')} {readyDisplay}
                </p>
              </div>
            </div>

            {/* Live totals */}
            <div className="flex items-center gap-3">
              {containerBar(totals.pallets)}
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs">
                <span className="text-white font-medium">{totals.products}</span>
                <span className="text-slate-600">|</span>
                <span className="text-indigo-400 font-medium">{totals.pallets}p</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300">{Math.round(totals.m2).toLocaleString()} m²</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300">
                  {totals.containers} cont.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Urgency summary strip */}
      {data.summary.overdue_count > 0 && (
        <div className="border-b border-red-500/20 bg-red-500/5">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-2 text-xs">
            <span className="text-red-400 font-medium">
              {data.summary.overdue_count} {t('factoryRequests.overdueProducts', 'productos vencidos')}
            </span>
            <span className="text-red-400/50">—</span>
            <span className="text-red-400/70">
              {t('factoryRequests.overdueExplain', 'La brecha ya existe en barcos que la produccion no puede alcanzar')}
            </span>
          </div>
        </div>
      )}

      {/* Product table */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        {data.products.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            {t('factoryRequests.noProducts', 'No hay productos que necesiten produccion')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] text-slate-600 uppercase tracking-wider border-b border-slate-800">
                <th className="pl-3 pr-2 pb-2 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500/50 bg-slate-800"
                  />
                </th>
                <th className="pr-3 pb-2">{t('factoryRequests.col.urgency', 'Estado')}</th>
                <th className="pr-3 pb-2">SKU</th>
                <th className="pr-3 pb-2 text-right">{t('factoryRequests.col.stock', 'Stock')}</th>
                <th className="pr-3 pb-2 text-right">Pallets</th>
                <th className="pr-3 pb-2 text-right">m²</th>
                <th className="pr-3 pb-2">{t('factoryRequests.col.gapFrom', 'Brecha en')}</th>
                <th className="pr-3 pb-2">{t('factoryRequests.col.shipsOn', 'Embarca en')}</th>
                <th className="pr-4 pb-2 text-right">{t('factoryRequests.col.velocity', 'Velocidad')}</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map(p => {
                const isSelected = selected.has(p.product_id);
                return (
                  <tr
                    key={p.product_id}
                    onClick={() => toggleItem(p.product_id)}
                    className={`border-b border-slate-800/20 cursor-pointer transition-colors ${urgencyAccent(p)} ${
                      isSelected
                        ? 'bg-indigo-500/5 hover:bg-indigo-500/10'
                        : 'opacity-40 hover:opacity-60 hover:bg-slate-800/20'
                    }`}
                  >
                    <td className="pl-3 pr-2 py-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItem(p.product_id)}
                        onClick={e => e.stopPropagation()}
                        className="w-3.5 h-3.5 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500/50 bg-slate-800"
                      />
                    </td>
                    <td className="pr-3 py-2.5">{urgencyBadge(p)}</td>
                    <td className="pr-3 py-2.5">
                      <span className="text-slate-200 font-medium">{p.sku}</span>
                      {p.trend_direction !== 'stable' && (
                        <span className={`ml-1.5 text-[9px] ${p.trend_direction === 'up' ? 'text-emerald-500' : 'text-red-400'}`}>
                          {p.trend_direction === 'up' ? '\u2191' : '\u2193'}{Math.abs(Number(p.trend_adjustment_pct)).toFixed(0)}%
                        </span>
                      )}
                    </td>
                    <td className="pr-3 py-2.5 text-right">
                      <span className={p.days_of_stock_at_first_gap < 0 ? 'text-red-400' : p.days_of_stock_at_first_gap < 14 ? 'text-amber-400' : 'text-slate-400'}>
                        {p.days_of_stock_at_first_gap}d
                      </span>
                    </td>
                    <td className="pr-3 py-2.5 text-right">
                      <span className="text-indigo-400 font-medium">{p.total_factory_need_pallets}</span>
                    </td>
                    <td className="pr-3 py-2.5 text-right text-slate-500">
                      {Math.round(Number(p.total_factory_need_m2)).toLocaleString()}
                    </td>
                    <td className="pr-3 py-2.5">
                      <span className="text-slate-400 text-xs">{p.first_gap_boat}</span>
                      <span className="text-slate-600 text-[10px] ml-1">{formatDate(p.first_gap_departure)}</span>
                    </td>
                    <td className="pr-3 py-2.5">
                      {p.ships_on_boat ? (
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/order-builder?boat_id=${p.ships_on_boat_id}`); }}
                          className="text-indigo-400 hover:text-indigo-300 text-xs transition-colors"
                        >
                          {p.ships_on_boat} {'\u2192'}
                        </button>
                      ) : (
                        <span className="text-slate-600 text-xs">{'\u2014'}</span>
                      )}
                    </td>
                    <td className="pr-4 py-2.5 text-right text-slate-500 text-xs">
                      {Number(p.daily_velocity_m2).toFixed(1)} m²/d
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
