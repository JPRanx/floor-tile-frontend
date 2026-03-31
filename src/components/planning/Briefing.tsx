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
  const totalBoats = projections.length;

  if (totalBoats === 0) {
    return (
      <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2">
        <InfoIcon />
        <span className="text-sm text-slate-400">{t('planning.briefing.noBoats')}</span>
      </div>
    );
  }

  let pendingCount = 0;
  let avgCoverageDays = 0;
  let coverageCount = 0;

  for (const p of projections) {
    pendingCount++;
    for (const prod of p.product_details) {
      if (prod.days_of_stock_at_arrival > 0) {
        avgCoverageDays += prod.days_of_stock_at_arrival;
        coverageCount++;
      }
    }
  }

  const avgCoverage = coverageCount > 0 ? Math.round(avgCoverageDays / coverageCount) : 0;

  let sentence: string;

  const confirmedCount = projections.filter(p => p.draft_status === 'ordered' || p.draft_status === 'confirmed').length;

  if (pendingCount === 0 && confirmedCount > 0) {
    sentence = t('planning.briefing.allConfirmed');
  } else if (pendingCount > 0 && confirmedCount > 0) {
    sentence = t('planning.briefing.mixed', { completed: confirmedCount, pending: pendingCount });
  } else if (avgCoverage > 0) {
    sentence = t('planning.briefing.allGood', { days: avgCoverage });
  } else {
    sentence = t('planning.briefing.pendingReview', { count: pendingCount });
  }

  return (
    <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2">
      {confirmedCount > 0 && pendingCount === 0 ? <CheckIcon /> : <InfoIcon />}
      <span className="text-sm font-medium text-emerald-300/80">
        {sentence}
      </span>
    </div>
  );
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

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
