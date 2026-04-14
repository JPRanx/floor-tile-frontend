import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { intelligenceApi, type CustomerTrend, type ProductPurchase } from '../requests/intelligence';

const tierColors: Record<string, string> = {
  A: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  B: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  C: 'bg-slate-700/20 text-slate-500 border-slate-600/30',
};

const statusColors: Record<string, { dot: string; label: string }> = {
  ACTIVE: { dot: 'bg-emerald-400', label: 'Activo' },
  COOLING: { dot: 'bg-amber-400', label: 'Enfriando' },
  DORMANT: { dot: 'bg-red-400', label: 'Dormido' },
};

const trendArrow: Record<string, { icon: string; color: string }> = {
  UP: { icon: '\u2191', color: 'text-emerald-400' },
  DOWN: { icon: '\u2193', color: 'text-red-400' },
  STABLE: { icon: '\u2192', color: 'text-slate-400' },
};

const predictLabels: Record<string, { text: string; color: string }> = {
  CLOCKWORK: { text: 'Reloj', color: 'text-emerald-400' },
  PREDICTABLE: { text: 'Predecible', color: 'text-blue-400' },
  MODERATE: { text: 'Moderado', color: 'text-amber-400' },
  ERRATIC: { text: 'Erratico', color: 'text-red-400' },
};

type SortKey = 'revenue' | 'tier' | 'last_order' | 'overdue' | 'orders' | 'name' | 'country';

const COUNTRY_LABELS: Record<string, { flag: string; name: string }> = {
  GT: { flag: '🇬🇹', name: 'Guatemala' },
  SV: { flag: '🇸🇻', name: 'El Salvador' },
  HN: { flag: '🇭🇳', name: 'Honduras' },
  NI: { flag: '🇳🇮', name: 'Nicaragua' },
  CR: { flag: '🇨🇷', name: 'Costa Rica' },
  PA: { flag: '🇵🇦', name: 'Panamá' },
  OTHER: { flag: '🌎', name: 'Otro' },
};
const countryLabel = (code: string | null | undefined) =>
  (code && COUNTRY_LABELS[code]) || { flag: '—', name: 'Desconocido' };

