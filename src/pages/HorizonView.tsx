import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { horizonApi, type HorizonResponse, type BoatProjection, type ProductionPipelineItem } from '../requests/horizon';
import { factoriesApi } from '../requests/factories';

function UrgencyDots({ breakdown }: { breakdown: BoatProjection['urgency_breakdown'] }) {
  return (
    <div className="flex gap-1.5 items-center">
      {breakdown.critical > 0 && (
        <span className="flex items-center gap-0.5 text-xs text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {breakdown.critical}
        </span>
      )}
      {breakdown.urgent > 0 && (
        <span className="flex items-center gap-0.5 text-xs text-orange-400">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          {breakdown.urgent}
        </span>
      )}
      {breakdown.soon > 0 && (
        <span className="flex items-center gap-0.5 text-xs text-yellow-400">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          {breakdown.soon}
        </span>
      )}
      {breakdown.ok > 0 && (
        <span className="flex items-center gap-0.5 text-xs text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {breakdown.ok}
        </span>
      )}
    </div>
  );
}

function BoatCard({ boat, onClick, onIgnore }: { boat: BoatProjection; onClick: () => void; onIgnore: (boatId: string) => void }) {
  const dep = new Date(boat.departure_date + 'T00:00:00');
  const fmtDate = dep.toLocaleDateString('es', { day: 'numeric', month: 'short' });

  const stateColors: Record<string, string> = {
    ORDERED: 'border-blue-500 bg-blue-500/10',
    PLANNING: 'border-yellow-500 bg-yellow-500/10',
    FUTURE: 'border-slate-600 bg-slate-800',
  };

  const borderClass = stateColors[boat.state] || stateColors.FUTURE;

  return (
    <div className={`relative border rounded-lg p-4 transition ${borderClass} ${boat.skip_recommended ? 'opacity-50' : ''}`}>
      <button
        onClick={onClick}
        className="w-full text-left hover:brightness-110 transition"
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">{boat.boat_name}</h3>
            <p className="text-xs text-slate-400">{fmtDate} &middot; {boat.days_until_departure}d</p>
          </div>
          <div className="flex gap-1.5 items-center">
            {boat.draft_status && boat.draft_status !== 'ordered' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                BORRADOR
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
              {boat.state === 'ORDERED' ? 'CONFIRMADO' : boat.state}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div>
            <p className="text-lg font-bold text-slate-100">{boat.total_pallets} <span className="text-xs font-normal text-slate-400">pallets</span></p>
            <p className="text-xs text-slate-500">{boat.total_containers} cont &middot; {boat.product_count} prod</p>
          </div>
          <UrgencyDots breakdown={boat.urgency_breakdown} />
        </div>

        {boat.skip_recommended && (
          <p className="mt-2 text-xs text-red-400 italic">{boat.skip_reason}</p>
        )}
      </button>
      {boat.state !== 'ORDERED' && (
        <button
          onClick={(e) => { e.stopPropagation(); onIgnore(boat.boat_id); }}
          className="absolute top-2 right-2 text-xs text-slate-600 hover:text-red-400 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-700/50"
          title="Ignorar barco"
        >
          &times;
        </button>
      )}
    </div>
  );
}

export function HorizonView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HorizonResponse | null>(null);
  const [factoryId, setFactoryId] = useState<string | null>(null);
  const [factories, setFactories] = useState<Array<{ id: string; name: string }>>([]);

  // Load factories
  useEffect(() => {
    factoriesApi.getActive().then((list) => {
      setFactories(list);
      if (list.length > 0) {
        setFactoryId(list[0].id);
      }
    }).catch(() => setError('Error al cargar fábricas'));
  }, []);

  // Load horizon when factory changes
  const fetchHorizon = () => {
    if (!factoryId) return;
    setLoading(true);
    setError(null);
    horizonApi.getHorizon(factoryId)
      .then(setData)
      .catch((err) => setError(err?.message || 'Error al cargar horizonte'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHorizon(); }, [factoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openBoat = (boatId: string) => {
    navigate(`/horizon/boat?factory=${factoryId}&boat=${boatId}`);
  };

  const ignoreBoat = async (boatId: string) => {
    try {
      await horizonApi.ignoreBoat(boatId);
      fetchHorizon();
    } catch {
      setError('Error al ignorar barco');
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
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const signal = data.factory_order_signal;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">{t('common.planning', 'Horizonte')}</h1>
          <p className="text-sm text-slate-400">{data.factory_name}</p>
        </div>
        {factories.length > 1 && (
          <select
            value={factoryId || ''}
            onChange={(e) => setFactoryId(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-200"
          >
            {factories.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Factory order signal */}
      {signal && signal.needs_scheduling && (
        <div className="mb-4 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
          <p className="text-sm text-orange-400 font-medium">
            {signal.product_count} productos necesitan programacion
          </p>
          {signal.piggyback_count > 0 && (
            <p className="text-xs text-orange-400/70">
              {signal.piggyback_count} agregar a corrida &middot; {signal.new_count} orden nueva
            </p>
          )}
        </div>
      )}

      {/* Boat grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.projections.map((boat) => (
          <BoatCard
            key={boat.boat_id}
            boat={boat}
            onClick={() => openBoat(boat.boat_id)}
            onIgnore={ignoreBoat}
          />
        ))}
      </div>

      {/* Production section */}
      {(data.production_pipeline.length > 0 || data.production_requests.length > 0) && (
        <div className="mt-6 space-y-4">
          {/* In production — one line per product */}
          {data.production_pipeline.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-blue-400 mb-2">
                En produccion ({data.production_pipeline.length})
              </h2>
              <div className="space-y-1.5">
                {data.production_pipeline.map((p: ProductionPipelineItem) => (
                  <div key={p.product_id} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-200">{p.sku}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        p.status === 'in_progress'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {p.status === 'in_progress' ? 'EN CURSO' : 'PROGRAMADO'}
                      </span>
                      {p.covers_gap && (
                        <span className="text-[10px] text-green-500/70">cubre brecha</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {p.status === 'in_progress' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${Math.min(100, p.progress_pct)}%` }}
                            />
                          </div>
                          <span className="text-green-400 w-8 text-right">{p.progress_pct}%</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">{p.earliest_date}</span>
                      )}
                      <span className="text-slate-400 w-24 text-right">
                        {Math.round(p.total_m2).toLocaleString()} m2
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Need to schedule */}
          {data.production_requests.length > 0 && (() => {
            const piggyback = data.production_requests.filter((r) => r.is_piggyback);
            const newOrders = data.production_requests.filter((r) => !r.is_piggyback);
            return (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-orange-400 mb-2">
                  Programar produccion ({data.production_requests.length})
                </h2>

                {piggyback.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-yellow-400/70 uppercase tracking-wide mb-1">Agregar a corrida existente</p>
                    <div className="space-y-1">
                      {piggyback.map((r) => {
                        const so = r.stockout_date ? new Date(r.stockout_date + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' }) : null;
                        return (
                          <div key={r.product_id} className="flex justify-between text-xs">
                            <span className="text-yellow-400">{r.sku} {so && <span className="text-slate-600">· se agota {so}</span>}</span>
                            <span className="text-slate-500">+{Math.round(r.additional_m2).toLocaleString()} m2</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {newOrders.length > 0 && (
                  <div>
                    {piggyback.length > 0 && (
                      <p className="text-[10px] text-orange-400/70 uppercase tracking-wide mb-1">Orden nueva</p>
                    )}
                    <div className="space-y-1">
                      {newOrders.map((r) => {
                        const so = r.stockout_date ? new Date(r.stockout_date + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' }) : null;
                        return (
                          <div key={r.product_id} className="flex justify-between text-xs">
                            <span className={r.urgency === 'critical' ? 'text-red-400' : 'text-orange-400'}>{r.sku} {so && <span className="text-slate-600">· se agota {so}</span>}</span>
                            <span className="text-slate-500">{Math.round(r.additional_m2).toLocaleString()} m2</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Data freshness footer */}
      <div className="mt-6 text-xs text-slate-600">
        {t('common.generatedAt', 'Generado')}: {data.generated_at}
        {data.data_as_of && typeof data.data_as_of === 'object' && (
          <span> &middot; Bodega: {String(data.data_as_of.warehouse_snapshot_date || '?')} &middot; Fabrica: {String(data.data_as_of.factory_snapshot_date || '?')}</span>
        )}
      </div>
    </div>
  );
}
