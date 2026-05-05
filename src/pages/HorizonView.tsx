import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { horizonApi, type HorizonResponse, type BoatProjection, type ProductionPipelineItem } from '../requests/horizon';
import { factoriesApi } from '../requests/factories';
import { ReconciliationBadge } from '../components/horizon/ReconciliationBadge';

function UrgencyDots({ breakdown }: { breakdown: BoatProjection['urgency_breakdown'] }) {
  const dots = [
    { key: 'critical', count: breakdown.critical, color: '#f87171' },
    { key: 'urgent',   count: breakdown.urgent,   color: '#fb923c' },
    { key: 'soon',     count: breakdown.soon,     color: '#facc15' },
    { key: 'ok',       count: breakdown.ok,       color: '#4ade80' },
  ];
  return (
    <div className="flex gap-2 items-center">
      {dots.map((d) => d.count > 0 && (
        <span key={d.key} className="flex items-center gap-1 text-[11px]" style={{ color: d.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
          {d.count}
        </span>
      ))}
    </div>
  );
}

function StatePill({ label, tone }: { label: string; tone: 'accent' | 'planning' | 'neutral' }) {
  const styles = {
    accent: { bg: 'var(--color-accent-glow)', fg: 'var(--color-accent-hover)' },
    planning: { bg: 'rgba(120, 53, 15, 0.2)', fg: '#fbbf24' },
    neutral: { bg: 'var(--color-bg-elevated)', fg: 'var(--color-text-secondary)' },
  }[tone];
  return (
    <span
      className="text-[9px] uppercase tracking-widest px-1.5 py-0.5"
      style={{ backgroundColor: styles.bg, color: styles.fg, borderRadius: 'var(--radius-sm)' }}
    >
      {label}
    </span>
  );
}

function BoatCard({ boat, onClick, onIgnore }: { boat: BoatProjection; onClick: () => void; onIgnore: (boatId: string) => void }) {
  const dep = new Date(boat.departure_date + 'T00:00:00');
  const fmtDate = dep.toLocaleDateString('es', { day: 'numeric', month: 'short' });

  // State-driven ambient treatment — quiet by default, accent only when meaningful.
  const stateStyle: Record<string, { border: string; bg: string }> = {
    ORDERED:  { border: 'var(--color-accent)',         bg: 'var(--color-bg-surface)' },
    PLANNING: { border: 'rgba(251, 191, 36, 0.4)',     bg: 'var(--color-bg-surface)' },
    FUTURE:   { border: 'var(--color-border)',         bg: 'var(--color-bg-surface)' },
  };
  const style = stateStyle[boat.state] || stateStyle.FUTURE;

  return (
    <div
      className={`relative p-4 transition ${boat.skip_recommended ? 'opacity-50' : ''}`}
      style={{
        border: `1px solid ${style.border}`,
        backgroundColor: style.bg,
        borderRadius: 'var(--radius-md)',
      }}
    >
      <button
        onClick={onClick}
        className="w-full text-left transition hover:brightness-110"
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-sm font-medium tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
              {boat.boat_name}
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {fmtDate} &middot; {boat.days_until_departure}d
            </p>
          </div>
          <div className="flex gap-1.5 items-center">
            {boat.draft_status && boat.draft_status !== 'ordered' && (
              <StatePill label="draft" tone="planning" />
            )}
            <StatePill
              label={boat.state.toLowerCase()}
              tone={boat.state === 'ORDERED' ? 'accent' : boat.state === 'PLANNING' ? 'planning' : 'neutral'}
            />
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div>
            <p className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {boat.total_pallets}
              <span className="text-[10px] uppercase tracking-widest ml-1.5" style={{ color: 'var(--color-text-muted)' }}>
                pallets
              </span>
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {boat.total_containers} cont &middot; {boat.product_count} prod
            </p>
          </div>
          <UrgencyDots breakdown={boat.urgency_breakdown} />
        </div>

        {boat.skip_recommended && (
          <p className="mt-2 text-[11px] italic" style={{ color: 'var(--color-error)' }}>
            {boat.skip_reason}
          </p>
        )}
      </button>
      {boat.state !== 'ORDERED' && (
        <button
          onClick={(e) => { e.stopPropagation(); onIgnore(boat.boat_id); }}
          className="absolute top-2 right-2 text-xs px-1.5 py-0.5 transition-colors"
          style={{ color: 'var(--color-text-muted)', borderRadius: 'var(--radius-sm)' }}
          title="Ignorar barco"
        >
          &times;
        </button>
      )}
    </div>
  );
}

function SectionPanel({
  title,
  count,
  children,
  tone = 'neutral',
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  tone?: 'neutral' | 'info' | 'warning';
}) {
  const accent = {
    neutral: 'var(--color-text-secondary)',
    info: '#60a5fa',
    warning: '#fb923c',
  }[tone];
  return (
    <div
      className="p-5"
      style={{
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-subtle)',
        backgroundColor: 'var(--color-bg-surface)',
      }}
    >
      <h2 className="text-xs tracking-widest uppercase font-medium mb-3 flex items-baseline gap-2" style={{ color: accent }}>
        {title}
        {count !== undefined && (
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            ({count})
          </span>
        )}
      </h2>
      {children}
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div
          className="p-4 text-sm"
          style={{
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--color-error)',
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const signal = data.factory_order_signal;

  return (
    <div className="min-h-screen px-6 py-8" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <div className="max-w-6xl mx-auto">
      {/* Header — editorial title + tagline */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1
            className="text-lg font-medium tracking-[0.15em] uppercase"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('common.planning', 'horizonte')}
          </h1>
          <p
            className="text-xs mt-1 tracking-widest uppercase"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {data.factory_name} &middot; barcos · producción · brecha
          </p>
        </div>
        {factories.length > 1 && (
          <select
            value={factoryId || ''}
            onChange={(e) => setFactoryId(e.target.value)}
            className="text-sm px-3 py-2 focus:outline-none"
            style={{
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            {factories.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Reconciliation: gaps between our drafts and factory's Cant. comprometida */}
      <div className="mb-4">
        <ReconciliationBadge factoryId={factoryId} />
      </div>

      {/* Factory order signal — quiet alert */}
      {signal && signal.needs_scheduling && (
        <div
          className="mb-5 p-4"
          style={{
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(251, 146, 60, 0.25)',
            backgroundColor: 'rgba(251, 146, 60, 0.08)',
          }}
        >
          <p className="text-[11px] uppercase tracking-widest font-medium" style={{ color: '#fb923c' }}>
            {signal.product_count} productos requieren programación
          </p>
          {signal.piggyback_count > 0 && (
            <p className="text-[11px] mt-1" style={{ color: 'rgba(251, 146, 60, 0.7)' }}>
              {signal.piggyback_count} agregar a corrida &middot; {signal.new_count} orden nueva
            </p>
          )}
        </div>
      )}

      {/* Boat grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
        <div className="space-y-4">
          {/* In production — one line per product */}
          {data.production_pipeline.length > 0 && (
            <SectionPanel title="En producción" count={data.production_pipeline.length} tone="info">
              <div className="space-y-2">
                {data.production_pipeline.map((p: ProductionPipelineItem) => (
                  <div key={p.product_id} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'var(--color-text-primary)' }}>{p.sku}</span>
                      <span
                        className="px-1.5 py-0.5 text-[9px] uppercase tracking-widest"
                        style={{
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: p.status === 'in_progress' ? 'rgba(74, 222, 128, 0.15)' : 'var(--color-bg-elevated)',
                          color: p.status === 'in_progress' ? '#4ade80' : 'var(--color-text-secondary)',
                        }}
                      >
                        {p.status === 'in_progress' ? 'en curso' : 'programado'}
                      </span>
                      {p.covers_gap && (
                        <span className="text-[10px]" style={{ color: 'rgba(74, 222, 128, 0.7)' }}>
                          cubre brecha
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {p.status === 'in_progress' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 overflow-hidden" style={{ backgroundColor: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                            <div
                              className="h-full"
                              style={{ width: `${Math.min(100, p.progress_pct)}%`, backgroundColor: '#4ade80' }}
                            />
                          </div>
                          <span className="w-8 text-right" style={{ color: '#4ade80' }}>{p.progress_pct}%</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>{p.earliest_date}</span>
                      )}
                      <span className="w-24 text-right" style={{ color: 'var(--color-text-secondary)' }}>
                        {Math.round(p.total_m2).toLocaleString()} m²
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionPanel>
          )}

          {/* Need to schedule */}
          {data.production_requests.length > 0 && (() => {
            const piggyback = data.production_requests.filter((r) => r.is_piggyback);
            const newOrders = data.production_requests.filter((r) => !r.is_piggyback);
            return (
              <SectionPanel title="Programar producción" count={data.production_requests.length} tone="warning">
                {piggyback.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'rgba(250, 204, 21, 0.7)' }}>
                      Agregar a corrida existente
                    </p>
                    <div className="space-y-1.5">
                      {piggyback.map((r) => {
                        const so = r.stockout_date ? new Date(r.stockout_date + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' }) : null;
                        return (
                          <div key={r.product_id} className="flex justify-between text-xs">
                            <span style={{ color: '#facc15' }}>
                              {r.sku}
                              {so && <span className="ml-1" style={{ color: 'var(--color-text-muted)' }}>· se agota {so}</span>}
                            </span>
                            <span style={{ color: 'var(--color-text-muted)' }}>
                              +{Math.round(r.additional_m2).toLocaleString()} m²
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {newOrders.length > 0 && (
                  <div>
                    {piggyback.length > 0 && (
                      <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'rgba(251, 146, 60, 0.7)' }}>
                        Orden nueva
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {newOrders.map((r) => {
                        const so = r.stockout_date ? new Date(r.stockout_date + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' }) : null;
                        return (
                          <div key={r.product_id} className="flex justify-between text-xs">
                            <span style={{ color: r.urgency === 'critical' ? '#f87171' : '#fb923c' }}>
                              {r.sku}
                              {so && <span className="ml-1" style={{ color: 'var(--color-text-muted)' }}>· se agota {so}</span>}
                            </span>
                            <span style={{ color: 'var(--color-text-muted)' }}>
                              {Math.round(r.additional_m2).toLocaleString()} m²
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </SectionPanel>
            );
          })()}
        </div>
      )}

      {/* Data freshness footer */}
      <div className="mt-6 text-[10px] tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
        {t('common.generatedAt', 'Generado')}: {data.generated_at}
        {data.data_as_of && typeof data.data_as_of === 'object' && (
          <span> &middot; Bodega: {String(data.data_as_of.warehouse_snapshot_date || '?')} &middot; Fábrica: {String(data.data_as_of.factory_snapshot_date || '?')}</span>
        )}
      </div>
      </div>
    </div>
  );
}
