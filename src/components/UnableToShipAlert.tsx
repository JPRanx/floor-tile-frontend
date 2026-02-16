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
    <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-slate-600/30 flex items-center justify-center text-lg">⏳</span>
          <div>
            <h3 className="text-sm font-semibold text-slate-300">
              Awaiting Production ({unableToShip.count})
            </h3>
            <p className="text-xs text-slate-500">
              {Math.round(unableToShip.total_gap_m2).toLocaleString()} m² pending
            </p>
          </div>
        </div>
        <span className="text-slate-500 text-sm">
          {expanded ? '▼' : '▶'}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {unableToShip.message && (
            <p className="text-xs text-slate-500 italic">
              {unableToShip.message}
            </p>
          )}

          <div className="space-y-1.5">
            {unableToShip.items.map((item, index) => (
              <div
                key={index}
                className="bg-slate-900/40 rounded-lg px-3 py-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white text-sm">{item.sku}</span>
                  <span className="text-xs text-slate-400">
                    {Math.round(item.coverage_gap_m2).toLocaleString()} m²
                  </span>
                </div>
                {item.days_of_stock !== null && item.days_of_stock <= 14 && (
                  <div className="text-xs text-amber-400 mt-1">
                    {item.days_of_stock}d of stock left
                  </div>
                )}
                {item.production_status && (
                  <div className="text-xs text-slate-500 mt-1">
                    {item.production_status}
                  </div>
                )}
                <div className="text-xs text-blue-400/80 mt-1">
                  {item.suggested_action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
