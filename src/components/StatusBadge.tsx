import type { ActionType } from '../requests/recommendations';

type StockoutStatus =
  | 'HIGH_PRIORITY'
  | 'CONSIDER'
  | 'WELL_COVERED'
  | 'YOUR_CALL';

interface StatusBadgeProps {
  status: StockoutStatus;
}

interface ActionBadgeProps {
  action: ActionType;
}

const statusStyles: Record<StockoutStatus, string> = {
  HIGH_PRIORITY: 'bg-orange-100 text-orange-800 border-orange-200',
  CONSIDER: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  WELL_COVERED: 'bg-green-100 text-green-800 border-green-200',
  YOUR_CALL: 'bg-gray-100 text-gray-600 border-gray-200',
};

const statusLabels: Record<StockoutStatus, string> = {
  HIGH_PRIORITY: 'HIGH PRIORITY',
  CONSIDER: 'CONSIDER',
  WELL_COVERED: 'WELL COVERED',
  YOUR_CALL: 'YOUR CALL',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status] || statusStyles.YOUR_CALL;
  const label = statusLabels[status] || status.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}
    >
      {label}
    </span>
  );
}

// Action badge styles (for Recommendations page)
const actionStyles: Record<ActionType, string> = {
  ORDER_NOW: 'bg-red-100 text-red-800 border-red-200',
  ORDER_SOON: 'bg-orange-100 text-orange-800 border-orange-200',
  WELL_STOCKED: 'bg-green-100 text-green-800 border-green-200',
  SKIP_ORDER: 'bg-blue-100 text-blue-800 border-blue-200',
  REVIEW: 'bg-gray-100 text-gray-600 border-gray-200',
};

const actionLabels: Record<ActionType, string> = {
  ORDER_NOW: 'ORDER NOW',
  ORDER_SOON: 'ORDER SOON',
  WELL_STOCKED: 'WELL STOCKED',
  SKIP_ORDER: 'SKIP ORDER',
  REVIEW: 'REVIEW',
};

export function ActionBadge({ action }: ActionBadgeProps) {
  const style = actionStyles[action] || actionStyles.REVIEW;
  const label = actionLabels[action] || action.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}
    >
      {label}
    </span>
  );
}
