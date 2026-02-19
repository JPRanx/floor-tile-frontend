import { useTranslation } from 'react-i18next';
import type { PlanningHorizonResponse } from '../../requests/planning';

interface BriefingProps {
  horizon: PlanningHorizonResponse | null;
  loading: boolean;
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

  let overdueCount = 0;
  let actionThisWeekCount = 0;
  let completedCount = 0;
  let pendingCount = 0;
  let totalCritical = 0;
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
    totalCritical += p.urgency_breakdown.critical;

    const days = p.days_until_siesa_deadline ?? p.days_until_order_deadline;
    if (days != null) {
      if (days < 0) overdueCount++;
      else if (days <= 7) actionThisWeekCount++;

      if (nearestDeadlineDays == null || days < nearestDeadlineDays) {
        nearestDeadlineDays = days;
        nearestDeadlineDate = p.siesa_order_date ?? p.order_by_date;
      }
    }

    // Estimate average coverage from product details
    for (const prod of p.product_details) {
      if (prod.days_of_stock_at_arrival > 0) {
        avgCoverageDays += prod.days_of_stock_at_arrival;
        coverageCount++;
      }
    }
  }

  const avgCoverage = coverageCount > 0 ? Math.round(avgCoverageDays / coverageCount) : 0;

  // Determine the briefing sentence and tone
  let sentence: string;
  let tone: 'urgent' | 'warning' | 'calm';

  if (overdueCount > 0) {
    const critPart = totalCritical > 0
      ? ' ' + t('planning.briefing.criticalProducts', { count: totalCritical })
      : '';
    sentence = t('planning.briefing.overdue', { count: overdueCount }) + critPart;
    tone = 'urgent';
  } else if (actionThisWeekCount > 0) {
    const critPart = totalCritical > 0 ? ' ' + t('planning.briefing.criticalCount', { count: totalCritical }) : '';
    sentence = t('planning.briefing.actionThisWeek', { count: actionThisWeekCount }) + critPart;
    tone = 'warning';
  } else if (pendingCount === 0 && completedCount > 0) {
    sentence = t('planning.briefing.allConfirmed');
    tone = 'calm';
  } else if (pendingCount > 0 && completedCount > 0) {
    const deadlinePart = nearestDeadlineDate
      ? ' ' + t('planning.briefing.nextDeadline', { date: formatShortDate(nearestDeadlineDate, t) })
      : '';
    sentence = t('planning.briefing.mixed', { completed: completedCount, pending: pendingCount }) + deadlinePart;
    tone = 'calm';
  } else if (avgCoverage > 0) {
    sentence = t('planning.briefing.allGood', { days: avgCoverage });
    tone = 'calm';
  } else {
    sentence = t('planning.briefing.pendingReview', { count: pendingCount });
    tone = 'calm';
  }

  const iconByTone = {
    urgent: <WarningIcon />,
    warning: <WarningIcon />,
    calm: completedCount > 0 && pendingCount === 0 ? <CheckIcon /> : <InfoIcon />,
  };

  const textByTone = {
    urgent: 'text-red-300/80',
    warning: 'text-amber-300/80',
    calm: 'text-emerald-300/80',
  };

  return (
    <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2">
      {iconByTone[tone]}
      <span className={`text-sm font-medium ${textByTone[tone]}`}>
        {sentence}
      </span>
    </div>
  );
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
    <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
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
