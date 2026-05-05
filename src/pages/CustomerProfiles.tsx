import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { intelligenceApi, type CustomerTrend, type ProductPurchase } from '../requests/intelligence';

const tierTone: Record<string, { bg: string; fg: string }> = {
  A: { bg: 'rgba(251, 191, 36, 0.12)', fg: '#fbbf24' },
  B: { bg: 'rgba(96, 165, 250, 0.12)', fg: '#60a5fa' },
  C: { bg: 'var(--color-bg-elevated)',  fg: 'var(--color-text-muted)' },
};

const statusTone: Record<string, { dot: string; label: string }> = {
  ACTIVE:  { dot: '#4ade80', label: 'Activo'    },
  COOLING: { dot: '#fbbf24', label: 'Enfriando' },
  DORMANT: { dot: '#f87171', label: 'Dormido'   },
};

const trendArrow: Record<string, { icon: string; color: string }> = {
  UP:     { icon: '↑', color: '#4ade80' },
  DOWN:   { icon: '↓', color: '#f87171' },
  STABLE: { icon: '→', color: 'var(--color-text-muted)' },
};

const predictLabels: Record<string, { text: string; color: string }> = {
  CLOCKWORK:   { text: 'Reloj',     color: '#4ade80' },
  PREDICTABLE: { text: 'Predecible', color: '#60a5fa' },
  MODERATE:    { text: 'Moderado',  color: '#fbbf24' },
  ERRATIC:     { text: 'Erratico',  color: '#f87171' },
};

type SortKey = 'revenue' | 'tier' | 'last_order' | 'overdue' | 'orders' | 'name';

const COUNTRY_LABELS: Record<string, { flag: string; name: string }> = {
  GT: { flag: '🇬🇹', name: 'Guatemala'   },
  SV: { flag: '🇸🇻', name: 'El Salvador' },
  HN: { flag: '🇭🇳', name: 'Honduras'    },
  NI: { flag: '🇳🇮', name: 'Nicaragua'   },
  CR: { flag: '🇨🇷', name: 'Costa Rica'  },
  PA: { flag: '🇵🇦', name: 'Panamá'      },
  OTHER: { flag: '🌎', name: 'Otro'      },
};
const countryLabel = (code: string | null | undefined) =>
  (code && COUNTRY_LABELS[code]) || { flag: '—', name: 'Desconocido' };

