import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { factoryRequestsApi } from '../requests/factoryRequests';
import type { FactoryRequestHorizonResponse, FactoryRequestProduct, FactoryRequestLastSubmission } from '../requests/factoryRequests';
import * as XLSX from 'xlsx';

const M2_PER_PALLET = 134.4;
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
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());
  const [lastSubmission, setLastSubmission] = useState<FactoryRequestLastSubmission | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!factoryId) return;
    setLoading(true);
    setError(null);
    try {
      const [result, lastSub] = await Promise.all([
        factoryRequestsApi.getHorizon(factoryId),
        factoryRequestsApi.getLastSubmission(factoryId),
      ]);
      setData(result);
      setLastSubmission(lastSub);
      setSelected(new Set(result.products.map(p => p.product_id)));
      setQuantities(new Map(result.products.map(p => [p.product_id, p.total_factory_need_pallets])));
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

  // Quantity editing
  const updateQuantity = (productId: string, value: number) => {
    setQuantities(prev => {
      const next = new Map(prev);
      next.set(productId, Math.max(0, value));
      return next;
    });
  };

  // Live totals
  const totals = useMemo(() => {
    if (!data) return { products: 0, pallets: 0, m2: 0, containers: 0, quotaPct: 0 };
    const items = data.products.filter(p => selected.has(p.product_id));
    const pallets = items.reduce((s, p) => s + (quantities.get(p.product_id) ?? p.total_factory_need_pallets), 0);
    const m2 = pallets * M2_PER_PALLET;
    const quota = Number(data.monthly_quota_m2) || 0;
    return {
      products: items.length,
      pallets,
      m2,
      containers: Math.ceil(pallets / PALLETS_PER_CONTAINER),
      quotaPct: quota > 0 ? Math.round((m2 / quota) * 100) : 0,
    };
  }, [data, selected, quantities]);

  // Date formatting
  const formatDate = (d: string) =>
    new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(new Date(d));

  // Stock status text
  const stockStatus = (days: number) => {
    if (days < 0) return { text: t('factoryRequests.noStock', { days: Math.abs(days), defaultValue: 'Sin stock {{days}}d' }), color: 'text-red-400' };
    if (days === 0) return { text: t('factoryRequests.noStock', { days: 0, defaultValue: 'Sin stock 0d' }), color: 'text-red-400' };
    if (days <= 14) return { text: t('factoryRequests.lowStock', { days, defaultValue: 'Stock {{days}}d' }), color: 'text-amber-400' };
    return { text: t('factoryRequests.okStock', { days, defaultValue: 'Stock {{days}}d' }), color: 'text-emerald-400' };
  };

  // Urgency badge
  const urgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'sin_stock': return { text: t('factoryRequests.urgency.sinStock', 'Sin stock'), color: 'text-red-400 bg-red-500/10' };
      case 'critico': return { text: t('factoryRequests.urgency.critico', 'Critico'), color: 'text-orange-400 bg-orange-500/10' };
      case 'pedir_ahora': return { text: t('factoryRequests.urgency.pedirAhora', 'Pedir ahora'), color: 'text-amber-400 bg-amber-500/10' };
      case 'planificar': return { text: t('factoryRequests.urgency.planificar', 'Planificar'), color: 'text-slate-400 bg-slate-500/10' };
      default: return { text: urgency, color: 'text-slate-400 bg-slate-500/10' };
    }
  };

  // Row accent based on stock
  const rowAccent = (p: FactoryRequestProduct, isSelected: boolean) => {
    if (!isSelected) return '';
    if (p.days_of_stock_at_first_gap < 0) return 'border-l-2 border-l-red-500/60';
    if (p.days_of_stock_at_first_gap <= 14) return 'border-l-2 border-l-amber-500/60';
    return '';
  };

  // Excel export + submission tracking
  const exportToExcel = async () => {
    if (!data) return;
    const selectedProducts = data.products.filter(p => selected.has(p.product_id));
    const rows = selectedProducts.map(p => ({
        'SKU': p.sku,
        'Cantidad (pallets)': quantities.get(p.product_id) ?? p.total_factory_need_pallets,
        'm\u00B2': (quantities.get(p.product_id) ?? p.total_factory_need_pallets) * M2_PER_PALLET,
        'Prioridad': p.urgency === 'sin_stock' ? 'Sin stock' : p.urgency === 'critico' ? 'Critico' : p.urgency === 'pedir_ahora' ? 'Pedir ahora' : 'Planificar',
        'Velocidad (m\u00B2/d)': Number(p.daily_velocity_m2).toFixed(1),
      }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];

    const totalRow = rows.length + 2;
    XLSX.utils.sheet_add_aoa(ws, [
      ['TOTAL', totals.pallets, Math.round(totals.m2), `${totals.containers} contenedores`, '']
    ], { origin: `A${totalRow}` });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitud');
    const filename = `Solicitud_Produccion_${data.factory_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);

    // Record submission in backend
    setSubmitting(true);
    try {
      const submission = await factoryRequestsApi.recordSubmission({
        factory_id: data.factory_id,
        factory_name: data.factory_name,
        items: selectedProducts.map(p => ({
          product_id: p.product_id,
          sku: p.sku,
          pallets: quantities.get(p.product_id) ?? p.total_factory_need_pallets,
          m2: (quantities.get(p.product_id) ?? p.total_factory_need_pallets) * M2_PER_PALLET,
          urgency: p.urgency,
        })),
        total_pallets: totals.pallets,
        total_m2: totals.m2,
        total_containers: totals.containers,
      });
      setLastSubmission({
        id: submission.id,
        submitted_at: submission.submitted_at,
        total_pallets: submission.total_pallets,
        total_m2: submission.total_m2,
        total_containers: submission.total_containers,
        product_count: submission.product_count,
        days_ago: 0,
      });
    } catch {
      // Non-fatal — Excel was already downloaded
      console.error('Failed to record submission');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">{t('common.loading', 'Cargando...')}</div>
      </div>
    );
  }

  // Error state
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
  const leadDays = data.production_lead_days + data.transport_to_port_days;

  // Timeline data
  const today = new Date();
  const readyDate = new Date(data.estimated_ready_date);
  const shipsOnDeparture = data.products[0]?.ships_on_departure;
  const shipsOnBoat = data.products[0]?.ships_on_boat;
  // Find the matching boat for arrival date
  const targetBoat = data.upcoming_boats?.find(b => b.can_receive_production);
  const arrivalDate = targetBoat?.arrival_date;

  const quotaDisplay = Number(data.monthly_quota_m2) > 0
    ? `${(Number(data.monthly_quota_m2) / 1000).toFixed(0)}k m\u00B2/mes`
    : '';

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
                  {data.factory_name} · {leadDays}d {t('factoryRequests.leadTime', 'tiempo de entrega')}
                </p>
              </div>
            </div>

            {/* Running totals + export */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs">
                <span className="text-white font-medium">{totals.products} {t('factoryRequests.products', 'prod.')}</span>
                <span className="text-slate-600">|</span>
                <span className="text-indigo-400 font-medium">{totals.pallets}p</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300">{Math.round(totals.m2).toLocaleString()} m{'\u00B2'}</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300">{totals.containers} cont.</span>
                {totals.quotaPct > 0 && (
                  <>
                    <span className="text-slate-600">|</span>
                    <span className={totals.quotaPct > 100 ? 'text-red-400 font-medium' : 'text-slate-400'}>
                      {totals.quotaPct}% {t('factoryRequests.quota', 'cuota')}
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={exportToExcel}
                disabled={totals.products === 0 || submitting}
                className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors"
              >
                {submitting
                  ? t('factoryRequests.submitting', 'Registrando...')
                  : t('factoryRequests.export', 'Generar solicitud')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {/* Last submission banner */}
        {lastSubmission && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs">
            <span className="text-emerald-400">&#x2713;</span>
            <span className="text-emerald-300/80">
              {t('factoryRequests.lastSubmission', 'Ultima solicitud')}: {' '}
              {lastSubmission.days_ago === 0
                ? t('factoryRequests.today', 'hoy')
                : t('factoryRequests.daysAgo', 'hace {{count}} dias', { count: lastSubmission.days_ago })}
              {' \u00B7 '}
              {lastSubmission.product_count} {t('factoryRequests.products', 'prod.')}
              {' \u00B7 '}
              {lastSubmission.total_pallets}p
              {' \u00B7 '}
              {Math.round(Number(lastSubmission.total_m2)).toLocaleString()} m{'\u00B2'}
            </span>
          </div>
        )}

        {/* Timeline strip */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg px-5 py-3">
          <div className="flex items-center justify-between text-xs">
            {/* Step 1: Order today */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-indigo-400 font-medium">{t('factoryRequests.timeline.orderToday', 'Pedir hoy')}</span>
              <span className="text-slate-500">{formatDate(today.toISOString())}</span>
            </div>
            <div className="flex-1 border-t border-dashed border-slate-700 mx-2" />
            {/* Step 2: Production */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-slate-300">{t('factoryRequests.timeline.production', 'Produccion')} ({data.production_lead_days}d)</span>
              <span className="text-slate-600">{'\u2192'}</span>
            </div>
            <div className="flex-1 border-t border-dashed border-slate-700 mx-2" />
            {/* Step 3: To port */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-slate-300">{t('factoryRequests.timeline.toPort', 'Al puerto')} ({data.transport_to_port_days}d)</span>
              <span className="text-slate-500">{formatDate(readyDate.toISOString())}</span>
            </div>
            <div className="flex-1 border-t border-dashed border-slate-700 mx-2" />
            {/* Step 4: Ships */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-slate-300">
                {t('factoryRequests.timeline.ships', 'Embarca')} {shipsOnBoat || '—'}
              </span>
              <span className="text-slate-500">{shipsOnDeparture ? formatDate(shipsOnDeparture) : '—'}</span>
            </div>
            <div className="flex-1 border-t border-dashed border-slate-700 mx-2" />
            {/* Step 5: Arrives */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-emerald-400 font-medium">{t('factoryRequests.timeline.arrives', 'Llega bodega')}</span>
              <span className="text-slate-500">{arrivalDate ? `~${formatDate(arrivalDate)}` : '—'}</span>
            </div>
          </div>
        </div>

        {/* Boat schedule strip */}
        {data.upcoming_boats && data.upcoming_boats.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-600 font-medium">
                {t('factoryRequests.boatSchedule', 'Proximos barcos')}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {data.upcoming_boats.map((boat) => (
                <div
                  key={`${boat.boat_name}-${boat.departure_date}`}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg border text-xs ${
                    boat.can_receive_production
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-slate-700/40 bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={boat.can_receive_production ? 'text-white font-medium' : 'text-slate-400'}>
                      {boat.boat_name}
                    </span>
                    <span className="text-slate-500">
                      {formatDate(boat.departure_date)} ({boat.days_until_departure}d)
                    </span>
                  </div>
                  <div className="mt-0.5">
                    {boat.can_receive_production ? (
                      <span className="text-emerald-400 text-[10px]">
                        {'\u2713'} {t('factoryRequests.productionReaches', 'produccion alcanza')}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-[10px]">
                        {t('factoryRequests.siesaOnly', 'solo SIESA')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product table */}
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
                <th className="pr-3 pb-2">SKU</th>
                <th className="pr-3 pb-2">{t('factoryRequests.col.stock', 'Stock')}</th>
                <th className="pr-3 pb-2 text-right">{t('factoryRequests.col.velocity', 'Velocidad')}</th>
                <th className="pr-3 pb-2 text-right">{t('factoryRequests.col.suggested', 'Sugerido')}</th>
                <th className="pr-3 pb-2 text-right">{t('factoryRequests.col.quantity', 'Cantidad')}</th>
                <th className="pr-4 pb-2 text-right">m{'\u00B2'}</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map(p => {
                const isSelected = selected.has(p.product_id);
                const qty = quantities.get(p.product_id) ?? p.total_factory_need_pallets;
                const m2 = qty * M2_PER_PALLET;
                const stock = stockStatus(p.days_of_stock_at_first_gap);
                return (
                  <tr
                    key={p.product_id}
                    onClick={() => toggleItem(p.product_id)}
                    className={`border-b border-slate-800/20 cursor-pointer transition-colors ${rowAccent(p, isSelected)} ${
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
                    <td className="pr-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200 font-medium">{p.sku}</span>
                        {p.trend_direction !== 'stable' && (
                          <span className={`text-[10px] ${p.trend_direction === 'up' ? 'text-emerald-500' : 'text-red-400'}`}>
                            {p.trend_direction === 'up' ? '\u2191' : '\u2193'}{Math.abs(Number(p.trend_adjustment_pct)).toFixed(0)}%
                          </span>
                        )}
                        {(() => { const badge = urgencyBadge(p.urgency); return (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>{badge.text}</span>
                        ); })()}
                      </div>
                      {/* Act-by deadline label */}
                      {p.act_by_date ? (() => {
                        const daysUntil = Math.ceil((new Date(p.act_by_date).getTime() - Date.now()) / 86400000);
                        const isUrgent = daysUntil <= 7;
                        return (
                          <div className={`text-[10px] mt-0.5 ${isUrgent ? 'text-amber-400' : 'text-slate-500'}`}>
                            {t('factoryRequests.actBy', 'Pedir antes del')} {formatDate(p.act_by_date)}
                            {isUrgent && daysUntil > 0 && ` (${daysUntil}d)`}
                          </div>
                        );
                      })() : (p.urgency === 'sin_stock' || p.urgency === 'critico') ? (
                        <div className="text-[10px] mt-0.5 text-red-400">
                          {t('factoryRequests.actNow', 'Pedir ya — plazo vencido')}
                        </div>
                      ) : null}
                    </td>
                    <td className="pr-3 py-2.5">
                      <span className={`text-xs ${stock.color}`}>{stock.text}</span>
                    </td>
                    <td className="pr-3 py-2.5 text-right text-slate-500 text-xs">
                      {Number(p.daily_velocity_m2).toFixed(1)} m{'\u00B2'}/d
                    </td>
                    <td className="pr-3 py-2.5 text-right text-slate-600 text-xs">
                      {p.total_factory_need_pallets}p
                    </td>
                    <td className="pr-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                      <input
                        type="number"
                        min={0}
                        value={qty}
                        onChange={e => updateQuantity(p.product_id, parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-0.5 text-right text-sm text-indigo-300 bg-slate-800/80 border border-indigo-500/30 rounded focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                      />
                    </td>
                    <td className="pr-4 py-2.5 text-right text-slate-500 text-xs">
                      {Math.round(m2).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Capacity reference */}
        {quotaDisplay && (
          <div className="text-center text-[11px] text-slate-600 py-2">
            {t('factoryRequests.capacityRef', { quota: quotaDisplay, defaultValue: 'Capacidad mensual: {{quota}}' })}
          </div>
        )}
      </div>
    </div>
  );
}
