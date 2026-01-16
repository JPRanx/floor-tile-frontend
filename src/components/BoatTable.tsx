import { useTranslation } from 'react-i18next';
import type { BoatSchedule, BoatStatus } from '../requests/boats';

interface BoatTableProps {
  boats: BoatSchedule[];
  onStatusChange?: (id: string, status: BoatStatus) => void;
}

const statusStyles: Record<BoatStatus, string> = {
  available: 'bg-green-100 text-green-800 border-green-200',
  booked: 'bg-blue-100 text-blue-800 border-blue-200',
  departed: 'bg-gray-100 text-gray-500 border-gray-200',
  arrived: 'bg-gray-100 text-gray-800 border-gray-200',
};

function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get the display status for a boat.
 * Status is auto-computed from departure date - past dates are always "departed".
 * This is the ONLY source of truth for display status.
 */
function getDisplayStatus(boat: BoatSchedule): BoatStatus {
  const etd = new Date(boat.departure_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  etd.setHours(0, 0, 0, 0);

  if (etd < today) {
    return 'departed'; // Always departed if date has passed
  }
  return boat.status; // Otherwise use stored status (available/booked)
}

export function BoatTable({ boats, onStatusChange }: BoatTableProps) {
  const { t, i18n } = useTranslation();

  const getDaysUntilText = (days: number | null): string => {
    if (days === null) return '—';
    if (days < 0) return t('boats.daysUntil.departed');
    if (days === 0) return t('boats.daysUntil.today');
    if (days === 1) return t('boats.daysUntil.oneDay');
    return t('boats.daysUntil.days', { count: days });
  };

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
        <h3 className="mt-2 text-sm font-medium text-gray-900">{t('boats.noSchedules')}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {t('boats.uploadToStart')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('boats.columns.vessel')}
              </th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('boats.columns.departs')}
              </th>
              <th className="hidden sm:table-cell px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('boats.columns.arrives')}
              </th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('boats.columns.deadline')}
              </th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('boats.columns.leavesIn')}
              </th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('boats.columns.status')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {boats.map((boat) => {
              const displayStatus = getDisplayStatus(boat);
              return (
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
                      {formatDate(boat.departure_date, i18n.language)}
                    </div>
                    <div className="text-xs text-gray-500">{boat.origin_port}</div>
                    {/* Show arrival on mobile under departure */}
                    <div className="sm:hidden text-xs text-gray-400 mt-1">
                      → {formatDate(boat.arrival_date, i18n.language)} ({boat.transit_days}d)
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(boat.arrival_date, i18n.language)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {boat.destination_port} ({boat.transit_days}d)
                    </div>
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(boat.booking_deadline, i18n.language)}
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
                    {onStatusChange && displayStatus !== 'departed' ? (
                      <select
                        value={boat.status}
                        onChange={(e) => onStatusChange(boat.id, e.target.value as BoatStatus)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border ${statusStyles[boat.status]} cursor-pointer`}
                      >
                        <option value="available">{t('boats.statuses.available')}</option>
                        <option value="booked">{t('boats.statuses.booked')}</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[displayStatus]}`}
                      >
                        {t(`boats.statuses.${displayStatus}`)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
