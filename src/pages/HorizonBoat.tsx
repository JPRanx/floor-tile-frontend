import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { horizonApi, type HorizonDetailResponse, type HorizonProduct } from '../requests/horizon';
import { draftsApi } from '../requests/drafts';
import api from '../requests/api';

function urgencyColor(urgency: string) {
  switch (urgency) {
    case 'critical': return 'text-red-400';
    case 'urgent': return 'text-orange-400';
    case 'soon': return 'text-yellow-400';
    default: return 'text-green-400';
  }
}

function urgencyBg(urgency: string) {
  switch (urgency) {
    case 'critical': return 'bg-red-500/10 border-red-500/20';
    case 'urgent': return 'bg-orange-500/10 border-orange-500/20';
    case 'soon': return 'bg-yellow-500/10 border-yellow-500/20';
    default: return 'bg-slate-800 border-slate-700';
  }
}

const M2_PER_PALLET = 134.4;

interface ProductRow extends HorizonProduct {
  user_pallets: number;
  user_m2: number;
  // Audit fields — populated only when a saved draft exists for this product.
  draft_item_id?: string;
  actual_loaded_pallets?: number | null;
  cut_reason?: string | null;
}

const CUT_REASONS = [
  { value: '', label: '—' },
  { value: 'weight', label: 'Peso' },
  { value: 'lot_mix', label: 'Mezcla de lotes' },
  { value: 'deferred', label: 'Diferido' },
  { value: 'other', label: 'Otro' },
];