function MiniSparkline({ data }: { data: { value: number }[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 80, h = 24;
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * w;
      const y = h - (d.value / max) * h;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} className="inline-block" style={{ color: 'var(--color-accent-hover)' }}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function TierPill({ tier }: { tier: string }) {
  const tone = tierTone[tier] || tierTone.C;
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5"
      style={{ backgroundColor: tone.bg, color: tone.fg, borderRadius: 'var(--radius-sm)' }}
    >
      {tier}
    </span>
  );
}

function SlideOut({ customer, onClose }: { customer: CustomerTrend; onClose: () => void }) {
  const fmt = (n: number) => n.toLocaleString('es', { maximumFractionDigits: 0 });
  const fmtUsd = (n: number) => `$${n.toLocaleString('es', { maximumFractionDigits: 0 })}`;
  const fmtDate = (d: string | null) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  const totalProductRevenue = customer.top_products.reduce((s, p) => s + p.total_revenue_usd, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-md overflow-y-auto shadow-2xl animate-slide-in"
        style={{
          backgroundColor: 'var(--color-bg-base)',
          borderLeft: '1px solid var(--color-border-subtle)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 backdrop-blur p-5"
          style={{
            backgroundColor: 'rgba(3, 7, 18, 0.95)',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-base font-medium tracking-wide" style={{ color: 'var(--color-text-primary)' }} translate="no">
                {customer.customer_normalized}
              </h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {countryLabel(customer.country_code).flag} {countryLabel(customer.country_code).name}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <TierPill tier={customer.tier} />
                <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusTone[customer.status]?.dot }} />
                  {statusTone[customer.status]?.label}
                </span>
                {customer.predictability && predictLabels[customer.predictability] && (
                  <span className="text-[11px]" style={{ color: predictLabels[customer.predictability].color }}>
                    {predictLabels[customer.predictability].text}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-xl leading-none"
              style={{ color: 'var(--color-text-muted)' }}
            >
              &times;
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCell label="Ingresos totales" value={fmtUsd(customer.total_revenue_usd)} />
            <KpiCell label="Volumen total" value={`${fmt(customer.total_m2)} m²`} />
            <KpiCell
              label="Pedidos"
              value={String(customer.order_count)}
              footnote={`~${fmtUsd(customer.avg_order_revenue_usd)}/pedido`}
            />
            <KpiCell
              label="Último pedido"
              value={fmtDate(customer.last_order_date)}
              footnote={
                customer.days_since_last_order != null
                  ? `hace ${customer.days_since_last_order} días`
                  : undefined
              }
              footnoteColor={
                customer.days_since_last_order != null && customer.days_since_last_order > 60 ? '#f87171' :
                customer.days_since_last_order != null && customer.days_since_last_order > 30 ? '#fbbf24' :
                'var(--color-text-muted)'
              }
            />
          </div>

          {/* Prediction */}
          {customer.expected_next_date && (
            <div
              className="p-3"
              style={{
                borderRadius: 'var(--radius-md)',
                border: customer.days_overdue > 0
                  ? '1px solid rgba(248, 113, 113, 0.3)'
                  : '1px solid rgba(96, 165, 250, 0.3)',
                backgroundColor: customer.days_overdue > 0
                  ? 'rgba(248, 113, 113, 0.08)'
                  : 'rgba(96, 165, 250, 0.08)',
              }}
            >
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                Próximo pedido esperado
              </p>
              <p
                className="text-sm font-medium mt-1"
                style={{ color: customer.days_overdue > 0 ? '#f87171' : '#60a5fa' }}
              >
                {fmtDate(customer.expected_next_date)}
                {customer.days_overdue > 0 && ` · ${customer.days_overdue} días atrasado`}
              </p>
              {customer.avg_gap_days != null && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Frecuencia: cada ~{Math.round(customer.avg_gap_days)} días
                </p>
              )}
            </div>
          )}

          {/* Sparkline */}
          {customer.sparkline.length > 1 && (
            <div
              className="p-3"
              style={{
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-subtle)',
                backgroundColor: 'var(--color-bg-surface)',
              }}
            >
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Tendencia de ingresos
              </p>
              <svg width="100%" height="48" viewBox="0 0 300 48" preserveAspectRatio="none" style={{ color: 'var(--color-accent-hover)' }}>
                <polyline
                  points={customer.sparkline
                    .map((p, i) => {
                      const max = Math.max(...customer.sparkline.map(s => s.value), 1);
                      const x = (i / Math.max(customer.sparkline.length - 1, 1)) * 300;
                      const y = 48 - (p.value / max) * 44;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
          )}

          {/* Products table */}
          {customer.top_products.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Productos principales
              </p>
              <div
                className="overflow-hidden"
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-subtle)',
                  backgroundColor: 'var(--color-bg-surface)',
                }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Producto</th>
                      <th className="text-right px-3 py-2 text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>m²</th>
                      <th className="text-right px-3 py-2 text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>USD</th>
                      <th className="text-right px-3 py-2 text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>$/m²</th>
                      <th className="text-right px-3 py-2 text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.top_products.map((p: ProductPurchase) => {
                      const pricePerM2 = p.total_m2 > 0 ? p.total_revenue_usd / p.total_m2 : 0;
                      const share = totalProductRevenue > 0 ? (p.total_revenue_usd / totalProductRevenue) * 100 : 0;
                      return (
                        <tr key={p.sku} style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                          <td className="px-3 py-2 font-medium" style={{ color: 'var(--color-text-primary)' }} translate="no">{p.sku}</td>
                          <td className="px-3 py-2 text-right" style={{ color: 'var(--color-text-secondary)' }}>{fmt(p.total_m2)}</td>
                          <td className="px-3 py-2 text-right" style={{ color: 'var(--color-text-secondary)' }}>{fmtUsd(p.total_revenue_usd)}</td>
                          <td className="px-3 py-2 text-right" style={{ color: '#4ade80' }}>${pricePerM2.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right" style={{ color: 'var(--color-text-muted)' }}>{share.toFixed(0)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div
            className="text-[10px] uppercase tracking-widest pt-3"
            style={{ borderTop: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}
          >
            Cliente desde {fmtDate(customer.first_order_date)}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCell({
  label,
  value,
  footnote,
  footnoteColor = 'var(--color-text-muted)',
}: {
  label: string;
  value: string;
  footnote?: string;
  footnoteColor?: string;
}) {
  return (
    <div
      className="p-3"
      style={{
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-subtle)',
        backgroundColor: 'var(--color-bg-surface)',
      }}
    >
      <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-base font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      {footnote && (
        <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: footnoteColor }}>{footnote}</p>
      )}
    </div>
  );
}

export function CustomerProfiles() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerTrend[]>([]);
  const [selected, setSelected] = useState<CustomerTrend | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('revenue');
  const [filterTier, setFilterTier] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await intelligenceApi.getCustomers(180, 180);
        setCustomers(data);
      } catch {
        setError('Error al cargar clientes');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = [...customers];
    if (filterTier) list = list.filter(c => c.tier === filterTier);
    if (filterStatus) list = list.filter(c => c.status === filterStatus);
    if (search) {
      const q = search.toUpperCase();
      list = list.filter(c => c.customer_normalized.includes(q));
    }
    const sortFns: Record<SortKey, (a: CustomerTrend, b: CustomerTrend) => number> = {
      revenue:    (a, b) => b.total_revenue_usd - a.total_revenue_usd,
      tier:       (a, b) => a.tier.localeCompare(b.tier) || b.total_revenue_usd - a.total_revenue_usd,
      last_order: (a, b) => (b.last_order_date || '').localeCompare(a.last_order_date || ''),
      overdue:    (a, b) => b.days_overdue - a.days_overdue,
      orders:     (a, b) => b.order_count - a.order_count,
      name:       (a, b) => a.customer_normalized.localeCompare(b.customer_normalized),
    };
    list.sort(sortFns[sortBy]);
    return list;
  }, [customers, filterTier, filterStatus, search, sortBy]);

  const fmtUsd = (n: number) => `$${n.toLocaleString('es', { maximumFractionDigits: 0 })}`;
  const fmtDate = (d: string | null) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '-';

  const countryGroups = useMemo(() => {
    const byCode = new Map<string, CustomerTrend[]>();
    for (const c of filtered) {
      const key = c.country_code || 'UNKNOWN';
      const arr = byCode.get(key);
      if (arr) arr.push(c);
      else byCode.set(key, [c]);
    }
    return Array.from(byCode.entries())
      .map(([code, customers]) => ({
        code,
        customers,
        totalRevenue: customers.reduce((s, c) => s + c.total_revenue_usd, 0),
        tierA:        customers.filter(c => c.tier === 'A').length,
        active:       customers.filter(c => c.status === 'ACTIVE').length,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filtered]);

  const stats = useMemo(() => ({
    total:        customers.length,
    tierA:        customers.filter(c => c.tier === 'A').length,
    active:       customers.filter(c => c.status === 'ACTIVE').length,
    overdue:      customers.filter(c => c.days_overdue > 0).length,
    totalRevenue: customers.reduce((s, c) => s + c.total_revenue_usd, 0),
  }), [customers]);

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

  return (
    <div className="min-h-screen px-6 py-8" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-lg font-medium tracking-[0.15em] uppercase"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('nav.customers', 'clientes')}
          </h1>
          <p className="text-xs mt-1 tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
            {stats.total} clientes · {stats.tierA} tier a · {stats.active} activos · {stats.overdue} atrasados
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <SummaryCard label="Ingresos totales" value={fmtUsd(stats.totalRevenue)} />
          <SummaryCard label="Clientes activos" value={String(stats.active)} valueColor="#4ade80" />
          <SummaryCard label="Tier A" value={String(stats.tierA)} valueColor="#fbbf24" />
          <SummaryCard label="Atrasados" value={String(stats.overdue)} valueColor="#f87171" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 text-sm focus:outline-none w-48"
            style={{
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          <div className="flex gap-1">
            {['A', 'B', 'C'].map(tg => (
              <button
                key={tg}
                onClick={() => setFilterTier(filterTier === tg ? null : tg)}
                className="px-2.5 py-1.5 text-[11px] uppercase tracking-widest transition-colors"
                style={{
                  borderRadius: 'var(--radius-sm)',
                  border: filterTier === tg ? `1px solid ${tierTone[tg].fg}` : '1px solid var(--color-border)',
                  backgroundColor: filterTier === tg ? tierTone[tg].bg : 'transparent',
                  color: filterTier === tg ? tierTone[tg].fg : 'var(--color-text-muted)',
                }}
              >
                Tier {tg}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(['ACTIVE', 'COOLING', 'DORMANT'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? null : s)}
                className="px-2.5 py-1.5 text-[11px] uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                style={{
                  borderRadius: 'var(--radius-sm)',
                  border: filterStatus === s ? '1px solid var(--color-text-secondary)' : '1px solid var(--color-border)',
                  color: filterStatus === s ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusTone[s].dot }} />
                {statusTone[s].label}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="px-3 py-2 text-xs focus:outline-none"
            style={{
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <option value="revenue">Mayor ingreso</option>
            <option value="tier">Tier</option>
            <option value="overdue">Más atrasado</option>
            <option value="last_order">Último pedido</option>
            <option value="orders">Más pedidos</option>
            <option value="name">Nombre</option>
          </select>
        </div>

        {/* Country-grouped cards */}
        {filtered.length === 0 ? (
          <div
            className="p-8 text-center"
            style={{
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-subtle)',
              backgroundColor: 'var(--color-bg-surface)',
              color: 'var(--color-text-muted)',
            }}
          >
            Sin resultados
          </div>
        ) : (
          <div className="space-y-5">
            {countryGroups.map((g) => {
              const label = countryLabel(g.code === 'UNKNOWN' ? null : g.code);
              return (
                <div
                  key={g.code}
                  className="overflow-hidden"
                  style={{
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-subtle)',
                    backgroundColor: 'var(--color-bg-surface)',
                  }}
                >
                  {/* Country header */}
                  <div
                    className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl leading-none">{label.flag}</span>
                      <div>
                        <h2 className="text-sm font-medium tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
                          {label.name}
                        </h2>
                        <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {g.customers.length} cliente{g.customers.length === 1 ? '' : 's'} · {g.tierA} tier a · {g.active} activo{g.active === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Ingresos</p>
                      <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{fmtUsd(g.totalRevenue)}</p>
                    </div>
                  </div>

                  {/* Customers table */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                        {['Cliente', 'Tier', 'Estado', 'Ingresos', 'Pedidos', 'Último', 'Tendencia'].map((h, i) => (
                          <th
                            key={h}
                            className={`px-3 py-2 text-[10px] uppercase tracking-widest ${i === 0 ? 'text-left' : i === 1 || i === 2 || i === 6 ? 'text-center' : 'text-right'}`}
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            {h}
                          </th>
                        ))}
                        <th className="hidden md:table-cell text-right px-3 py-2 text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Atrasado</th>
                        <th className="hidden lg:table-cell text-center px-3 py-2 text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Actividad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.customers.map((c) => {
                        const trend = trendArrow[c.trend_direction] || trendArrow.STABLE;
                        const overdueColor =
                          c.days_overdue > 30 ? '#f87171' :
                          c.days_overdue > 0  ? '#fbbf24' :
                          'var(--color-text-muted)';
                        return (
                          <tr
                            key={c.customer_normalized}
                            onClick={() => setSelected(c)}
                            className="cursor-pointer transition-colors hover:brightness-110"
                            style={{ borderTop: '1px solid var(--color-border-subtle)' }}
                          >
                            <td className="px-4 py-2 font-medium" style={{ color: 'var(--color-text-primary)' }} translate="no">
                              {c.customer_normalized}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <TierPill tier={c.tier} />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: statusTone[c.status]?.dot }} />
                            </td>
                            <td className="px-3 py-2 text-right font-medium" style={{ color: 'var(--color-text-primary)' }}>{fmtUsd(c.total_revenue_usd)}</td>
                            <td className="px-3 py-2 text-right" style={{ color: 'var(--color-text-secondary)' }}>{c.order_count}</td>
                            <td className="px-3 py-2 text-right" style={{ color: 'var(--color-text-secondary)' }}>{fmtDate(c.last_order_date)}</td>
                            <td className="px-2 py-2 text-center text-sm" style={{ color: trend.color }}>{trend.icon}</td>
                            <td className="px-3 py-2 text-right hidden md:table-cell" style={{ color: overdueColor }}>
                              {c.days_overdue > 0 ? `${c.days_overdue}d` : '-'}
                            </td>
                            <td className="px-2 py-2 text-center hidden lg:table-cell">
                              <MiniSparkline data={c.sparkline} />
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
        )}

        {selected && <SlideOut customer={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, valueColor = 'var(--color-text-primary)' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div
      className="p-3"
      style={{
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-subtle)',
        backgroundColor: 'var(--color-bg-surface)',
      }}
    >
      <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-base font-semibold mt-1" style={{ color: valueColor }}>{value}</p>
    </div>
  );
}
