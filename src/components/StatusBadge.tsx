interface StatusBadgeProps {
  status: 'CRITICAL' | 'WARNING' | 'OK' | 'NO_SALES';
}

const statusStyles = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  OK: 'bg-green-100 text-green-800 border-green-200',
  NO_SALES: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status]}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
