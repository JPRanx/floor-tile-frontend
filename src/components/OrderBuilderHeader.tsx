import { useTranslation } from 'react-i18next';
import type { OrderBuilderBoat } from '../requests/orderBuilder';
import type { BoatSchedule } from '../requests/boats';
import { formatDateUTC } from '../utils/dateUtils';

interface OrderBuilderHeaderProps {
  boat: OrderBuilderBoat;
  nextBoat: OrderBuilderBoat | null;
  availableBoats: BoatSchedule[];
  selectedBoatId: string | undefined;
  onBoatChange: (boatId: string) => void;
  // BL count determines capacity: num_bls × 5 × 14 pallets
  numBLs: number;
  onNumBLsChange: (numBLs: number) => void;
  // Recommended BL count (based on TRUE NEED: coverage gap - transit - production)
  recommendedBLs: number;
  // Available BL count (what can ship now based on factory stock)
  availableBLs: number;
  // Message explaining both need and available
  recommendedBLsReason: string;
}

export function OrderBuilderHeader({
  boat,
  nextBoat,
  availableBoats,
  selectedBoatId,
  onBoatChange,
  numBLs,
  onNumBLsChange,
  recommendedBLs,
  availableBLs,
  recommendedBLsReason,
}: OrderBuilderHeaderProps) {
  const { t } = useTranslation();

  // BL options (1-5 BLs)
  const blOptions = [1, 2, 3, 4, 5];

  // Check if we have a real boat or are in no-boat mode
  const hasBoat = availableBoats.length > 0 && boat.departure_date;

  // Use timezone-safe date formatting
  const formatDate = (dateStr: string) => formatDateUTC(dateStr, 'en-US');

  // Calculate "In Warehouse" date from days_until_warehouse
  const getInWarehouseDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + boat.days_until_warehouse);
    return today.toISOString().split('T')[0];
  };

  const inWarehouseDate = getInWarehouseDate();

  // Timeline milestones
  const milestones = [
    { label: 'Book by', date: boat.booking_deadline, days: boat.days_until_deadline, color: 'orange' },
    { label: 'Departs', date: boat.departure_date, days: boat.days_until_departure, color: 'indigo' },
    { label: 'Arrives Port', date: boat.arrival_date, days: boat.days_until_arrival, color: 'indigo' },
    { label: 'In Warehouse', date: inWarehouseDate, days: boat.days_until_warehouse, color: 'emerald' },
  ];

  return (
    <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Top Section: Title + Boat Info */}
      <div className="p-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {t('orderBuilder.title')}
            </h1>

            {hasBoat ? (
              <div className="space-y-2">
                <p className="text-slate-400">
                  {formatDate(boat.departure_date)} departure • Arrives {formatDate(boat.arrival_date)}
                </p>
                {boat.days_until_deadline <= 7 && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30">
                    <span className="text-orange-400">⏰</span>
                    <span className="text-orange-300 text-sm font-medium">
                      Booking deadline in {boat.days_until_deadline} days
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {t('orderBuilder.noBoatMode')}
                </span>
                <span className="text-sm text-slate-500">
                  {t('orderBuilder.using45DayLeadTime')}
                </span>
              </div>
            )}
          </div>

          {/* Boat Selector */}
          {availableBoats.length > 0 && (
            <div className="flex-shrink-0">
              <label htmlFor="boat-selector" className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                Select Boat
              </label>
              <select
                id="boat-selector"
                value={selectedBoatId || ''}
                onChange={(e) => onBoatChange(e.target.value)}
                className="w-full sm:w-auto min-w-[260px] px-4 py-2.5 border border-slate-600/50 rounded-xl text-sm font-medium text-white bg-slate-800/50 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 cursor-pointer transition-all backdrop-blur-sm"
              >
                {availableBoats.map((b, idx) => (
                  <option key={b.id} value={b.id}>
                    {formatDate(b.departure_date)} — {b.days_until_departure ?? '?'}d to departure
                    {idx === 0 ? ' (next)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Section */}
      {hasBoat && (
        <div className="px-6 py-4 bg-slate-900/30 border-t border-slate-700/30">
          <div className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Order Timeline</div>

          {/* Desktop: Horizontal timeline */}
          <div className="hidden sm:block">
            <div className="relative flex items-center justify-between">
              {/* Connecting line */}
              <div className="absolute top-4 left-8 right-8 h-0.5 bg-gradient-to-r from-orange-500/30 via-indigo-500/30 to-emerald-500/30" />

              {milestones.map((m, idx) => (
                <div key={idx} className="relative flex flex-col items-center z-10">
                  {/* Dot with glow */}
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-lg ${
                      m.color === 'orange'
                        ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-orange-500/20'
                        : m.color === 'emerald'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-emerald-500/20'
                        : 'bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-indigo-500/20'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  {/* Date */}
                  <div className="mt-2 text-sm font-semibold text-white">
                    {formatDate(m.date)}
                  </div>
                  {/* Label */}
                  <div className="text-xs text-slate-400">{m.label}</div>
                  {/* Days badge */}
                  <div className={`mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    m.days <= 7 && m.color === 'orange'
                      ? 'bg-orange-500/20 text-orange-300'
                      : 'bg-slate-700/50 text-slate-400'
                  }`}>
                    {m.days}d
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: Compact list */}
          <div className="sm:hidden grid grid-cols-2 gap-2">
            {milestones.map((m, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    m.color === 'orange'
                      ? 'bg-orange-500'
                      : m.color === 'emerald'
                      ? 'bg-emerald-500'
                      : 'bg-indigo-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-500">{m.label}</div>
                  <div className="text-sm font-medium text-white truncate">{formatDate(m.date)}</div>
                </div>
                <span className="text-xs text-slate-500">{m.days}d</span>
              </div>
            ))}
          </div>

          {nextBoat && (
            <div className="mt-3 pt-3 border-t border-slate-700/30 text-xs text-slate-500">
              Next boat: <span className="text-slate-400">{formatDate(nextBoat.departure_date)}</span> ({nextBoat.days_until_departure} days)
            </div>
          )}
        </div>
      )}

      {/* BL Selector Section */}
      <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700/30">
        <div className="flex flex-col gap-3">
          {/* BL Count Selector - Always visible */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('blAllocation.numBLs', 'Number of BLs')}
            </span>
            <div className="flex gap-2">
              {blOptions.map((num) => {
                const isSelected = numBLs === num;
                const isRecommended = recommendedBLs === num;
                const isAvailable = availableBLs >= num && availableBLs > 0;
                return (
                  <button
                    key={num}
                    onClick={() => onNumBLsChange(num)}
                    className={`
                      relative w-12 h-12 rounded-xl text-sm font-bold transition-all duration-300
                      ${isSelected
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-500'
                        : isRecommended
                          ? 'bg-emerald-500/10 text-emerald-400 border-2 border-emerald-500/50 hover:bg-emerald-500/20'
                          : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white border border-slate-700/50'
                      }
                    `}
                  >
                    {num}
                    {/* Recommended indicator (need) */}
                    {isRecommended && !isSelected && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                    )}
                    {/* Available indicator (cyan dot on bottom) */}
                    {isAvailable && !isSelected && num <= availableBLs && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="text-sm text-slate-400">
              {t('blAllocation.capacity', 'Capacity')}: {numBLs * 5}{' '}
              {t('blAllocation.containers', 'containers')} ({numBLs * 70}{' '}
              {t('blAllocation.pallets', 'pallets')})
            </div>
          </div>

          {/* BL Recommendation - shows both need and available */}
          {recommendedBLsReason && (
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={availableBLs >= recommendedBLs ? 'text-emerald-400' : 'text-amber-400'}>
                  {availableBLs >= recommendedBLs ? '✓' : '⚠️'}
                </span>
                <span className="text-slate-300">{recommendedBLsReason}</span>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3 text-xs text-slate-500 sm:ml-auto">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  {t('blAllocation.needIndicator', 'Need')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                  {t('blAllocation.availableIndicator', 'Available')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
