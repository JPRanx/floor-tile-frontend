import type { OrderBuilderBoat, OrderBuilderMode } from '../requests/orderBuilder';

interface OrderBuilderHeaderProps {
  boat: OrderBuilderBoat;
  nextBoat: OrderBuilderBoat | null;
  mode: OrderBuilderMode;
  onModeChange: (mode: OrderBuilderMode) => void;
}

export function OrderBuilderHeader({ boat, nextBoat, mode, onModeChange }: OrderBuilderHeaderProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const modeButtons: { value: OrderBuilderMode; label: string; containers: number }[] = [
    { value: 'minimal', label: 'Minimal', containers: 3 },
    { value: 'standard', label: 'Standard', containers: 4 },
    { value: 'optimal', label: 'Optimal', containers: 5 },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Boat Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            ORDER BUILDER — {formatDate(boat.departure_date)} Boat
          </h1>
          <div className="flex flex-wrap gap-2 sm:gap-4 text-sm text-gray-600 mt-1">
            <span>
              Departs in <strong>{boat.days_until_departure}</strong> days
            </span>
            <span className="hidden sm:inline">|</span>
            <span>
              Arrives {formatDate(boat.arrival_date)}
            </span>
            {boat.days_until_deadline <= 7 && (
              <>
                <span className="hidden sm:inline">|</span>
                <span className="text-orange-600 font-medium">
                  Booking deadline in {boat.days_until_deadline} days
                </span>
              </>
            )}
          </div>
          {nextBoat && (
            <div className="text-xs text-gray-500 mt-1">
              Next boat: {formatDate(nextBoat.departure_date)} ({nextBoat.days_until_departure} days)
            </div>
          )}
        </div>

        {/* Vessel Name Badge */}
        <div className="flex-shrink-0">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {boat.name}
          </span>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <span className="text-sm font-medium text-gray-700">MODE:</span>
        <div className="flex gap-2">
          {modeButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => onModeChange(btn.value)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === btn.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
