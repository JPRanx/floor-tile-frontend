import type { BoatSchedule, BoatStatus } from '../requests/boats';

interface BoatTableProps {
  boats: BoatSchedule[];
  onStatusChange?: (id: string, status: BoatStatus) => void;
}

const statusStyles: Record<BoatStatus, string> = {
  available: 'bg-green-100 text-green-800 border-green-200',
  booked: 'bg-blue-100 text-blue-800 border-blue-200',
  departed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  arrived: 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusLabels: Record<BoatStatus, string> = {
  available: 'Available',
  booked: 'Booked',
  departed: 'Departed',
  arrived: 'Arrived',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDaysUntilText(days: number | null): string {
  if (days === null) return '—';
  if (days < 0) return 'Departed';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export function BoatTable({ boats, onStatusChange }: BoatTableProps) {
  if (boats.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No boat schedules</h3>
        <p className="mt-1 text-sm text-gray-500">
          Upload TIBA Excel to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vessel
              </th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Departs
              </th>
              <th className="hidden sm:table-cell px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Arrives
              </th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deadline
              </th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Leaves In
              </th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {boats.map((boat) => (
              <tr key={boat.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {boat.vessel_name || '—'}
                  </div>
                  {boat.shipping_line && (
                    <div className="text-xs text-gray-500">{boat.shipping_line}</div>
                  )}
                </td>
                <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(boat.departure_date)}
                  </div>
                  <div className="text-xs text-gray-500">{boat.origin_port}</div>
                  {/* Show arrival on mobile under departure */}
                  <div className="sm:hidden text-xs text-gray-400 mt-1">
                    → {formatDate(boat.arrival_date)} ({boat.transit_days}d)
                  </div>
                </td>
                <td className="hidden sm:table-cell px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(boat.arrival_date)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {boat.destination_port} ({boat.transit_days}d)
                  </div>
                </td>
                <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(boat.booking_deadline)}
                  </div>
                </td>
                <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-center">
                  <span
                    className={`text-sm font-medium ${
                      boat.days_until_departure !== null && boat.days_until_departure < 0
                        ? 'text-gray-400'
                        : boat.days_until_departure !== null && boat.days_until_departure <= 3
                        ? 'text-orange-600'
                        : 'text-gray-900'
                    }`}
                  >
                    {getDaysUntilText(boat.days_until_departure)}
                  </span>
                </td>
                <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                  {onStatusChange ? (
                    <select
                      value={boat.status}
                      onChange={(e) => onStatusChange(boat.id, e.target.value as BoatStatus)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border ${statusStyles[boat.status]} cursor-pointer`}
                    >
                      <option value="available">Available</option>
                      <option value="booked">Booked</option>
                      <option value="departed">Departed</option>
                      <option value="arrived">Arrived</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[boat.status]}`}
                    >
                      {statusLabels[boat.status]}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