function AuditCells({
  row,
  onSaved,
}: {
  row: ProductRow;
  onSaved: (updated: { actual_loaded_pallets: number | null; cut_reason: string | null }) => void;
}) {
  const [actual, setActual] = useState<string>(
    row.actual_loaded_pallets != null ? String(row.actual_loaded_pallets) : ''
  );
  const [reason, setReason] = useState<string>(row.cut_reason ?? '');
  const [busy, setBusy] = useState(false);

  if (!row.draft_item_id) {
    return (
      <>
        <td className="px-3 py-2.5 text-right text-slate-600 italic text-xs">—</td>
        <td className="px-3 py-2.5 text-slate-600 italic text-xs">—</td>
      </>
    );
  }

  const save = async () => {
    if (!row.draft_item_id) return;
    setBusy(true);
    try {
      const parsed = actual === '' ? null : Number(actual);
      await draftsApi.updateItemAudit(row.draft_item_id, {
        actual_loaded_pallets: parsed,
        cut_reason: reason || null,
      });
      onSaved({
        actual_loaded_pallets: parsed,
        cut_reason: reason || null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <td className="px-3 py-2.5 text-right">
        <input
          type="number"
          step={0.5}
          min={0}
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          onBlur={save}
          disabled={busy}
          placeholder={String(row.user_pallets)}
          className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-slate-200 text-sm focus:border-blue-500 focus:outline-none"
        />
      </td>
      <td className="px-3 py-2.5">
        <select
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
          }}
          onBlur={save}
          disabled={busy}
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-sm focus:border-blue-500 focus:outline-none"
        >
          {CUT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </td>
    </>
  );
}

type SortField =
  | 'sku'
  | 'tier'
  | 'daily_velocity_m2'
  | 'current_stock_m2'
  | 'running_stock_m2'
  | 'days_of_stock'
  | 'coverage_gap_m2'
  | 'suggested_pallets'
  | 'factory_available_m2'
  | 'buffer_pallets';

type SortDir = 'asc' | 'desc';

export function HorizonBoat() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const factoryId = searchParams.get('factory') || '';
  const boatId = searchParams.get('boat') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HorizonDetailResponse | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [skipDismissed, setSkipDismissed] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Default direction: numeric cols desc (biggest first), sku asc
      setSortDir(field === 'sku' ? 'asc' : 'desc');
    }
  };

  const sortedProducts = useMemo(() => {
    if (!sortField) return products;
    const list = [...products];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const av = a[sortField] as string | number;
      const bv = b[sortField] as string | number;
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
    return list;
  }, [products, sortField, sortDir]);

  useEffect(() => {
    if (!factoryId || !boatId) return;
    setLoading(true);

    // Load brain data + user's working draft in parallel
    Promise.all([
      horizonApi.getBoatDetail(factoryId, boatId),
      draftsApi.getDraft(boatId, factoryId),
    ])
      .then(([res, draft]) => {
        setData(res);
        const isOrderedBoat = res.boat.state === 'ORDERED' || res.boat.state === 'DISPATCHED' || res.boat.state === 'CONFIRMED';

        // Build pallet map from user's draft (if she saved one)
        const draftPallets: Record<string, number> = {};
        // Audit-trail data per product (only present once a draft exists)
        const draftAudit: Record<
          string,
          { id: string; actual_loaded_pallets: number | null; cut_reason: string | null }
        > = {};
        if (draft && draft.items) {
          for (const item of draft.items) {
            if (draft.status !== 'ordered' && draft.status !== 'confirmed') {
              draftPallets[item.product_id] = item.selected_pallets;
            }
            draftAudit[item.product_id] = {
              id: item.id,
              actual_loaded_pallets: item.actual_loaded_pallets,
              cut_reason: item.cut_reason,
            };
          }
        }
        const hasDraft = Object.keys(draftPallets).length > 0;

        const rows: ProductRow[] = (res.boat.products || []).map((p) => {
          const pallets = isOrderedBoat
            ? p.allocated_pallets
            : hasDraft
              ? (draftPallets[p.product_id] ?? 0)
              : p.can_ship_pallets;
          const audit = draftAudit[p.product_id];
          return {
            ...p,
            user_pallets: pallets,
            user_m2: pallets * M2_PER_PALLET,
            draft_item_id: audit?.id,
            actual_loaded_pallets: audit?.actual_loaded_pallets,
            cut_reason: audit?.cut_reason,
          };
        });

        // Sort: critical first, then by days_of_stock
        rows.sort((a, b) => {
          const order: Record<string, number> = { critical: 0, urgent: 1, soon: 2, ok: 3 };
          const diff = (order[a.urgency] ?? 4) - (order[b.urgency] ?? 4);
          if (diff !== 0) return diff;
          return a.days_of_stock - b.days_of_stock;
        });
        setProducts(rows);
        if (hasDraft) setSaved(true); // She already saved before
      })
      .catch((err) => setError(err?.message || 'Error al cargar barco'))
      .finally(() => setLoading(false));
  }, [factoryId, boatId]);

  const updatePallets = (productId: string, value: number) => {
    const pallets = Math.max(0, value);
    setProducts((prev) =>
      prev.map((p) => p.product_id === productId
        ? { ...p, user_pallets: pallets, user_m2: pallets * M2_PER_PALLET }
        : p)
    );
    setSaved(false);
  };

  const updateM2 = (productId: string, value: number) => {
    const m2In = Math.max(0, value);
    // Snap to half-pallet precision (0, 0.5, 1, 1.5, …). Recompute m² from
    // the snapped pallet count so the row's two numbers stay consistent —
    // otherwise the user sees e.g. "7.5 pallets, 500 m²" while 7.5 × 134.4 = 1008.
    const pallets = Math.round((m2In / M2_PER_PALLET) * 2) / 2;
    setProducts((prev) =>
      prev.map((p) => p.product_id === productId
        ? { ...p, user_pallets: pallets, user_m2: pallets * M2_PER_PALLET }
        : p)
    );
    setSaved(false);
  };

  const resetToSuggestions = () => {
    setProducts((prev) =>
      prev.map((p) => ({ ...p, user_pallets: p.can_ship_pallets, user_m2: p.can_ship_pallets * M2_PER_PALLET }))
    );
    setSaved(false);
  };

  const skipBoat = async () => {
    // Zero everything, save, go back — one-click decision
    try {
      await draftsApi.save({
        boat_id: boatId,
        factory_id: factoryId,
        items: [],
      });
      navigate('/horizon');
    } catch {
      setError('Error al guardar');
    }
  };

  const totals = useMemo(() => {
    const pallets = products.reduce((sum, p) => sum + p.user_pallets, 0);
    const m2 = products.reduce((sum, p) => sum + p.user_m2, 0);
    return { pallets, containers: Math.floor(pallets / 13), m2 };
  }, [products]);

  const overAllocated = useMemo(() =>
    products.filter((p) => p.user_pallets > p.factory_max_pallets && p.user_pallets > 0),
    [products]
  );

  const saveDraft = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const items = products
        .filter((p) => p.user_pallets > 0)
        .map((p) => ({
          product_id: p.product_id,
          selected_pallets: p.user_pallets,
          // Audit trail: capture brain's suggestion so we can observe how
          // often Ashley's actual orders diverge and on which products.
          suggested_pallets: p.suggested_pallets,
        }));
      await draftsApi.save({
        boat_id: boatId,
        factory_id: factoryId,
        items,
      });
      setSaved(true);
    } catch {
      setError('Error al guardar borrador');
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = async () => {
    if (!data) return;
    const exportProducts = products
      .filter((p) => p.user_pallets > 0)
      .map((p) => ({ sku: p.sku, pallets: p.user_pallets }));

    try {
      const response = await api.post('/order-builder/export', {
        products: exportProducts,
        boat_departure: data.boat.departure_date,
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `orden_${data.boat.boat_name}_${data.boat.departure_date}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

      // Mark draft as ordered after successful export
      if (data.boat.draft_id) {
        await draftsApi.updateStatus(data.boat.draft_id, 'ordered');
      }
    } catch {
      setError('Error al exportar');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const boat = data.boat;
  const isLocked = boat.state === 'DISPATCHED' || boat.state === 'CONFIRMED' || boat.state === 'ORDERED';
  const dep = new Date(boat.departure_date + 'T00:00:00');
  const fmtDate = dep.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });

  // Keep state labels in English — they match what Ashley reads on
  // BL forms and TIBA documents. Translating to Spanish creates
  // friction when reconciling boat info across surfaces.
  const stateLabel: Record<string, string> = {
    DISPATCHED: 'Dispatched',
    CONFIRMED: 'Confirmed',
    ORDERED: 'Ordered',
  };

  // Receipt view for locked boats — minimal, read-only
  if (isLocked) {
    const shippedProducts = products.filter((p) => p.user_pallets > 0);
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={() => navigate('/horizon')} className="text-xs text-slate-500 hover:text-slate-300 mb-1">&larr; Volver</button>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-100" translate="no">{boat.boat_name}</h1>
            <p className="text-sm text-slate-400">{fmtDate} &middot; {boat.days_until_departure}d &middot; {boat.carrier}</p>
          </div>
          <div className="text-right">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              boat.state === 'DISPATCHED' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              {stateLabel[boat.state] || boat.state}
            </span>
            <p className="text-2xl font-bold text-slate-100 mt-2">{totals.pallets} pallets</p>
            <p className="text-xs text-slate-400">{totals.containers} cont &middot; {totals.m2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²</p>
          </div>
        </div>

        {boat.bl_count && boat.bl_count > 1 && (
          <p className="text-xs text-slate-500 mb-4">{boat.bl_count} BLs combinados</p>
        )}

        <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs text-slate-500 uppercase">
                <th className="px-4 py-2">SKU</th>
                <th className="px-3 py-2 text-right">Pallets</th>
                <th className="px-3 py-2 text-right">m²</th>
                <th className="px-3 py-2 text-right" title="Pallets que realmente se cargaron al contenedor">Cargados</th>
                <th className="px-3 py-2 text-left">Razón</th>
              </tr>
            </thead>
            <tbody>
              {shippedProducts.map((p) => (
                <tr key={p.product_id} className="border-b border-slate-700/50">
                  <td className="px-4 py-2.5 text-slate-200 font-medium">{p.sku}</td>
                  <td className="px-3 py-2.5 text-right text-slate-300">{p.user_pallets}</td>
                  <td className="px-3 py-2.5 text-right text-slate-400">{p.user_m2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <AuditCells row={p} onSaved={(updated) => {
                    setProducts((prev) => prev.map((x) =>
                      x.product_id === p.product_id
                        ? { ...x, actual_loaded_pallets: updated.actual_loaded_pallets, cut_reason: updated.cut_reason }
                        : x
                    ));
                  }} />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-600 font-medium">
                <td className="px-4 py-2.5 text-slate-300">Total</td>
                <td className="px-3 py-2.5 text-right text-slate-200">{totals.pallets}</td>
                <td className="px-3 py-2.5 text-right text-slate-300">{totals.m2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>

        {data.next_boat && (
          <p className="mt-4 text-xs text-slate-600">
            Siguiente: <span translate="no">{data.next_boat.boat_name}</span> ({data.next_boat.departure_date})
          </p>
        )}
      </div>
    );
  }

  // Order Builder view for actionable boats
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <button onClick={() => navigate('/horizon')} className="text-xs text-slate-500 hover:text-slate-300 mb-1">&larr; {t('common.back', 'Volver')}</button>
          <h1 className="text-xl font-bold text-slate-100" translate="no">{boat.boat_name}</h1>
          <p className="text-sm text-slate-400">{fmtDate} &middot; {boat.days_until_departure} dias &middot; {boat.carrier}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-100">{totals.pallets}</p>
          <p className="text-xs text-slate-400">{totals.containers} cont &middot; {totals.m2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²</p>
        </div>
      </div>

      {/* Skip recommendation */}
      {boat.skip_recommended && !skipDismissed && (
        <div className="mb-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-400 text-sm font-medium">No llena un envio minimo</p>
              <p className="text-red-500/70 text-xs mt-0.5">{boat.skip_reason}</p>
            </div>
            <div className="flex gap-2 ml-4 shrink-0">
              <button onClick={skipBoat} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded">
                Ignorar barco
              </button>
              <button onClick={() => setSkipDismissed(true)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded">
                Continuar de todos modos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Over-allocation warning */}
      {overAllocated.length > 0 && (
        <div className="mb-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-amber-400 text-sm font-medium">
            {overAllocated.length} producto{overAllocated.length > 1 ? 's' : ''} excede{overAllocated.length === 1 ? '' : 'n'} stock de fabrica
          </p>
          <p className="text-amber-500/70 text-xs mt-1">
            {overAllocated.map((p) => p.sku).join(', ')} — excede disponibilidad SIESA
          </p>
        </div>
      )}

      {/* Action bar */}
      <div className="flex gap-3 mb-4">
        <button onClick={saveDraft} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded disabled:opacity-50">
          {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar borrador'}
        </button>
        <button onClick={resetToSuggestions} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded">
          Resetear sugerencias
        </button>
        <button onClick={exportExcel} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded">
          Exportar Excel
        </button>
      </div>

      {/* Product table */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-xs text-slate-500 uppercase select-none">
              {([
                { field: 'sku' as const, label: 'SKU', align: 'left', marker: null, title: '' },
                { field: 'tier' as const, label: 'Tier', align: 'center', marker: null, title: 'A=top 25% velocidad, B=medio 50%, C=bottom 25%' },
                { field: 'buffer_pallets' as const, label: 'Buffer', align: 'right', marker: '◆', markerColor: 'text-violet-500', title: 'Stock minimo objetivo (semanas × velocidad, según tier)' },
                { field: 'daily_velocity_m2' as const, label: 'Vel/dia', align: 'right', marker: '●', markerColor: 'text-emerald-600', title: 'Real: promedio 90 dias de ventas' },
                { field: 'current_stock_m2' as const, label: 'Stock', align: 'right', marker: '●', markerColor: 'text-emerald-600', title: 'Real: ultimo inventario SIESA' },
                { field: 'running_stock_m2' as const, label: 'Disponible', align: 'right', marker: '◆', markerColor: 'text-violet-500', title: 'Proyectado: bodega + en transito' },
                { field: 'days_of_stock' as const, label: 'Dias', align: 'right', marker: '●', markerColor: 'text-emerald-600', title: 'Real: stock actual / velocidad' },
                { field: 'coverage_gap_m2' as const, label: 'Brecha', align: 'right', marker: '◆', markerColor: 'text-violet-500', title: 'Proyectado: deficit vs buffer (cuanto falta para alcanzar buffer al siguiente reabasto)' },
                { field: 'suggested_pallets' as const, label: 'Sugerido', align: 'right', marker: '◆', markerColor: 'text-violet-500', title: 'Proyectado: m² para cerrar brecha (sugerido_pallets × 134.4)' },
                { field: 'factory_available_m2' as const, label: 'Fabrica', align: 'right', marker: '◆', markerColor: 'text-violet-500', title: 'Proyectado: SIESA menos barcos anteriores' },
              ]).map((col) => {
                const active = sortField === col.field;
                const arrow = active ? (sortDir === 'asc' ? '↑' : '↓') : '';
                const alignCls = col.align === 'right' ? 'text-right' : '';
                return (
                  <th
                    key={col.field}
                    onClick={() => toggleSort(col.field)}
                    className={`px-3 py-2 cursor-pointer hover:text-slate-300 transition-colors ${alignCls} ${active ? 'text-slate-200' : ''}`}
                  >
                    {col.label}
                    {col.marker && <span className={`ml-1 ${col.markerColor}`} title={col.title}>{col.marker}</span>}
                    {arrow && <span className="ml-1 text-blue-400">{arrow}</span>}
                  </th>
                );
              })}
              <th className="px-3 py-2 text-center">Pallets / m²</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map((p) => {
              const over = p.user_pallets > p.factory_max_pallets;
              const borderClass = over
                ? 'border-amber-500 text-amber-300 focus:border-amber-400'
                : 'border-slate-600 text-slate-200 focus:border-blue-500';
              return (
                <tr key={p.product_id} className={`border-b border-slate-700/50 ${urgencyBg(p.urgency)}`}>
                  <td className="px-4 py-2">
                    <span className={`font-medium ${urgencyColor(p.urgency)}`}>{p.sku}</span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        p.tier === 'A'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : p.tier === 'B'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-slate-700/40 text-slate-400 border border-slate-600/40'
                      }`}
                    >
                      {p.tier}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {(() => {
                      const belowBuffer = p.current_stock_m2 < p.buffer_m2;
                      const dotColor = belowBuffer ? 'bg-red-500' : 'bg-emerald-500';
                      return (
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                          <span className={belowBuffer ? 'text-red-400' : 'text-slate-300'}>
                            {Math.round(p.buffer_m2).toLocaleString()}
                          </span>
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-300">{p.daily_velocity_m2.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right text-slate-300">{Math.round(p.current_stock_m2).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-slate-300">
                    {Math.round(p.running_stock_m2).toLocaleString()}
                    {p.running_stock_m2 > p.current_stock_m2 && (
                      <span className="text-[10px] text-blue-400 ml-1" title="Incluye stock en transito">+T</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={urgencyColor(p.urgency)}>{p.days_of_stock === 999 ? '-' : p.days_of_stock.toFixed(0)}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-300">{p.coverage_gap_m2 > 0 ? Math.round(p.coverage_gap_m2).toLocaleString() : '-'}</td>
                  <td className="px-3 py-2 text-right text-slate-300">
                    {p.suggested_pallets
                      ? Math.round(p.suggested_pallets * M2_PER_PALLET).toLocaleString()
                      : '-'}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-500">{Math.round(p.factory_available_m2).toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-center">
                    <div className="inline-flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={p.user_pallets}
                          onChange={(e) => updatePallets(p.product_id, parseFloat(e.target.value) || 0)}
                          className={`w-14 bg-slate-900 border rounded px-1.5 py-0.5 text-center text-sm focus:outline-none ${borderClass}`}
                        />
                        <span className="text-[10px] text-slate-600">p</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          step={10}
                          value={parseFloat(p.user_m2.toFixed(2))}
                          onChange={(e) => updateM2(p.product_id, parseFloat(e.target.value) || 0)}
                          className={`w-14 bg-slate-900 border rounded px-1.5 py-0.5 text-center text-[11px] focus:outline-none ${
                            over
                              ? 'border-amber-500/50 text-amber-400/70 focus:border-amber-400'
                              : 'border-slate-700 text-slate-500 focus:border-blue-500'
                          }`}
                        />
                        <span className="text-[10px] text-slate-600">m&sup2;</span>
                      </div>
                      {over && (
                        <span className="text-[10px] text-amber-500">max {p.factory_max_pallets}p</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-2 flex gap-4 text-[10px] text-slate-600">
        <span><span className="text-emerald-600">●</span> Dato real (SIESA/ventas)</span>
        <span><span className="text-violet-500">◆</span> Proyectado por el sistema</span>
      </div>

      {/* Next boat context */}
      {data.next_boat && (
        <p className="mt-4 text-xs text-slate-600">
          Siguiente: {data.next_boat.boat_name} ({data.next_boat.departure_date})
        </p>
      )}
    </div>
  );
}
