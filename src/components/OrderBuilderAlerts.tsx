import type { OrderBuilderAlert, OrderBuilderAlertType } from '../requests/orderBuilder';

interface OrderBuilderAlertsProps {
  alerts: OrderBuilderAlert[];
}

export function OrderBuilderAlerts({ alerts }: OrderBuilderAlertsProps) {
  if (alerts.length === 0) {
    return null;
  }

  const alertStyles: Record<OrderBuilderAlertType, string> = {
    blocked: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    suggestion: 'bg-blue-50 border-blue-200 text-blue-800',
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <span>⚠️</span> ALERTS
      </h3>

      <div className="space-y-2">
        {sortedAlerts.map((alert, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 p-2 rounded-lg border ${alertStyles[alert.type]}`}
          >
            <span className="flex-shrink-0 text-lg">{alert.icon}</span>
            <div className="flex-1 min-w-0">
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
