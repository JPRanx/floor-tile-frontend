import { useTranslation } from 'react-i18next';

interface StickyShipmentBarProps {
  totalPallets: number;
  totalM2: number;
  totalContainers: number;
  maxContainers: number;
  totalWeightKg: number;
  estimatedCostUsd: number | null;
  selectedCount: number;
  onAllocateBLs: () => void;
  onExport: () => void;
  isExporting: boolean;
  isBLLoading: boolean;
  hasBLAllocation: boolean;
}

function getContainerColorClass(percent: number): string {
  if (percent > 95) return 'text-red-400';
  if (percent >= 80) return 'text-amber-400';
  return 'text-emerald-400';
}

export function StickyShipmentBar({
  totalPallets,
  totalM2,
  totalContainers,
  maxContainers,
  totalWeightKg,
  estimatedCostUsd,
  selectedCount,
  onAllocateBLs,
  onExport,
  isExporting,
  isBLLoading,
  hasBLAllocation,
}: StickyShipmentBarProps) {
  const { t } = useTranslation();

  const isVisible = selectedCount > 0;
  const containerPercent = maxContainers > 0
    ? Math.round((totalContainers / maxContainers) * 100)
    : 0;
  const containerColorClass = getContainerColorClass(containerPercent);

  const blDisabled = isBLLoading || selectedCount === 0;
  const exportDisabled = isExporting || selectedCount === 0;

  return (
    <div
      className={`
        fixed bottom-4 left-1/2 -translate-x-1/2 z-40
        w-[calc(100%-2rem)] max-w-7xl
        bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl
        shadow-2xl shadow-black/40
        transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[calc(100%+2rem)] opacity-0'}
      `}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Stats section */}
          <div className="flex items-center flex-wrap gap-y-1 text-sm text-slate-300 min-w-0">
            {/* Pallets */}
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span>{'\u{1F4E6}'}</span>
              <span className="font-semibold text-white">{totalPallets}</span>
              {' '}{t('planning.shipmentBar.pallets', 'paletas')}
            </span>

            <span className="text-slate-600 mx-2">&middot;</span>

            {/* M2 */}
            <span className="whitespace-nowrap">
              <span className="font-semibold text-white">{totalM2.toLocaleString()}</span>
              {' '}m²
            </span>

            <span className="text-slate-600 mx-2">&middot;</span>

            {/* Containers */}
            <span className={`flex items-center gap-1 whitespace-nowrap ${containerColorClass}`}>
              <span>{'\u{1F6A2}'}</span>
              <span className="font-semibold">
                {totalContainers}/{maxContainers}
              </span>
              {' '}{t('planning.shipmentBar.containers', 'cont.')}
              {' '}
              <span className="text-xs">({containerPercent}%)</span>
            </span>

            <span className="text-slate-600 mx-2">&middot;</span>

            {/* Weight */}
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span>{'\u{2696}\u{FE0F}'}</span>
              <span className="font-semibold text-white">{totalWeightKg.toLocaleString()}</span>
              {' '}kg
            </span>

            {/* Estimated cost (conditional) */}
            {estimatedCostUsd !== null && (
              <>
                <span className="text-slate-600 mx-2">&middot;</span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span>{'\u{1F4B0}'}</span>
                  <span className="font-semibold text-white">
                    ${estimatedCostUsd.toLocaleString()}
                  </span>
                  {' '}{t('planning.shipmentBar.estimated', 'est.')}
                </span>
              </>
            )}
          </div>

          {/* Buttons section */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Allocate BLs - indigo outlined */}
            <button
              onClick={onAllocateBLs}
              disabled={blDisabled}
              className="
                px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                bg-indigo-600/20 text-indigo-300 border border-indigo-500/30
                hover:bg-indigo-600/30 hover:text-indigo-200 hover:border-indigo-500/50
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isBLLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">{'\u{23F3}'}</span>
                  {t('planning.shipmentBar.allocating', 'Asignando...')}
                </span>
              ) : (
                t('planning.shipmentBar.allocateBLs', 'Asignar BLs')
              )}
            </button>

            {/* Export - only after BL allocation */}
            {hasBLAllocation && (
              <button
                onClick={onExport}
                disabled={exportDisabled}
                className="
                  px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300
                  bg-gradient-to-r from-emerald-600 to-emerald-500 text-white
                  hover:from-emerald-500 hover:to-emerald-400
                  shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                "
              >
                {isExporting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">{'\u{23F3}'}</span>
                    {t('planning.shipmentBar.exporting', 'Exportando...')}
                  </span>
                ) : (
                  t('planning.shipmentBar.export', 'Exportar')
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
