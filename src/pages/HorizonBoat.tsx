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
}

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
        const isOrderedBoat = res.boat.state === 'ORDERED';

        // Build pallet map from user's draft (if she saved one)
        const draftPallets: Record<string, number> = {};
        if (draft && draft.status === 'drafting' && draft.items) {
          for (const item of draft.items) {
            draftPallets[item.product_id] = item.selected_pallets;
          }
        }
        const hasDraft = Object.keys(draftPallets).length > 0;

        const rows: ProductRow[] = (res.boat.products || []).map((p) => {
          const pallets = isOrderedBoat
            ? p.allocated_pallets
            : hasDraft
              ? (draftPallets[p.product_id] ?? 0)
              : p.can_ship_pallets;
          return { ...p, user_pallets: pallets, user_m2: pallets * M2_PER_PALLET };
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
      .catch((err) => setError(err?.message || 'Failed to load boat'))
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
    const m2 = Math.max(0, value);
    const pallets = Math.floor(m2 / M2_PER_PALLET);
    setProducts((prev) =>
      prev.map((p) => p.product_id === productId
        ? { ...p, user_pallets: pallets, user_m2: m2 }
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
      setError('Failed to save');
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
        }));
      await draftsApi.save({
        boat_id: boatId,
        factory_id: factoryId,
        items,
      });
      setSaved(true);
    } catch {
      setError('Failed to save draft');
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
    } catch {
      setError('Failed to export');
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
  const isOrdered = boat.state === 'ORDERED';
  const dep = new Date(boat.departure_date + 'T00:00:00');
  const fmtDate = dep.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <button onClick={() => navigate('/horizon')} className="text-xs text-slate-500 hover:text-slate-300 mb-1">&larr; {t('common.back', 'Volver')}</button>
          <h1 className="text-xl font-bold text-slate-100">
            {boat.boat_name}
            {isOrdered && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-normal">DESPACHADO</span>}
          </h1>
          <p className="text-sm text-slate-400">{fmtDate} &middot; {boat.days_until_departure} dias &middot; {boat.carrier}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-100">{totals.pallets}</p>
          <p className="text-xs text-slate-400">{totals.containers} cont &middot; {Math.round(totals.m2).toLocaleString()} m2</p>
        </div>
      </div>

      {/* Skip recommendation */}
      {!isOrdered && boat.skip_recommended && !skipDismissed && (
        <div className="mb-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-400 text-sm font-medium">No llena un envio minimo</p>
              <p className="text-red-500/70 text-xs mt-0.5">{boat.skip_reason}</p>
            </div>
            <div className="flex gap-2 ml-4 shrink-0">
              <button
                onClick={skipBoat}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded"
              >
                Ignorar barco
              </button>
              <button
                onClick={() => setSkipDismissed(true)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded"
              >
                Continuar de todos modos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Over-allocation warning */}
      {!isOrdered && overAllocated.length > 0 && (
        <div className="mb-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-amber-400 text-sm font-medium">
            {overAllocated.length} producto{overAllocated.length > 1 ? 's' : ''} excede{overAllocated.length === 1 ? '' : 'n'} stock de fabrica
          </p>
          <p className="text-amber-500/70 text-xs mt-1">
            {overAllocated.map((p) => p.sku).join(', ')} — excede disponibilidad SIESA
          </p>
        </div>
      )}

      {/* Action bar — hidden for ordered boats */}
      {!isOrdered && (
        <div className="flex gap-3 mb-4">
          <button
            onClick={saveDraft}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded disabled:opacity-50"
          >
            {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar borrador'}
          </button>
          <button
            onClick={resetToSuggestions}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded"
          >
            Resetear sugerencias
          </button>
          <button
            onClick={exportExcel}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded"
          >
            Exportar Excel
          </button>
        </div>
      )}

      {/* Product table */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-xs text-slate-500 uppercase">
              <th className="px-4 py-2">SKU</th>
              <th className="px-3 py-2 text-right">Vel/dia <span className="text-emerald-600" title="Real: promedio 90 dias de ventas">●</span></th>
              <th className="px-3 py-2 text-right">Stock <span className="text-emerald-600" title="Real: ultimo inventario SIESA">●</span></th>
              <th className="px-3 py-2 text-right">Dias <span className="text-emerald-600" title="Real: stock actual / velocidad">●</span></th>
              <th className="px-3 py-2 text-right">Brecha <span className="text-violet-500" title="Proyectado: stock simulado vs colchon de seguridad">◆</span></th>
              <th className="px-3 py-2 text-right">Sugerido <span className="text-violet-500" title="Proyectado: pallets para cerrar brecha">◆</span></th>
              <th className="px-3 py-2 text-right">Fabrica <span className="text-violet-500" title="Proyectado: SIESA menos barcos anteriores">◆</span></th>
              <th className="px-3 py-2 text-center">{isOrdered ? 'Enviado' : 'Pallets / m\u00B2'}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.product_id} className={`border-b border-slate-700/50 ${urgencyBg(p.urgency)}`}>
                <td className="px-4 py-2">
                  <span className={`font-medium ${urgencyColor(p.urgency)}`}>{p.sku}</span>
                </td>
                <td className="px-3 py-2 text-right text-slate-300">{p.daily_velocity_m2.toFixed(1)}</td>
                <td className="px-3 py-2 text-right text-slate-300">{Math.round(p.current_stock_m2).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">
                  <span className={urgencyColor(p.urgency)}>{p.days_of_stock === 999 ? '-' : p.days_of_stock.toFixed(0)}</span>
                </td>
                <td className="px-3 py-2 text-right text-slate-300">{p.coverage_gap_m2 > 0 ? Math.round(p.coverage_gap_m2).toLocaleString() : '-'}</td>
                <td className="px-3 py-2 text-right text-slate-300">{p.suggested_pallets || '-'}</td>
                <td className="px-3 py-2 text-right text-slate-500">{Math.round(p.factory_available_m2).toLocaleString()}</td>
                <td className="px-3 py-1.5 text-center">
                  {isOrdered ? (
                    <span className="text-slate-200 text-sm font-medium">{p.user_pallets}p</span>
                  ) : (() => {
                    const over = p.user_pallets > p.factory_max_pallets;
                    const borderClass = over
                      ? 'border-amber-500 text-amber-300 focus:border-amber-400'
                      : 'border-slate-600 text-slate-200 focus:border-blue-500';
                    return (
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            value={p.user_pallets}
                            onChange={(e) => updatePallets(p.product_id, parseInt(e.target.value) || 0)}
                            className={`w-14 bg-slate-900 border rounded px-1.5 py-0.5 text-center text-sm focus:outline-none ${borderClass}`}
                          />
                          <span className="text-[10px] text-slate-600">p</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            step={10}
                            value={Math.round(p.user_m2)}
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
                    );
                  })()}
                </td>
              </tr>
            ))}
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
          Siguiente barco: {data.next_boat.boat_name} ({data.next_boat.departure_date})
        </p>
      )}
    </div>
  );
}
