import { useEffect, useMemo, useState } from 'react';
import {
  orderPlanApi,
  type PlanResponse,
  type AdjustedBoat,
  type AdjustedLine,
  type AvailableBoat,
} from '../requests/orderPlan';

const M2_PER_PALLET = 134.4;
const PALLETS_PER_CONTAINER = 13;

interface AdjustedLineState extends AdjustedLine {
  is_urgent: boolean;
  note_es: string;
  velocity_m2_wk: number;
  siesa_m2: number;
  coverage_weeks: number;
  original_pallets: number;
}

interface AdjustedBoatState extends Omit<AdjustedBoat, 'lines'> {
  max_pallets: number;
  lines: AdjustedLineState[];
}

const fmt = (n: number) => n.toLocaleString('es', { maximumFractionDigits: 0 });
const fmtDate = (iso: string) => {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('es', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return iso;
  }
};

export function OrderPlan() {
  // Setup state
  const [availableBoats, setAvailableBoats] = useState<AvailableBoat[]>([]);
  const [selectedBoatIds, setSelectedBoatIds] = useState<Set<string>>(new Set());
  const [maxContainers, setMaxContainers] = useState(10);
  const [bufferPct, setBufferPct] = useState(15);
  const [includeProduction, setIncludeProduction] = useState(true);

  // Result state
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [adjustedBoats, setAdjustedBoats] = useState<AdjustedBoatState[]>([]);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    orderPlanApi
      .listBoats()
      .then(setAvailableBoats)
      .catch(() => setError('No se pudieron cargar los buques'));
  }, []);

  const toggleBoat = (id: string) => {
    setSelectedBoatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generate = async () => {
    if (selectedBoatIds.size === 0) {
      setError('Selecciona al menos un buque');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await orderPlanApi.generate(
        Array.from(selectedBoatIds),
        maxContainers,
        bufferPct,
        includeProduction,
      );
      setPlan(res);
      setAdjustedBoats(
        res.boats.map((b) => ({
          boat_id: b.boat_id,
          vessel_name: b.vessel_name,
          departure_date: b.departure_date,
          arrival_date: b.arrival_date,
          max_containers: b.max_containers,
          max_pallets: b.max_pallets,
          lines: b.lines.map((l) => ({
            product_id: l.product_id,
            sku: l.sku,
            pallets: l.pallets,
            is_urgent: l.is_urgent,
            note_es: l.note_es,
            velocity_m2_wk: l.velocity_m2_wk,
            siesa_m2: l.siesa_m2,
            coverage_weeks: l.coverage_weeks,
            original_pallets: l.pallets,
          })),
        })),
      );
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setError(msg || 'Error al generar el plan');
    } finally {
      setGenerating(false);
    }
  };

  const updatePallets = (boatId: string, productId: string, value: number) => {
    setAdjustedBoats((prev) =>
      prev.map((b) =>
        b.boat_id !== boatId
          ? b
          : {
              ...b,
              lines: b.lines.map((l) =>
                l.product_id === productId
                  ? { ...l, pallets: Math.max(0, value) }
                  : l,
              ),
            },
      ),
    );
  };

  const exportPdf = async () => {
    if (!plan) return;
    setExporting(true);
    setError(null);
    try {
      const blob = await orderPlanApi.exportPdf(
        adjustedBoats.map((b) => ({
          boat_id: b.boat_id,
          vessel_name: b.vessel_name,
          departure_date: b.departure_date,
          arrival_date: b.arrival_date,
          max_containers: b.max_containers,
          lines: b.lines
            .filter((l) => l.pallets > 0)
            .map((l) => ({
              product_id: l.product_id,
              sku: l.sku,
              pallets: l.pallets,
            })),
        })),
        plan.narrative,
        plan,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Plan_Pedidos_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Error al exportar PDF');
    } finally {
      setExporting(false);
    }
  };

  // Edit deltas (for the live panel)
  const deltas = useMemo(() => {
    const out: string[] = [];
    for (const b of adjustedBoats) {
      for (const l of b.lines) {
        if (l.pallets !== l.original_pallets) {
          if (l.original_pallets === 0) {
            out.push(`${l.sku} añadido a ${b.vessel_name}: ${l.pallets}p`);
          } else {
            const sign = l.pallets > l.original_pallets ? '+' : '';
            out.push(
              `${l.sku} en ${b.vessel_name}: ${l.original_pallets} → ${l.pallets}p (${sign}${l.pallets - l.original_pallets})`,
            );
          }
        }
      }
    }
    return out;
  }, [adjustedBoats]);

  const totalPallets = adjustedBoats.reduce(
    (s, b) => s + b.lines.reduce((t, l) => t + l.pallets, 0),
    0,
  );
  const totalContainers =
    Math.round((totalPallets / PALLETS_PER_CONTAINER) * 10) / 10;
  const totalM2 = totalPallets * M2_PER_PALLET;

  return (
    <div className="min-h-screen px-6 py-8" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1
            className="text-lg font-medium tracking-[0.15em] uppercase"
            style={{ color: 'var(--color-text-primary)' }}
          >
            plan de pedidos
          </h1>
          <p
            className="text-xs mt-1 tracking-widest uppercase"
            style={{ color: 'var(--color-text-muted)' }}
          >
            velocidad · cascada · exportable
          </p>
        </div>

        {/* Setup */}
        <div
          className="p-5 mb-6"
          style={{
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-subtle)',
            backgroundColor: 'var(--color-bg-surface)',
          }}
        >
          <h2
            className="text-xs tracking-wide uppercase font-medium mb-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Configuración
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-xs mb-2 tracking-wide uppercase" style={{ color: 'var(--color-text-muted)' }}>
                Contenedores máx. por buque
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxContainers}
                onChange={(e) => setMaxContainers(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full min-h-[40px] px-3 py-2 text-sm focus:outline-none"
                style={{
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                13 pallets por contenedor = {maxContainers * 13} pallets/buque
              </p>
            </div>

            <div>
              <label className="block text-xs mb-2 tracking-wide uppercase" style={{ color: 'var(--color-text-muted)' }}>
                Buffer de bodega (%)
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={bufferPct}
                onChange={(e) => setBufferPct(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full min-h-[40px] px-3 py-2 text-sm focus:outline-none"
                style={{
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Espacio libre reservado en bodega
              </p>
            </div>

            <div className="flex items-end">
              <label
                className="flex items-center gap-2 cursor-pointer text-sm"
                style={{ color: 'var(--color-text-primary)' }}
              >
                <input
                  type="checkbox"
                  checked={includeProduction}
                  onChange={(e) => setIncludeProduction(e.target.checked)}
                  className="w-4 h-4"
                />
                Incluir producción en camino
              </label>
            </div>
          </div>

          {/* Boat picker */}
          <div>
            <label className="block text-xs mb-2 tracking-wide uppercase" style={{ color: 'var(--color-text-muted)' }}>
              Buques a planificar
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {availableBoats.map((b) => {
                const checked = selectedBoatIds.has(b.boat_id);
                const disabled = b.status !== 'available';
                const borderColor = disabled
                  ? 'var(--color-border-subtle)'
                  : checked
                  ? 'var(--color-accent)'
                  : 'var(--color-border)';
                const bg = disabled
                  ? 'var(--color-bg-base)'
                  : checked
                  ? 'var(--color-accent-glow)'
                  : 'var(--color-bg-elevated)';
                return (
                  <label
                    key={b.boat_id}
                    className={`flex items-center gap-3 p-2 transition-colors ${
                      disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:brightness-125'
                    }`}
                    style={{
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: bg,
                    }}
                    title={b.reason || undefined}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => !disabled && toggleBoat(b.boat_id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div
                        className="text-sm flex items-center gap-2"
                        style={{ color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}
                      >
                        <span translate="no">{b.vessel_name}</span>
                        {b.status === 'committed' && (
                          <span
                            className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--color-accent-glow)', color: 'var(--color-accent-hover)' }}
                          >
                            ordered
                          </span>
                        )}
                        {b.status === 'before_committed' && (
                          <span
                            className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'rgba(120,53,15,0.2)', color: '#fbbf24' }}
                          >
                            previous
                          </span>
                        )}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        Sale {fmtDate(b.departure_date)} · Llega {fmtDate(b.arrival_date)}
                        {b.reason && <span className="ml-2">· {b.reason}</span>}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <button
              type="button"
              onClick={generate}
              disabled={generating || selectedBoatIds.size === 0}
              className="min-h-[40px] text-white text-sm font-medium px-5 py-2 cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-accent)',
              }}
            >
              {generating ? 'Generando...' : 'Generar propuesta'}
            </button>
            {error && (
              <span className="text-sm" style={{ color: 'var(--color-error)' }}>
                {error}
              </span>
            )}
          </div>
        </div>

        {/* Plan output */}
        {plan && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'SIESA Total', value: `${plan.total_siesa_pallets} pallets` },
                { label: 'Plan Total', value: `${totalPallets} pallets` },
                { label: 'Contenedores', value: `${totalContainers}` },
                { label: 'Volumen', value: `${fmt(totalM2)} m²` },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="p-4"
                  style={{
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#1e293b',
                  }}
                >
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
                    {kpi.label}
                  </p>
                  <p className="text-xl font-bold text-white mt-1">{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Narrative */}
            <div
              className="p-5 mb-6"
              style={{
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-subtle)',
                backgroundColor: 'var(--color-bg-surface)',
              }}
            >
              <h2 className="text-xs tracking-wide uppercase font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                Resumen
              </h2>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)', lineHeight: '1.6' }}>
                {plan.narrative}
              </p>
            </div>

            {/* Per-boat cards */}
            {adjustedBoats.map((boat) => {
              const boatPallets = boat.lines.reduce((s, l) => s + l.pallets, 0);
              const boatContainers = Math.round((boatPallets / PALLETS_PER_CONTAINER) * 10) / 10;
              const overCapacity = boatPallets > boat.max_pallets;
              return (
                <div
                  key={boat.boat_id}
                  className="mb-5 overflow-hidden"
                  style={{
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-subtle)',
                    backgroundColor: 'var(--color-bg-surface)',
                  }}
                >
                  <div
                    className="flex items-center justify-between px-5 py-3"
                    style={{
                      backgroundColor: 'var(--color-bg-elevated)',
                      borderBottom: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }} translate="no">
                        {boat.vessel_name}
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Sale {fmtDate(boat.departure_date)} · Llega {fmtDate(boat.arrival_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${overCapacity ? 'text-amber-400' : ''}`} style={{ color: overCapacity ? undefined : 'var(--color-text-primary)' }}>
                        {boatPallets} / {boat.max_pallets} pallets
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {boatContainers} / {boat.max_containers} contenedores
                      </p>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                        <th className="text-left px-4 py-2">SKU</th>
                        <th className="text-right px-3 py-2">Pallets</th>
                        <th className="text-right px-3 py-2">m²</th>
                        <th className="text-left px-3 py-2">Razón</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boat.lines.map((l) => {
                        const edited = l.pallets !== l.original_pallets;
                        return (
                          <tr
                            key={l.product_id}
                            className="border-t"
                            style={{ borderColor: 'var(--color-border-subtle)' }}
                          >
                            <td className="px-4 py-2">
                              <span style={{ color: l.is_urgent ? 'var(--color-error)' : 'var(--color-text-primary)' }}>
                                {l.sku}
                              </span>
                              {edited && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-accent-glow)', color: 'var(--color-accent-hover)' }}>
                                  editado
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min={0}
                                value={l.pallets}
                                onChange={(e) => updatePallets(boat.boat_id, l.product_id, parseInt(e.target.value) || 0)}
                                className="w-20 text-right px-2 py-1 text-sm focus:outline-none"
                                style={{
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: 'var(--color-bg-elevated)',
                                  border: `1px solid ${edited ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                  color: 'var(--color-text-primary)',
                                }}
                              />
                              {l.original_pallets !== l.pallets && (
                                <span className="ml-2 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                  (orig: {l.original_pallets})
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right" style={{ color: 'var(--color-text-secondary)' }}>
                              {fmt(l.pallets * M2_PER_PALLET)}
                            </td>
                            <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {l.note_es}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}

            {/* Velocity ranking */}
            <div
              className="mb-5 overflow-hidden"
              style={{
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-subtle)',
                backgroundColor: 'var(--color-bg-surface)',
              }}
            >
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <h2 className="text-xs tracking-wide uppercase font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Ranking de velocidad - Stock SIESA
                </h2>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
                    <tr className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                      <th className="text-left px-4 py-2">#</th>
                      <th className="text-left px-3 py-2">SKU</th>
                      <th className="text-right px-3 py-2">m²/sem</th>
                      <th className="text-right px-3 py-2">Pallets SIESA</th>
                      <th className="text-right px-3 py-2">Cobertura (sem)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.velocity_ranking.map((r, i) => (
                      <tr key={r.sku} className="border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
                        <td className="px-4 py-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                        <td className="px-3 py-1.5" style={{ color: r.is_urgent ? 'var(--color-error)' : 'var(--color-text-primary)' }}>
                          {r.sku}
                        </td>
                        <td className="px-3 py-1.5 text-right" style={{ color: 'var(--color-text-secondary)' }}>
                          {fmt(r.velocity_m2_wk)}
                        </td>
                        <td className="px-3 py-1.5 text-right" style={{ color: 'var(--color-text-secondary)' }}>
                          {r.siesa_pallets.toFixed(1)}
                        </td>
                        <td className="px-3 py-1.5 text-right" style={{ color: r.is_urgent ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
                          {r.coverage_weeks.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live edits panel */}
            {deltas.length > 0 && (
              <div
                className="mb-5 p-5"
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-accent)',
                  backgroundColor: 'var(--color-accent-glow)',
                }}
              >
                <h2 className="text-xs tracking-wide uppercase font-medium mb-2" style={{ color: 'var(--color-accent-hover)' }}>
                  Ajustes manuales ({deltas.length})
                </h2>
                <ul className="text-sm space-y-1" style={{ color: 'var(--color-text-primary)' }}>
                  {deltas.map((d, i) => (
                    <li key={i}>· {d}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Capacity check */}
            <div
              className="mb-5 p-5"
              style={{
                borderRadius: 'var(--radius-md)',
                border: plan.warehouse_capacity.is_safe
                  ? '1px solid var(--color-border-subtle)'
                  : '1px solid var(--color-error)',
                backgroundColor: 'var(--color-bg-surface)',
              }}
            >
              <h2 className="text-xs tracking-wide uppercase font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                Verificación de capacidad de bodega
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Actual</p>
                  <p style={{ color: 'var(--color-text-primary)' }}>{plan.warehouse_capacity.current_pallets} pallets</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Entrando</p>
                  <p style={{ color: 'var(--color-text-primary)' }}>+{plan.warehouse_capacity.incoming_pallets}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Pico estimado</p>
                  <p style={{ color: 'var(--color-text-primary)' }}>{plan.warehouse_capacity.peak_pallets} / {plan.warehouse_capacity.max_pallets}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Utilización</p>
                  <p style={{ color: plan.warehouse_capacity.is_safe ? '#22c55e' : 'var(--color-error)' }}>
                    {plan.warehouse_capacity.utilization_pct}%
                  </p>
                </div>
              </div>
            </div>

            {/* Export */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={exportPdf}
                disabled={exporting}
                className="min-h-[44px] text-white text-sm font-medium px-6 py-3 cursor-pointer transition-all duration-200 disabled:opacity-50"
                style={{
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-accent)',
                }}
              >
                {exporting ? 'Exportando...' : 'Exportar PDF'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
