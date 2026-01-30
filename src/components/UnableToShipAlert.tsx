import { useState } from 'react';
import type { UnableToShipSummary } from '../requests/orderBuilder';

interface UnableToShipAlertProps {
  unableToShip: UnableToShipSummary | null;
}

export function UnableToShipAlert({ unableToShip }: UnableToShipAlertProps) {
  const [expanded, setExpanded] = useState(false);

  if (!unableToShip || unableToShip.count === 0) {
    return null;
  }

  return (
    <div className="bg-red-900/20 backdrop-blur-sm rounded-xl border border-red-500/30 p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚫</span>
          <div>
            <h3 className="text-lg font-semibold text-red-300">
              Unable to Ship ({unableToShip.count} products)
            </h3>
            <p className="text-sm text-red-400/80">
              {Math.round(unableToShip.total_gap_m2).toLocaleString()} m² needed but no SIESA stock
            </p>
          </div>
        </div>
        <span className="text-red-400 text-xl">
          {expanded ? '▼' : '▶'}
        </span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-red-300/80 italic">
            {unableToShip.message}
          </p>

          <div className="space-y-2">
            {unableToShip.items.map((item, index) => (
              <div
                key={index}
                className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">{item.sku}</div>
                    <div className="text-sm text-slate-400 mt-1">
                      Gap: {Math.round(item.coverage_gap_m2).toLocaleString()} m² ({item.coverage_gap_pallets}p)
                    </div>
                    {item.days_of_stock !== null && (
                      <div className="text-sm text-amber-400 mt-1">
                        {item.days_of_stock} days of stock left
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-red-400">{item.reason}</div>
                    {item.production_status && (
                      <div className="text-xs text-slate-500 mt-1">
                        Production: {item.production_status}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
                  <span>💡</span>
                  <span>{item.suggested_action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
