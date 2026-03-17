import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { factoryRequestsApi } from '../requests/factoryRequests';
import type {
  FactoryRequestHorizonResponse,
  FactoryRequestProduct,
  FactoryRequestLastSubmission,
  InProductionItem,
} from '../requests/factoryRequests';
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
  const [expandedBoats, setExpandedBoats] = useState<Set<string>>(new Set());

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
      // Auto-expand first boat
      if (result.by_boat?.length > 0) {
        setExpandedBoats(new Set([result.by_boat[0].boat_name]));
      }
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
    if (days <= 0) return { text: t('factoryRequests.noStock', { days: Math.abs(days), defaultValue: 'Sin stock {{days}}d' }), color: 'text-red-400' };
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

  // Production status helpers
  const statusBadge = (status: InProductionItem['production_status']) => {
    switch (status) {
      case 'completed': return { text: t('productionCenter.status.completed', 'Completado'), color: 'text-emerald-400 bg-emerald-500/10', icon: '\u2713' };
      case 'in_progress': return { text: t('productionCenter.status.in_progress', 'En Proceso'), color: 'text-blue-400 bg-blue-500/10', icon: '\u2022\u2022\u2022' };
      case 'scheduled': return { text: t('productionCenter.status.scheduled', 'Programado'), color: 'text-amber-400 bg-amber-500/10', icon: '\u23F0' };
      default: return { text: status, color: 'text-slate-400 bg-slate-500/10', icon: '?' };
    }
  };

  // Toggle boat expansion
  const toggleBoat = (boatName: string) => {
    setExpandedBoats(prev => {
      const next = new Set(prev);
      if (next.has(boatName)) next.delete(boatName); else next.add(boatName);
      return next;
    });
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
  const quota = Number(data.monthly_quota_m2) || 0;

  // Group in-production items by status
  const inProductionItems = data.in_production || [];
  const byBoatGroups = data.by_boat || [];

  // Sort in-production: in_progress first, then scheduled, then completed
  const statusOrder: Record<string, number> = { in_progress: 0, scheduled: 1, completed: 2 };
  const sortedInProduction = [...inProductionItems].sort(
    (a, b) => (statusOrder[a.production_status] ?? 3) - (statusOrder[b.production_status] ?? 3)
  );

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')}
                className="text-slate-400 hover:text-white transition-colors text-sm">
                {'\u2190'} Planning
              </button>
              <div className="h-5 w-px bg-slate-700" />
              <div>
                <h1 className="text-lg font-semibold text-white">
                  {t('productionCenter.title', 'Centro de Producci\u00F3n')}
                </h1>
                <p className="text-[11px] text-slate-500">
                  {data.factory_name}
                </p>
              </div>
            </div>
          </div>

          {/* Quota progress bar */}
          {quota > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500">{t('factoryRequests.quota', 'Cuota mensual')}</span>
                <span className={totals.quotaPct > 100 ? 'text-red-400 font-medium' : 'text-slate-400'}>
                  {Math.round(totals.m2).toLocaleString()} / {Math.round(quota).toLocaleString()} m{'\u00B2'} ({totals.quotaPct}%)
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    totals.quotaPct > 100 ? 'bg-red-500' : totals.quotaPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, totals.quotaPct)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ================================================================ */}
        {/* Group 1: Necesita Produccion (Blind Spots) */}
        {/* ================================================================ */}
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl overflow-hidden">
          {/* Section header */}
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20">
                {data.products.length}
              </span>
              <h2 className="text-lg font-semibold text-white">
                {t('productionCenter.needsProduction', 'Necesita Producci\u00F3n')}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Running totals */}
              {data.products.length > 0 && (
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-700/30 border border-slate-600/30 text-xs">
                  <span className="text-white font-medium">{totals.products} {t('factoryRequests.products', 'prod.')}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-indigo-400 font-medium">{totals.pallets}p</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-300">{Math.round(totals.m2).toLocaleString()} m{'\u00B2'}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-300">{totals.containers} cont.</span>
                </div>
              )}
              {/* Export button */}
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

          {/* Last submission banner */}
          {lastSubmission && (
            <div className="mx-5 mb-3 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs">
              <span className="text-emerald-400">{'\u2713'}</span>
              <span className="text-emerald-300/80">
                {t('factoryRequests.lastSubmission', '\u00DAltima solicitud')}: {' '}
                {lastSubmission.days_ago === 0
                  ? t('factoryRequests.today', 'hoy')
                  : t('factoryRequests.daysAgo', 'hace {{count}} d\u00EDas', { count: lastSubmission.days_ago })}
                {' \u00B7 '}
                {lastSubmission.product_count} {t('factoryRequests.products', 'prod.')}
                {' \u00B7 '}
                {lastSubmission.total_pallets}p
                {' \u00B7 '}
                {Math.round(Number(lastSubmission.total_m2)).toLocaleString()} m{'\u00B2'}
              </span>
            </div>
          )}

          {/* Product table or empty state */}
          {data.products.length === 0 ? (
            <div className="px-5 pb-5 text-center py-8 text-slate-500 text-sm">
              {t('productionCenter.noBlindSpots', 'Todos los productos con necesidad tienen producci\u00F3n programada')}
            </div>
          ) : (
            <div className="px-5 pb-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] text-slate-600 uppercase tracking-wider border-b border-slate-700/50">
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
                              {t('factoryRequests.actNow', 'Pedir ya \u2014 plazo vencido')}
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
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* Group 2: En Produccion (Tracking) */}
        {/* ================================================================ */}
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl overflow-hidden">
          {/* Section header */}
          <div className="px-5 py-4 flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              {inProductionItems.length}
            </span>
            <h2 className="text-lg font-semibold text-white">
              {t('productionCenter.inProduction', 'En Producci\u00F3n')}
            </h2>
          </div>

          {inProductionItems.length === 0 ? (
            <div className="px-5 pb-5 text-center py-8 text-slate-500 text-sm">
              {t('productionCenter.noInProduction', 'No hay productos en producci\u00F3n actualmente')}
            </div>
          ) : (
            <div className="px-5 pb-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] text-slate-600 uppercase tracking-wider border-b border-slate-700/50">
                    <th className="pr-3 pb-2">SKU</th>
                    <th className="pr-3 pb-2">{t('common.status', 'Estado')}</th>
                    <th className="pr-3 pb-2 text-right">{t('factoryRequests.col.requested', 'Solicitado')} m{'\u00B2'}</th>
                    <th className="pr-3 pb-2 text-right">{t('factoryRequests.col.completed', 'Completado')} m{'\u00B2'}</th>
                    <th className="pr-3 pb-2">{t('factoryRequests.col.scheduledDate', 'Fecha')}</th>
                    <th className="pr-4 pb-2">{t('productionCenter.targetBoat', 'Barco destino')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInProduction.map(item => {
                    const badge = statusBadge(item.production_status);
                    const rowTextClass = item.production_status === 'completed'
                      ? 'text-emerald-400/60'
                      : item.production_status === 'in_progress'
                        ? 'text-blue-300'
                        : 'text-amber-300';
                    return (
                      <tr key={item.product_id} className="border-b border-slate-800/20">
                        <td className="pr-3 py-2.5">
                          <span className={`font-medium ${rowTextClass}`}>{item.sku}</span>
                          {item.piggyback_m2 != null && item.piggyback_m2 > 0 && (
                            <div className="text-[10px] mt-0.5 text-amber-400/80">
                              {t('productionCenter.piggyback', 'Considerar agregar {{m2}} m\u00B2 m\u00E1s', { m2: Math.round(item.piggyback_m2).toLocaleString() })}
                            </div>
                          )}
                        </td>
                        <td className="pr-3 py-2.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${badge.color}`}>
                            <span>{badge.icon}</span> {badge.text}
                          </span>
                        </td>
                        <td className="pr-3 py-2.5 text-right text-slate-400 text-xs">
                          {Math.round(Number(item.requested_m2)).toLocaleString()}
                        </td>
                        <td className="pr-3 py-2.5 text-right text-xs">
                          <span className={item.production_status === 'completed' ? 'text-emerald-400' : 'text-slate-500'}>
                            {Math.round(Number(item.completed_m2)).toLocaleString()}
                          </span>
                        </td>
                        <td className="pr-3 py-2.5 text-slate-500 text-xs">
                          {item.scheduled_date ? formatDate(item.scheduled_date) : '\u2014'}
                        </td>
                        <td className="pr-4 py-2.5 text-slate-500 text-xs">
                          {item.target_boat ? (
                            <span>
                              {item.target_boat}
                              {item.target_boat_departure && (
                                <span className="text-slate-600"> ({formatDate(item.target_boat_departure)})</span>
                              )}
                            </span>
                          ) : '\u2014'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* Group 3: Por Barco (Timeline) */}
        {/* ================================================================ */}
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl overflow-hidden">
          {/* Section header */}
          <div className="px-5 py-4 flex items-center gap-3">
            <span className="text-slate-400">{'\u26F5'}</span>
            <h2 className="text-lg font-semibold text-white">
              {t('productionCenter.byBoat', 'Por Barco')}
            </h2>
            {byBoatGroups.length > 0 && (
              <span className="text-xs text-slate-500">({byBoatGroups.length})</span>
            )}
          </div>

          {byBoatGroups.length === 0 ? (
            <div className="px-5 pb-5 text-center py-8 text-slate-500 text-sm">
              {t('factoryRequests.noBoats', 'No hay barcos programados')}
            </div>
          ) : (
            <div className="px-5 pb-5 space-y-3">
              {byBoatGroups.map(boat => {
                const isExpanded = expandedBoats.has(boat.boat_name);
                const isPast = new Date(boat.departure_date) < new Date();
                return (
                  <div
                    key={`${boat.boat_name}-${boat.departure_date}`}
                    className={`rounded-lg border transition-colors ${
                      isPast
                        ? 'border-slate-700/20 bg-slate-800/20 opacity-60'
                        : 'border-slate-700/40 bg-slate-800/30'
                    }`}
                  >
                    <button
                      onClick={() => toggleBoat(boat.boat_name)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium text-sm">{boat.boat_name}</span>
                        <span className="text-slate-500 text-xs">
                          {formatDate(boat.departure_date)} {'\u2192'} {formatDate(boat.arrival_date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs">
                          {Math.round(Number(boat.total_m2)).toLocaleString()} m{'\u00B2'}
                        </span>
                        <span className={`text-slate-500 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          {'\u25BC'}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-3 border-t border-slate-700/30">
                        <table className="w-full text-xs mt-2">
                          <thead>
                            <tr className="text-slate-600 uppercase tracking-wider">
                              <th className="text-left pb-1.5">SKU</th>
                              <th className="text-right pb-1.5">m{'\u00B2'}</th>
                              <th className="text-right pb-1.5">{t('factoryRequests.col.source', 'Origen')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {boat.products.map((prod, idx) => (
                              <tr key={`${prod.sku}-${idx}`} className="border-t border-slate-800/20">
                                <td className="py-1.5 text-slate-300">{prod.sku}</td>
                                <td className="py-1.5 text-right text-slate-400">
                                  {Math.round(prod.m2).toLocaleString()}
                                </td>
                                <td className="py-1.5 text-right">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                    prod.source === 'production'
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : 'bg-red-500/10 text-red-400'
                                  }`}>
                                    {prod.source === 'production'
                                      ? t('factoryRequests.sourceProduction', 'Producci\u00F3n')
                                      : t('factoryRequests.sourceBlindSpot', 'Sin producci\u00F3n')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
