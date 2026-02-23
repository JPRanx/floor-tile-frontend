import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { OverdueAlert } from '../requests/orderBuilder';

interface CallBeforeOrderingAlertProps {
  alerts: OverdueAlert[];
  loading: boolean;
}

// Tier badge colors
const tierColors: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  B: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  C: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
};

export function CallBeforeOrderingAlert({ alerts, loading }: CallBeforeOrderingAlertProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (loading) {
    return null;
  }

  // Filter out dismissed alerts
  const activeAlerts = alerts.filter(a => !dismissed.has(a.customer_normalized));

  if (activeAlerts.length === 0) {
    return null;
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const handleDismiss = (customerName: string) => {
    setDismissed(new Set([...dismissed, customerName]));
  };

  // Split by severity
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  const warningAlerts = activeAlerts.filter(a => a.severity === 'warning');

  return (
    <div className="space-y-3">
      {/* Critical Alerts (possibly lost customers) */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚨</span>
            <div className="flex-1">
              <h4 className="text-red-400 font-semibold mb-2">
                {t('callAlert.criticalTitle')}
              </h4>
              <div className="space-y-2">
                {criticalAlerts.map((alert) => {
                  const tierStyle = tierColors[alert.tier] || tierColors.C;
                  return (
                    <div
                      key={alert.customer_normalized}
                      className="flex items-center justify-between bg-red-500/5 rounded-lg p-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${tierStyle.bg} ${tierStyle.text}`}>
                          {alert.tier}
                        </span>
                        <span className="text-white font-medium">
                          {alert.customer_normalized}
                        </span>
                        <span className="text-red-400 text-sm">
                          {alert.days_overdue}d
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-sm">
                          {t('callAlert.avg', 'Prom')}: {formatCurrency(alert.avg_order_usd)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss(alert.customer_normalized);
                          }}
                          className="text-slate-500 hover:text-slate-300 text-xs"
                        >
                          {t('callAlert.dismiss')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-red-300/70 text-xs mt-3">
                {t('callAlert.criticalDescription')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning Alerts (at risk customers) */}
      {warningAlerts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h4 className="text-amber-400 font-semibold mb-2">
                {t('callAlert.warningTitle')}
              </h4>
              <div className="space-y-2">
                {warningAlerts.slice(0, 3).map((alert) => {
                  const tierStyle = tierColors[alert.tier] || tierColors.C;
                  return (
                    <div
                      key={alert.customer_normalized}
                      className="flex items-center justify-between bg-amber-500/5 rounded-lg p-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${tierStyle.bg} ${tierStyle.text}`}>
                          {alert.tier}
                        </span>
                        <span className="text-white font-medium">
                          {alert.customer_normalized}
                        </span>
                        <span className="text-amber-400 text-sm">
                          {alert.days_overdue}d
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-sm">
                          {t('callAlert.avg', 'Prom')}: {formatCurrency(alert.avg_order_usd)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss(alert.customer_normalized);
                          }}
                          className="text-slate-500 hover:text-slate-300 text-xs"
                        >
                          {t('callAlert.dismiss')}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {warningAlerts.length > 3 && (
                  <p className="text-amber-400/70 text-xs">
                    +{warningAlerts.length - 3} {t('callAlert.moreCustomers')}
                  </p>
                )}
              </div>
              <p className="text-amber-300/70 text-xs mt-3">
                {t('callAlert.warningDescription')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
