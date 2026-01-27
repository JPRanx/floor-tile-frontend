import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BLAllocationReport } from '../requests/orderBuilder';
import { RiskDistribution } from './RiskDistribution';
import { BLCard } from './BLCard';

interface BLAllocationViewProps {
  report: BLAllocationReport;
  onBack: () => void;
  onExport: () => void;
  isExporting?: boolean;
}

/**
 * Container view for BL allocation results.
 * Shows risk distribution + collapsible BL cards.
 */
export function BLAllocationView({
  report,
  onBack,
  onExport,
  isExporting = false,
}: BLAllocationViewProps) {
  const { t } = useTranslation();

  // Track which BLs are expanded (first one by default)
  const [expandedBLs, setExpandedBLs] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    report.allocations.forEach((bl, index) => {
      initial[bl.bl_number] = index === 0; // First BL expanded
    });
    return initial;
  });

  const toggleBL = (blNumber: number) => {
    setExpandedBLs((prev) => ({
      ...prev,
      [blNumber]: !prev[blNumber],
    }));
  };

  const expandAll = () => {
    const newState: Record<number, boolean> = {};
    report.allocations.forEach((bl) => {
      newState[bl.bl_number] = true;
    });
    setExpandedBLs(newState);
  };

  const collapseAll = () => {
    const newState: Record<number, boolean> = {};
    report.allocations.forEach((bl) => {
      newState[bl.bl_number] = false;
    });
    setExpandedBLs(newState);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">
            {t('blAllocation.title', 'BL Allocation')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {report.num_bls} BLs | {report.total_containers}{' '}
            {t('blAllocation.containers', 'containers')} | {report.total_pallets}{' '}
            {t('blAllocation.pallets', 'pallets')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Expand/Collapse All */}
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            {t('blAllocation.expandAll', 'Expand All')}
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            {t('blAllocation.collapseAll', 'Collapse All')}
          </button>
        </div>
      </div>

      {/* Risk Distribution */}
      <RiskDistribution report={report} />

      {/* Warnings */}
      {report.warnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
          <h3 className="font-semibold text-amber-300">
            {t('blAllocation.warnings', 'Warnings')}
          </h3>
          <ul className="text-sm text-amber-200/80 space-y-1">
            {report.warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2">
                <span>⚠️</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* BL Cards */}
      <div className="space-y-3">
        {report.allocations.map((bl) => (
          <BLCard
            key={bl.bl_number}
            bl={bl}
            isExpanded={expandedBLs[bl.bl_number] ?? false}
            onToggleExpand={() => toggleBL(bl.bl_number)}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2.5 bg-slate-800/50 text-slate-300 font-medium rounded-xl border border-slate-700/50 hover:bg-slate-700/50 hover:text-white transition-all duration-300"
        >
          ← {t('blAllocation.backToProducts', 'Back to Products')}
        </button>

        <button
          onClick={onExport}
          disabled={isExporting}
          className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-emerald-400 transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isExporting
            ? t('blAllocation.exporting', 'Exporting...')
            : t('blAllocation.exportBLs', 'Export BLs')}
        </button>
      </div>

      {/* Generation Info */}
      <div className="text-xs text-slate-500 text-center pt-2">
        {t('blAllocation.generatedAt', 'Generated')}: {new Date(report.generated_at).toLocaleString()}
        {' | '}
        {t('blAllocation.boat', 'Boat')}: {report.boat_name} ({report.boat_departure})
      </div>
    </div>
  );
}
