import type { OrderBuilderAlert, OrderBuilderAlertType } from '../requests/orderBuilder';

interface OrderBuilderAlertsProps {
  alerts: OrderBuilderAlert[];
}

export function OrderBuilderAlerts({ alerts }: OrderBuilderAlertsProps) {
  if (alerts.length === 0) {
    return null;
  }

  const alertStyles: Record<OrderBuilderAlertType, string> = {
    blocked: 'bg-red-900/30 border-red-500/50 text-red-300',
    warning: 'bg-amber-900/30 border-amber-500/50 text-amber-300',
    suggestion: 'bg-indigo-900/30 border-indigo-500/50 text-indigo-300',
  };

  // Sort alerts: blocked first, then warning, then suggestion
  const sortedAlerts = [...alerts].sort((a, b) => {
    const order: Record<OrderBuilderAlertType, number> = {
      blocked: 0,
      warning: 1,
      suggestion: 2,
    };
    return order[a.type] - order[b.type];
  });

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <span>⚠️</span> ALERTS
      </h3>

      <div className="space-y-2">
        {sortedAlerts.map((alert, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 p-2 rounded-lg border ${alertStyles[alert.type]}`}
          >
            <span className="flex-shrink-0 text-lg">{alert.icon}</span>
            <div className="flex-1 min-w-0 text-sm">
              {alert.product_sku && (
                <span className="font-medium">{alert.product_sku}: </span>
              )}
              <span>{alert.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
