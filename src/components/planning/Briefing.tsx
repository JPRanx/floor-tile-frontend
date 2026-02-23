import { useTranslation } from 'react-i18next';
import type { PlanningHorizonResponse, BoatProjection } from '../../requests/planning';

interface BriefingProps {
  horizon: PlanningHorizonResponse | null;
  loading: boolean;
}

interface BoatAlert {
  boatName: string;
  departureDate: string;
  deadlineType: 'siesa' | 'order';
  daysOverdue: number;
  criticalProducts: string[];
  urgentProducts: string[];
}

export function Briefing({ horizon, loading }: BriefingProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2">
        <InfoIcon />
        <span className="text-sm text-slate-400">{t('planning.briefing.loading')}</span>
      </div>
    );
  }

  if (!horizon) {
    return (
      <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2">
        <InfoIcon />
        <span className="text-sm text-slate-400">{t('planning.briefing.noFactory')}</span>
      </div>
    );
  }

  const projections = horizon.projections;

  if (projections.length === 0) {
    return (
      <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2">
        <InfoIcon />
        <span className="text-sm text-slate-400">{t('planning.briefing.noBoats')}</span>
      </div>
    );
  }

  // Analyze each boat
  const overdueBoats: BoatAlert[] = [];
  const actionBoats: BoatAlert[] = [];
  let completedCount = 0;
  let pendingCount = 0;
  let nearestDeadlineDate: string | null = null;
  let nearestDeadlineDays: number | null = null;
  let avgCoverageDays = 0;
  let coverageCount = 0;

  for (const p of projections) {
    const isCompleted = p.draft_status === 'ordered' || p.draft_status === 'confirmed';
    if (isCompleted) {
      completedCount++;
      continue;
    }

    pendingCount++;

    const siesaDays = p.days_until_siesa_deadline;
    const orderDays = p.days_until_order_deadline;
    const days = siesaDays ?? orderDays;
    const deadlineType: 'siesa' | 'order' = siesaDays != null ? 'siesa' : 'order';

    const criticalProducts = p.product_details
      .filter(prod => prod.urgency === 'critical')
      .map(prod => prod.sku);
    const urgentProducts = p.product_details
      .filter(prod => prod.urgency === 'urgent')
      .map(prod => prod.sku);

    if (days != null) {
      if (days < 0) {
        overdueBoats.push({
          boatName: p.boat_name,
          departureDate: p.departure_date,
          deadlineType,
          daysOverdue: Math.abs(days),
          criticalProducts,
          urgentProducts,
        });
      } else if (days <= 7) {
        actionBoats.push({
          boatName: p.boat_name,
          departureDate: p.departure_date,
          deadlineType,
          daysOverdue: 0,
          criticalProducts,
          urgentProducts,
        });
      }

      if (nearestDeadlineDays == null || days < nearestDeadlineDays) {
        nearestDeadlineDays = days;
        nearestDeadlineDate = p.siesa_order_date ?? p.order_by_date;
      }
    }

    for (const prod of p.product_details) {
      if (prod.days_of_stock_at_arrival > 0) {
        avgCoverageDays += prod.days_of_stock_at_arrival;
        coverageCount++;
      }
    }
  }

  const avgCoverage = coverageCount > 0 ? Math.round(avgCoverageDays / coverageCount) : 0;

  // Find the next non-overdue boat that will fix things
  const nextFixBoat = findNextFixBoat(projections);

  // Build briefing lines
  if (overdueBoats.length > 0 || actionBoats.length > 0) {
    const alerts = [...overdueBoats, ...actionBoats];

    return (
      <div className="bg-gray-800/50 rounded-lg px-3 py-2 space-y-1.5">
        {alerts.map((alert, i) => {
          const allAtRisk = [...alert.criticalProducts, ...alert.urgentProducts];
          const displayProducts = allAtRisk.slice(0, 3);
          const remaining = allAtRisk.length - 3;
          const deadlineLabel = alert.deadlineType === 'siesa'
            ? t('planning.briefing.siesaDeadline', 'pedido SIESA')
            : t('planning.briefing.orderDeadline', 'pedido');

          return (
            <div key={i} className="flex items-start gap-2">
              {alert.daysOverdue > 0 ? <WarningIcon /> : <ClockIcon />}
              <span className={`text-sm font-medium ${alert.daysOverdue > 0 ? 'text-red-300/80' : 'text-amber-300/80'}`}>
                <span className="text-white">{alert.boatName}</span>
                {' '}({formatDateShort(alert.departureDate)})
                {' — '}
                {alert.daysOverdue > 0
                  ? t('planning.briefing.deadlineOverdue', '{{type}} vencido hace {{days}}d', { type: deadlineLabel, days: alert.daysOverdue })
                  : t('planning.briefing.deadlineSoon', '{{type}} esta semana', { type: deadlineLabel })
                }
                {allAtRisk.length > 0 && (
                  <>
                    {'. '}
                    {t('planning.briefing.atRiskProducts', 'En riesgo: {{products}}', {
                      products: displayProducts.join(', ') + (remaining > 0 ? ` +${remaining}` : '')
                    })}
                  </>
                )}
                {nextFixBoat && i === alerts.length - 1 && (
                  <>
                    {'. '}
                    <span className="text-emerald-400">
                      {t('planning.briefing.nextFix', 'Próximo: {{boat}} ({{date}})', {
                        boat: nextFixBoat.boat_name,
                        date: formatDateShort(nextFixBoat.departure_date)
                      })}
                    </span>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // Calm states
  let sentence: string;

  if (pendingCount === 0 && completedCount > 0) {
    sentence = t('planning.briefing.allConfirmed');
  } else if (pendingCount > 0 && completedCount > 0) {
    const deadlinePart = nearestDeadlineDate
      ? ' ' + t('planning.briefing.nextDeadline', { date: formatShortDate(nearestDeadlineDate, t) })
      : '';
    sentence = t('planning.briefing.mixed', { completed: completedCount, pending: pendingCount }) + deadlinePart;
  } else if (avgCoverage > 0) {
    sentence = t('planning.briefing.allGood', { days: avgCoverage });
  } else {
    sentence = t('planning.briefing.pendingReview', { count: pendingCount });
  }

  return (
    <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2">
      {completedCount > 0 && pendingCount === 0 ? <CheckIcon /> : <InfoIcon />}
      <span className="text-sm font-medium text-emerald-300/80">
        {sentence}
      </span>
    </div>
  );
}

function findNextFixBoat(projections: BoatProjection[]): BoatProjection | null {
  // Find the first non-completed boat whose deadline hasn't passed
  for (const p of projections) {
    const isCompleted = p.draft_status === 'ordered' || p.draft_status === 'confirmed';
    if (isCompleted) continue;
    const days = p.days_until_siesa_deadline ?? p.days_until_order_deadline;
    if (days != null && days >= 0) return p;
  }
  // If all overdue, return the last boat as the next actionable one
  const pending = projections.filter(p => p.draft_status !== 'ordered' && p.draft_status !== 'confirmed');
  return pending.length > 0 ? pending[pending.length - 1] : null;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es', { month: 'short', day: 'numeric' });
}

function formatShortDate(dateStr: string, t: (key: string) => string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const month = t(`common.months.${monthKeys[d.getMonth()]}`);
  return `${day} ${month}`;
}

function InfoIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
