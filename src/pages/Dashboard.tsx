import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dashboardApi } from '../requests/dashboard';
import type { StockoutSummary } from '../requests/dashboard';
import { inventoryApi } from '../requests/inventory';
import { productsApi } from '../requests/products';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StockCoverage } from '../components/shared';
import { formatDateUTC } from '../utils/dateUtils';
import { WAREHOUSE_MAX_M2 } from '../constants/inventory';

export function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<StockoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastInventoryUpdate, setLastInventoryUpdate] = useState<string | null>(null);
  const [liquidationIds, setLiquidationIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  // Fetch liquidation IDs
  useEffect(() => {
    const fetchLiquidationIds = async () => {
      try {
        const products = await productsApi.getLiquidationProducts();
        setLiquidationIds(new Set(products.map(p => p.id)));
      } catch {
        // Non-critical
      }
    };
    fetchLiquidationIds();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const stockoutData = await dashboardApi.getStockoutList();
      setData(stockoutData);
      try {
        const inventoryData = await inventoryApi.getLatest();
        setLastInventoryUpdate(inventoryData.as_of);
      } catch {
        // Non-critical
      }
    } catch (err) {
      setError(t('dashboard.loadError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
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
          <p>{error}</p>
          <button
            onClick={loadData}
            className="mt-2 underline text-xs uppercase tracking-widest"
            style={{ color: 'var(--color-error)' }}
          >
            {t('common.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const tierOrder: Record<string, number> = { A: 0, B: 1, C: 2 };
  const products = [...data.products].sort(
    (a, b) => (tierOrder[a.tier ?? ''] ?? 3) - (tierOrder[b.tier ?? ''] ?? 3)
  );

  const totalWarehouseM2 = products.reduce((sum, p) => sum + Number(p.warehouse_qty), 0);
  const totalInTransitM2 = products.reduce((sum, p) => sum + Number(p.in_transit_qty), 0);
  const utilizationPct = Math.round((totalWarehouseM2 / WAREHOUSE_MAX_M2) * 100);

  return (
    <div className="min-h-screen px-6 py-8" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Title — editorial */}
        <div>
          <h1
            className="text-lg font-medium tracking-[0.15em] uppercase"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('dashboard.title')}
          </h1>
          <p
            className="text-xs mt-1 tracking-widest uppercase"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Status KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatusCard label={t('dashboard.highPriority')} count={data.high_priority_count} tone="critical" />
          <StatusCard label={t('dashboard.consider')}     count={data.consider_count}      tone="warning" />
          <StatusCard label={t('dashboard.wellCovered')}  count={data.well_covered_count}  tone="ok" />
          <StatusCard label={t('dashboard.yourCall')}     count={data.your_call_count}     tone="neutral" />
        </div>

        {/* No Boat Schedule Warning */}
        {!data.next_boat_departure && (
          <div
            className="p-4 flex items-center justify-between"
            style={{
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(251, 191, 36, 0.25)',
              backgroundColor: 'rgba(251, 191, 36, 0.08)',
            }}
          >
            <span className="text-[11px] uppercase tracking-widest font-medium" style={{ color: '#fbbf24' }}>
              {t('dashboard.noBoatWarning')}
            </span>
            <Link
              to="/data-hub"
              className="text-[11px] uppercase tracking-widest underline"
              style={{ color: '#fbbf24' }}
            >
              {t('dashboard.uploadTiba')}
            </Link>
          </div>
        )}

        {/* Boat Departure Info */}
        {data.next_boat_departure && (
          <SectionPanel title={t('dashboard.boatDepartures')} tone="info">
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <p className="uppercase tracking-widest text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  {t('dashboard.nextBoat')}
                </p>
                <p style={{ color: 'var(--color-text-primary)' }}>
                  {formatDateUTC(data.next_boat_departure)} · {t('dashboard.daysLabel', { days: data.days_to_next_boat_departure })}
                </p>
              </div>
              {data.second_boat_departure && (
                <div>
                  <p className="uppercase tracking-widest text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    {t('dashboard.secondBoat')}
                  </p>
                  <p style={{ color: 'var(--color-text-primary)' }}>
                    {formatDateUTC(data.second_boat_departure)} · {t('dashboard.daysLabel', { days: data.days_to_second_boat_departure })}
                  </p>
                </div>
              )}
            </div>
          </SectionPanel>
        )}

        {/* Warehouse Utilization */}
        <SectionPanel
          title={t('dashboard.warehouseStatus')}
          tone="neutral"
          action={
            <Link
              to="/data-hub"
              className="text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--color-accent-hover)' }}
            >
              {t('inventory.uploadTitle')} →
            </Link>
          }
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-2">
                <span className="uppercase tracking-widest text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('dashboard.warehouseStock')}
                </span>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {totalWarehouseM2.toLocaleString()} m²
                </span>
              </div>
              <div
                className="w-full h-1.5 overflow-hidden"
                style={{ backgroundColor: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-sm)' }}
              >
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${Math.min(utilizationPct, 100)}%`,
                    backgroundColor: 'var(--color-accent)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                />
              </div>
              <p className="text-[10px] uppercase tracking-widest mt-2" style={{ color: 'var(--color-text-muted)' }}>
                {t('dashboard.ofCapacity')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {utilizationPct}%
              </div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                {t('dashboard.utilization')}
              </div>
            </div>
          </div>
          {totalInTransitM2 > 0 && (
            <p className="mt-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {t('dashboard.inTransit', { amount: totalInTransitM2.toLocaleString() })}
            </p>
          )}
          <div
            className="mt-4 pt-4 flex items-center justify-between text-[10px] uppercase tracking-widest"
            style={{ borderTop: '1px solid var(--color-border-subtle)' }}
          >
            <span style={{ color: 'var(--color-text-muted)' }}>
              {t('inventory.lastUpdated')}:{' '}
              {lastInventoryUpdate ? (
                <span style={{ color: 'var(--color-text-secondary)' }}>{lastInventoryUpdate}</span>
              ) : (
                <span style={{ color: '#fbbf24' }}>{t('inventory.neverUpdated')}</span>
              )}
            </span>
            {lastInventoryUpdate && (() => {
              const updateDate = new Date(lastInventoryUpdate);
              const now = new Date();
              const hoursDiff = (now.getTime() - updateDate.getTime()) / (1000 * 60 * 60);
              return hoursDiff > 24 ? (
                <span style={{ color: '#fbbf24' }} title={t('inventory.dataStale')}>
                  {t('inventory.dataStale')}
                </span>
              ) : null;
            })()}
          </div>
        </SectionPanel>

        {/* Product Table */}
        <div
          className="overflow-hidden"
          style={{
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-subtle)',
            backgroundColor: 'var(--color-bg-surface)',
          }}
        >
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
            <h2 className="text-xs tracking-widest uppercase font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {t('dashboard.productsByStatus')}
            </h2>
          </div>
          <div className="overflow-auto max-h-[500px]">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                <tr>
                  <th
                    className="px-4 py-3 text-left text-[10px] uppercase tracking-widest sticky left-0 z-20"
                    style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-elevated)' }}
                  >
                    {t('dashboard.columns.sku')}
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                    Tier
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                    {t('dashboard.columns.daysLeft')}
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                    {t('dashboard.columns.velocity')}
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                    {t('dashboard.columns.stock')}
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                    {t('dashboard.columns.inTransit')}
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                    {t('dashboard.columns.siesa', 'SIESA')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.product_id}
                    className={`group transition-colors ${!product.active ? 'opacity-60' : ''}`}
                    style={{ borderTop: '1px solid var(--color-border-subtle)' }}
                  >
                    <td
                      className="px-4 py-3 whitespace-nowrap sticky left-0 transition-colors"
                      style={{ backgroundColor: 'var(--color-bg-surface)' }}
                    >
                      <div className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        <span translate="no">{product.sku}</span>
                        {!product.active && (
                          <span
                            className="px-1.5 py-0.5 text-[9px] uppercase tracking-widest"
                            style={{
                              backgroundColor: 'var(--color-bg-elevated)',
                              color: 'var(--color-text-muted)',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            {t('dashboard.inactive', 'INACTIVO')}
                          </span>
                        )}
                        {liquidationIds.has(product.product_id) && (
                          <span
                            className="px-1.5 py-0.5 text-[9px] uppercase tracking-widest"
                            style={{
                              backgroundColor: 'rgba(251, 191, 36, 0.12)',
                              color: '#fbbf24',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            {t('products.liquidation', 'LIQUIDACIÓN')}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {product.rotation}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {product.tier ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                          style={{
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor:
                              product.tier === 'A' ? 'rgba(251, 191, 36, 0.12)' :
                              product.tier === 'B' ? 'rgba(96, 165, 250, 0.12)' :
                              'var(--color-bg-elevated)',
                            color:
                              product.tier === 'A' ? '#fbbf24' :
                              product.tier === 'B' ? '#60a5fa' :
                              'var(--color-text-muted)',
                          }}
                        >
                          {product.tier}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <StockCoverage
                        variant="compact"
                        warehouseDays={product.days_to_stockout != null && !isNaN(Number(product.days_to_stockout))
                          ? Number(product.days_to_stockout)
                          : null}
                        withTransitDays={
                          product.days_to_stockout != null && Number(product.avg_daily_sales) > 0
                            ? Number(product.days_to_stockout) + (Number(product.in_transit_qty) / Number(product.avg_daily_sales))
                            : null
                        }
                        inTransitDays={
                          Number(product.in_transit_qty) > 0 && Number(product.avg_daily_sales) > 0
                            ? Number(product.in_transit_qty) / Number(product.avg_daily_sales)
                            : null
                        }
                        hasGap={
                          product.days_to_stockout != null &&
                          data.days_to_next_boat != null &&
                          Number(product.days_to_stockout) < data.days_to_next_boat
                        }
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {Number(product.avg_daily_sales) > 0
                        ? t('dashboard.velocityText', { count: Math.round(Number(product.avg_daily_sales)) })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      {Number(product.warehouse_qty).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                      {Number(product.in_transit_qty) > 0 ? (
                        <span style={{ color: '#60a5fa' }}>
                          {Number(product.in_transit_qty).toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                      {Number(product.factory_available_m2) > 0 ? (
                        <span
                          style={{ color: 'var(--color-accent-hover)' }}
                          title={t('dashboard.factoryLots', { count: product.factory_lot_count || 0 })}
                        >
                          {Number(product.factory_available_m2).toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Building blocks ─────────────────────────────────────────────────────

function SectionPanel({
  title,
  tone = 'neutral',
  action,
  children,
}: {
  title: string;
  tone?: 'neutral' | 'info' | 'warning';
  action?: React.ReactNode;
  children: React.ReactNode;
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs tracking-widest uppercase font-medium" style={{ color: accent }}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

interface StatusCardProps {
  label: string;
  count: number;
  tone: 'critical' | 'warning' | 'ok' | 'neutral';
}

function StatusCard({ label, count, tone }: StatusCardProps) {
  const dotColor = {
    critical: '#f87171',
    warning: '#fbbf24',
    ok: '#4ade80',
    neutral: 'var(--color-text-muted)',
  }[tone];
  return (
    <div
      className="p-4"
      style={{
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-subtle)',
        backgroundColor: 'var(--color-bg-surface)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </p>
      </div>
      <p className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {count}
      </p>
    </div>
  );
}
