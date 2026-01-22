import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { intelligenceApi, type IntelligenceDashboard, type ProductTrend } from '../../requests/intelligence';

interface AlertsWidgetProps {
  periodDays?: number;
}

interface Alert {
  type: 'danger' | 'warning' | 'success';
  icon: string;
  title: string;
  subtitle: string;
  count: number;
  link: string;
  linkText: string;
}

const alertStyles = {
  danger: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    icon: 'text-rose-400',
    dot: 'bg-rose-500',
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: 'text-amber-400',
    dot: 'bg-amber-500',
  },
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: 'text-emerald-400',
    dot: 'bg-emerald-500',
  },
};

export function AlertsWidget({ periodDays = 365 }: AlertsWidgetProps) {
  const { t } = useTranslation();
  const [dashboard, setDashboard] = useState<IntelligenceDashboard | null>(null);
  const [products, setProducts] = useState<ProductTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [dashboardData, productsData] = await Promise.all([
          intelligenceApi.getDashboard(periodDays, periodDays),
          intelligenceApi.getProducts(periodDays, periodDays),
        ]);
        setDashboard(dashboardData);
        setProducts(productsData);
      } catch (err) {
        setError(t('dashboard.widgets.loadError'));
        console.error('Failed to fetch alerts data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [periodDays, t]);

  if (loading) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span>{t('dashboard.widgets.alerts.title')}</span>
          </h3>
        </div>
        <div className="flex items-center justify-center h-[200px]">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span>{t('dashboard.widgets.alerts.title')}</span>
          </h3>
        </div>
        <p className="text-slate-400 text-center py-8">{error}</p>
      </div>
    );
  }

  // Calculate low stock products (days_of_stock < 30)
  // Note: days_of_stock might not be in ProductTrend, so we'll use velocity to estimate
  // For now, we'll count products with declining trend as potential concern
  const lowStockCount = products.filter(p => p.trend_direction === 'DOWN' && p.total_m2 < 1000).length;

  // Get customer counts from dashboard
  const dormantCustomers = dashboard.top_customers.filter(c => c.status === 'DORMANT').length;
  const activeCustomers = dashboard.top_customers.filter(c => c.status === 'ACTIVE').length;

  // Build alerts list
  const alerts: Alert[] = [];

  // Dormant customers alert (danger)
  if (dormantCustomers > 0) {
    alerts.push({
      type: 'danger',
      icon: '🔴',
      title: `${dormantCustomers} ${t('dashboard.widgets.alerts.dormantCustomers')}`,
      subtitle: t('dashboard.widgets.alerts.dormantSubtitle'),
      count: dormantCustomers,
      link: '/intelligence?view=customers&status=dormant',
      linkText: t('dashboard.widgets.alerts.viewCustomers'),
    });
  }

  // Low stock alert (warning) - only show if there are concerning products
  if (lowStockCount > 0) {
    alerts.push({
      type: 'warning',
      icon: '🟡',
      title: `${lowStockCount} ${t('dashboard.widgets.alerts.lowStock')}`,
      subtitle: t('dashboard.widgets.alerts.lowStockSubtitle'),
      count: lowStockCount,
      link: '/intelligence?view=products',
      linkText: t('dashboard.widgets.alerts.viewProducts'),
    });
  }

  // Active customers (success)
  if (activeCustomers > 0) {
    alerts.push({
      type: 'success',
      icon: '🟢',
      title: `${activeCustomers} ${t('dashboard.widgets.alerts.activeCustomers')}`,
      subtitle: t('dashboard.widgets.alerts.activeSubtitle'),
      count: activeCustomers,
      link: '/intelligence?view=customers&status=active',
      linkText: t('dashboard.widgets.alerts.viewActive'),
    });
  }

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          <span>{t('dashboard.widgets.alerts.title')}</span>
        </h3>
      </div>

      {/* Alerts list */}
      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <AlertCard key={index} alert={alert} />
          ))}
        </div>
      ) : (
        <p className="text-slate-500 text-center py-8">
          {t('dashboard.widgets.alerts.noAlerts')}
        </p>
      )}
    </div>
  );
}

interface AlertCardProps {
  alert: Alert;
}

function AlertCard({ alert }: AlertCardProps) {
  const styles = alertStyles[alert.type];

  return (
    <div className={`
      rounded-lg border p-3
      ${styles.bg} ${styles.border}
      transition-all hover:scale-[1.01]
    `}>
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${styles.dot}`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">
            {alert.title}
          </p>
          <p className="text-slate-400 text-xs mt-0.5">
            {alert.subtitle}
          </p>
        </div>

        {/* Link */}
        <Link
          to={alert.link}
          className={`text-xs font-medium whitespace-nowrap ${styles.icon} hover:underline`}
        >
          {alert.linkText} →
        </Link>
      </div>
    </div>
  );
}
