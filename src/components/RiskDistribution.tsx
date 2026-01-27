import { useTranslation } from 'react-i18next';
import type { BLAllocationReport } from '../requests/orderBuilder';

interface RiskDistributionProps {
  report: BLAllocationReport;
}

/**
 * Shows the risk distribution of critical products across BLs.
 * Displays whether critical products are evenly spread for safety.
 */
export function RiskDistribution({ report }: RiskDistributionProps) {
  const { t } = useTranslation();

  const { total_critical_products, allocations, risk_distribution_even, max_critical_pct } = report;

  // Calculate distribution string
  const distribution = allocations
    .map((bl) => bl.critical_product_count)
    .join('/');

  return (
    <div
      className={`
        rounded-xl border p-4 backdrop-blur-xl
        ${risk_distribution_even
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-amber-500/10 border-amber-500/30'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div
          className={`
            w-10 h-10 rounded-full flex items-center justify-center text-lg
            ${risk_distribution_even
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/20 text-amber-400'
            }
          `}
        >
          {risk_distribution_even ? '✓' : '⚠'}
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Title */}
          <h3 className={`font-semibold ${risk_distribution_even ? 'text-emerald-300' : 'text-amber-300'}`}>
            {t('blAllocation.riskSpread', 'Risk Spread')}:{' '}
            {risk_distribution_even
              ? t('blAllocation.evenlyDistributed', 'Evenly Distributed')
              : t('blAllocation.unevenDistribution', 'Uneven Distribution')
            }
          </h3>

          {/* Stats */}
          <div className="mt-1 text-sm text-slate-300">
            <span className="font-medium">{total_critical_products}</span>{' '}
            {t('blAllocation.criticalProducts', 'critical products')}{' '}
            <span className="text-slate-400">|</span>{' '}
            <span className="font-medium">{distribution}</span>{' '}
            {t('blAllocation.perBL', 'per BL')}
          </div>

          {/* Risk Message */}
          <div className="mt-2 text-sm text-slate-400">
            {t('blAllocation.ifBLHeld', 'If any BL held')} →{' '}
            <span className={risk_distribution_even ? 'text-emerald-400' : 'text-amber-400'}>
              {t('blAllocation.maxDelayed', 'max {{pct}}% of critical delayed', {
                pct: Math.round(max_critical_pct),
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Warning for uneven distribution */}
      {!risk_distribution_even && (
        <div className="mt-3 pt-3 border-t border-amber-500/20 text-sm text-amber-300/80">
          {t('blAllocation.unevenWarning', 'Consider using more BLs to spread critical products more evenly.')}
        </div>
      )}
    </div>
  );
}