function MiniSparkline({ data }: { data: { value: number }[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 80;
  const h = 24;
  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = h - (d.value / max) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-blue-400"
      />
    </svg>
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
        className="relative w-full max-w-md bg-slate-900 border-l border-slate-700 overflow-y-auto shadow-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-700 p-5">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-slate-100">{customer.customer_normalized}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {countryLabel(customer.country_code).flag} {countryLabel(customer.country_code).name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${tierColors[customer.tier]}`}>
                  Tier {customer.tier}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusColors[customer.status]?.dot}`} />
                  {statusColors[customer.status]?.label}
                </span>
                {customer.predictability && predictLabels[customer.predictability] && (
                  <span className={`text-xs ${predictLabels[customer.predictability].color}`}>
                    {predictLabels[customer.predictability].text}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none">&times;</button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/60 rounded-lg p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Ingresos totales</p>
              <p className="text-lg font-bold text-slate-100 mt-1">{fmtUsd(customer.total_revenue_usd)}</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Volumen total</p>
              <p className="text-lg font-bold text-slate-100 mt-1">{fmt(customer.total_m2)} m&sup2;</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Pedidos</p>
              <p className="text-lg font-bold text-slate-100 mt-1">{customer.order_count}</p>
              <p className="text-xs text-slate-500 mt-0.5">~{fmtUsd(customer.avg_order_revenue_usd)}/pedido</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Ultimo pedido</p>
              <p className="text-sm font-medium text-slate-100 mt-1">{fmtDate(customer.last_order_date)}</p>
              {customer.days_since_last_order != null && (
                <p className={`text-xs mt-0.5 ${customer.days_since_last_order > 60 ? 'text-red-400' : customer.days_since_last_order > 30 ? 'text-amber-400' : 'text-slate-500'}`}>
                  hace {customer.days_since_last_order} dias
                </p>
              )}
            </div>
          </div>

          {/* Prediction */}
          {customer.expected_next_date && (
            <div className={`rounded-lg p-3 border ${customer.days_overdue > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
              <p className="text-xs text-slate-400">Proximo pedido esperado</p>
              <p className={`text-sm font-medium mt-0.5 ${customer.days_overdue > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                {fmtDate(customer.expected_next_date)}
                {customer.days_overdue > 0 && ` (${customer.days_overdue} dias atrasado)`}
              </p>
              {customer.avg_gap_days != null && (
                <p className="text-xs text-slate-500 mt-1">Frecuencia: cada ~{Math.round(customer.avg_gap_days)} dias</p>
              )}
            </div>
          )}

          {/* Sparkline */}
          {customer.sparkline.length > 1 && (
            <div className="bg-slate-800/60 rounded-lg p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Tendencia de ingresos</p>
              <svg width="100%" height="48" viewBox="0 0 300 48" preserveAspectRatio="none" className="text-blue-400">
                <polyline
                  points={customer.sparkline.map((p, i) => {
                    const max = Math.max(...customer.sparkline.map(s => s.value), 1);
                    const x = (i / Math.max(customer.sparkline.length - 1, 1)) * 300;
                    const y = 48 - (p.value / max) * 44;
                    return `${x},${y}`;
                  }).join(' ')}
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
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Productos principales</p>
              <div className="bg-slate-800/60 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                      <th className="text-left px-3 py-2">Producto</th>
                      <th className="text-right px-3 py-2">m&sup2;</th>
                      <th className="text-right px-3 py-2">USD</th>
                      <th className="text-right px-3 py-2">$/m&sup2;</th>
                      <th className="text-right px-3 py-2">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.top_products.map((p: ProductPurchase) => {
                      const pricePerM2 = p.total_m2 > 0 ? p.total_revenue_usd / p.total_m2 : 0;
                      const share = totalProductRevenue > 0 ? (p.total_revenue_usd / totalProductRevenue) * 100 : 0;
                      return (
                        <tr key={p.sku} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="px-3 py-2 text-slate-200 font-medium">{p.sku}</td>
                          <td className="px-3 py-2 text-right text-slate-400">{fmt(p.total_m2)}</td>
                          <td className="px-3 py-2 text-right text-slate-300">{fmtUsd(p.total_revenue_usd)}</td>
                          <td className="px-3 py-2 text-right text-emerald-400 font-medium">${pricePerM2.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{share.toFixed(0)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="text-xs text-slate-600 pt-2 border-t border-slate-800">
            Cliente desde {fmtDate(customer.first_order_date)}
          </div>
        </div>
      </div>
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
      revenue: (a, b) => b.total_revenue_usd - a.total_revenue_usd,
      tier: (a, b) => a.tier.localeCompare(b.tier) || b.total_revenue_usd - a.total_revenue_usd,
      last_order: (a, b) => (b.last_order_date || '').localeCompare(a.last_order_date || ''),
      overdue: (a, b) => b.days_overdue - a.days_overdue,
      orders: (a, b) => b.order_count - a.order_count,
      name: (a, b) => a.customer_normalized.localeCompare(b.customer_normalized),
      country: (a, b) =>
        countryLabel(a.country_code).name.localeCompare(countryLabel(b.country_code).name) ||
        b.total_revenue_usd - a.total_revenue_usd,
    };
    list.sort(sortFns[sortBy]);
    return list;
  }, [customers, filterTier, filterStatus, search, sortBy]);

  const fmtUsd = (n: number) => `$${n.toLocaleString('es', { maximumFractionDigits: 0 })}`;
  const fmtDate = (d: string | null) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '-';

  // Summary stats
  const stats = useMemo(() => ({
    total: customers.length,
    tierA: customers.filter(c => c.tier === 'A').length,
    active: customers.filter(c => c.status === 'ACTIVE').length,
    overdue: customers.filter(c => c.days_overdue > 0).length,
    totalRevenue: customers.reduce((s, c) => s + c.total_revenue_usd, 0),
  }), [customers]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">{t('nav.customers', 'Clientes')}</h1>
        <p className="text-sm text-slate-500 mt-1">{stats.total} clientes &middot; {stats.tierA} Tier A &middot; {stats.active} activos &middot; {stats.overdue} atrasados</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-3">
          <p className="text-xs text-slate-500">Ingresos totales</p>
          <p className="text-lg font-bold text-slate-100">{fmtUsd(stats.totalRevenue)}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-3">
          <p className="text-xs text-slate-500">Clientes activos</p>
          <p className="text-lg font-bold text-emerald-400">{stats.active}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-3">
          <p className="text-xs text-slate-500">Tier A</p>
          <p className="text-lg font-bold text-amber-400">{stats.tierA}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-3">
          <p className="text-xs text-slate-500">Atrasados</p>
          <p className="text-lg font-bold text-red-400">{stats.overdue}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 w-48"
        />
        <div className="flex gap-1">
          {['A', 'B', 'C'].map(t => (
            <button
              key={t}
              onClick={() => setFilterTier(filterTier === t ? null : t)}
              className={`px-2.5 py-1.5 text-xs rounded border transition-colors ${
                filterTier === t
                  ? tierColors[t]
                  : 'border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
            >
              Tier {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['ACTIVE', 'COOLING', 'DORMANT'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? null : s)}
              className={`px-2.5 py-1.5 text-xs rounded border transition-colors flex items-center gap-1 ${
                filterStatus === s
                  ? 'border-slate-500 text-slate-200'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusColors[s].dot}`} />
              {statusColors[s].label}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-400 focus:outline-none"
        >
          <option value="revenue">Mayor ingreso</option>
          <option value="tier">Tier</option>
          <option value="country">País</option>
          <option value="overdue">Mas atrasado</option>
          <option value="last_order">Ultimo pedido</option>
          <option value="orders">Mas pedidos</option>
          <option value="name">Nombre</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-xs text-slate-500 uppercase">
              <th className="text-left px-4 py-2.5">Cliente</th>
              <th className="text-left px-2 py-2.5">País</th>
              <th className="text-center px-2 py-2.5">Tier</th>
              <th className="text-center px-2 py-2.5">Estado</th>
              <th className="text-right px-3 py-2.5">Ingresos</th>
              <th className="text-right px-3 py-2.5">Pedidos</th>
              <th className="text-right px-3 py-2.5">Ultimo</th>
              <th className="text-center px-2 py-2.5">Tendencia</th>
              <th className="text-right px-3 py-2.5 hidden md:table-cell">Atrasado</th>
              <th className="text-center px-2 py-2.5 hidden lg:table-cell">Actividad</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const trend = trendArrow[c.trend_direction] || trendArrow.STABLE;
              const overdueClass = c.days_overdue > 30 ? 'text-red-400' : c.days_overdue > 0 ? 'text-amber-400' : 'text-slate-600';

              return (
                <tr
                  key={c.customer_normalized}
                  onClick={() => setSelected(c)}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <span className="text-slate-200 font-medium">{c.customer_normalized}</span>
                  </td>
                  <td className="px-2 py-2.5">
                    <span className="text-sm text-slate-300" title={countryLabel(c.country_code).name}>
                      <span className="mr-1.5">{countryLabel(c.country_code).flag}</span>
                      <span className="text-xs text-slate-400">{countryLabel(c.country_code).name}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${tierColors[c.tier]}`}>
                      {c.tier}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <span className={`w-2 h-2 rounded-full inline-block ${statusColors[c.status]?.dot}`} />
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-300 font-medium">{fmtUsd(c.total_revenue_usd)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-400">{c.order_count}</td>
                  <td className="px-3 py-2.5 text-right text-slate-400">{fmtDate(c.last_order_date)}</td>
                  <td className="px-2 py-2.5 text-center">
                    <span className={`text-sm ${trend.color}`}>{trend.icon}</span>
                  </td>
                  <td className={`px-3 py-2.5 text-right hidden md:table-cell ${overdueClass}`}>
                    {c.days_overdue > 0 ? `${c.days_overdue}d` : '-'}
                  </td>
                  <td className="px-2 py-2.5 text-center hidden lg:table-cell text-slate-500">
                    <MiniSparkline data={c.sparkline} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-slate-600 py-8">Sin resultados</p>
        )}
      </div>

      {/* Slide-out panel */}
      {selected && <SlideOut customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
