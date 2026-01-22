import { useTranslation } from 'react-i18next';
import type { OrderBuilderBoat, OrderBuilderMode } from '../requests/orderBuilder';
import type { BoatSchedule } from '../requests/boats';

interface OrderBuilderHeaderProps {
  boat: OrderBuilderBoat;
  nextBoat: OrderBuilderBoat | null;
  mode: OrderBuilderMode;
  onModeChange: (mode: OrderBuilderMode) => void;
  availableBoats: BoatSchedule[];
  selectedBoatId: string | undefined;
  onBoatChange: (boatId: string) => void;
}

export function OrderBuilderHeader({
  boat,
  nextBoat,
  mode,
  onModeChange,
  availableBoats,
  selectedBoatId,
  onBoatChange,
}: OrderBuilderHeaderProps) {
  const { t } = useTranslation();

  // Check if we have a real boat or are in no-boat mode
  const hasBoat = availableBoats.length > 0 && boat.departure_date;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate days from today for a date string
  const daysFromToday = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Calculate "In Warehouse" date (arrival + 5 days)
  const getInWarehouseDate = () => {
    const arrival = new Date(boat.arrival_date);
    arrival.setDate(arrival.getDate() + 5);
    return arrival.toISOString().split('T')[0];
  };

  const inWarehouseDate = getInWarehouseDate();

  // Timeline milestones
  const milestones = [
    { label: 'Book by', date: boat.booking_deadline, days: boat.days_until_deadline, color: 'orange' },
    { label: 'Departs', date: boat.departure_date, days: boat.days_until_departure, color: 'indigo' },
    { label: 'Arrives', date: boat.arrival_date, days: daysFromToday(boat.arrival_date), color: 'indigo' },
    { label: 'In Warehouse', date: inWarehouseDate, days: daysFromToday(inWarehouseDate), color: 'emerald' },
  ];

  const modeButtons: { value: OrderBuilderMode; label: string; containers: number }[] = [
    { value: 'minimal', label: 'Minimal', containers: 3 },
    { value: 'standard', label: 'Standard', containers: 4 },
    { value: 'optimal', label: 'Optimal', containers: 5 },
  ];

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
      {/* Boat Selector + Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div className="flex-1">
          {/* Boat Selector Dropdown */}
          {availableBoats.length > 0 && (
            <div className="mb-3">
              <label htmlFor="boat-selector" className="block text-xs font-medium text-slate-500 mb-1">
                SELECT BOAT
              </label>
              <select
                id="boat-selector"
                value={selectedBoatId || ''}
                onChange={(e) => onBoatChange(e.target.value)}
                className="w-full sm:w-auto min-w-[280px] px-3 py-2 border border-slate-600 rounded-lg text-sm font-medium text-white bg-slate-700 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
              >
                {availableBoats.map((b, idx) => (
                  <option key={b.id} value={b.id}>
                    {formatDate(b.departure_date)} — Departs in {b.days_until_departure ?? '?'} days
                    {idx === 0 ? ' (next)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <h1 className="text-xl sm:text-2xl font-bold text-white">
            {hasBoat
              ? `ORDER BUILDER — ${formatDate(boat.departure_date)} Boat`
              : t('orderBuilder.title')
            }
          </h1>
          {hasBoat ? (
            <>
              <div className="flex flex-wrap gap-2 sm:gap-4 text-sm text-slate-400 mt-1">
                <span>
                  Departs in <strong className="text-slate-200">{boat.days_until_departure}</strong> days
                </span>
                <span className="hidden sm:inline text-slate-600">|</span>
                <span>
                  Arrives {formatDate(boat.arrival_date)}
                </span>
                {boat.days_until_deadline <= 7 && (
                  <>
                    <span className="hidden sm:inline text-slate-600">|</span>
                    <span className="text-orange-400 font-medium">
                      Booking deadline in {boat.days_until_deadline} days
                    </span>
                  </>
                )}
              </div>
              {nextBoat && (
                <div className="text-xs text-slate-500 mt-1">
                  Next boat: {formatDate(nextBoat.departure_date)} ({nextBoat.days_until_departure} days)
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-500/20 text-amber-300">
                {t('orderBuilder.noBoatMode')}
              </span>
              <span className="text-sm text-slate-500">
                {t('orderBuilder.using45DayLeadTime')}
              </span>
            </div>
          )}
        </div>

        {/* Vessel Name Badge */}
        {hasBoat && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {boat.name}
            </span>
          </div>
        )}
      </div>

      {/* Order Timeline - only show when boat is available */}
      {hasBoat ? (
        <div className="mb-4 py-3 border-t border-b border-slate-700/50">
          <div className="text-xs font-medium text-slate-500 mb-2">ORDER TIMELINE</div>

          {/* Desktop: Horizontal timeline */}
          <div className="hidden sm:block">
            <div className="relative flex items-center justify-between">
              {/* Connecting line */}
              <div className="absolute top-3 left-4 right-4 h-0.5 bg-slate-700" />

              {milestones.map((m, idx) => (
                <div key={idx} className="relative flex flex-col items-center z-10">
                  {/* Dot */}
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                      m.color === 'orange'
                        ? 'bg-orange-900/50 border-orange-500 text-orange-400'
                        : m.color === 'emerald'
                        ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400'
                        : 'bg-indigo-900/50 border-indigo-500 text-indigo-400'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  {/* Date */}
                  <div className="mt-1 text-sm font-medium text-slate-200">
                    {formatDate(m.date)}
                  </div>
                  {/* Label */}
                  <div className="text-xs text-slate-500">{m.label}</div>
                  {/* Days */}
                  <div className={`text-xs font-medium ${
                    m.days <= 7 && m.color === 'orange' ? 'text-orange-400' : 'text-slate-500'
                  }`}>
                    ({m.days}d)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: Compact vertical list */}
          <div className="sm:hidden flex flex-wrap gap-3">
            {milestones.map((m, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    m.color === 'orange'
                      ? 'bg-orange-500'
                      : m.color === 'emerald'
                      ? 'bg-emerald-500'
                      : 'bg-indigo-500'
                  }`}
                />
                <span className="text-xs text-slate-400">
                  {m.label}: <span className="font-medium text-slate-300">{formatDate(m.date)}</span>
                  <span className="text-slate-500 ml-1">({m.days}d)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 py-3 border-t border-b border-slate-700/50">
          <div className="text-sm text-slate-500 italic">
            {t('orderBuilder.noTimelineAvailable')}
          </div>
        </div>
      )}

      {/* Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <span className="text-sm font-medium text-slate-400">MODE:</span>
        <div className="flex gap-2">
          {modeButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => onModeChange(btn.value)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === btn.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <span className="block">{btn.label}</span>
              <span className="block text-xs opacity-75">{btn.containers} cnt</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
