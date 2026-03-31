import { useTranslation } from 'react-i18next';
import type { PlanningHorizonResponse } from '../../requests/planning';

interface PipelineStripProps {
  horizon: PlanningHorizonResponse | null;
}

interface StageCount {
  label: string;
  count: number;
  color: string;
}

export function PipelineStrip({ horizon }: PipelineStripProps) {
  const { t } = useTranslation();

  if (!horizon || !horizon.projections.length) return null;

  let drafting = 0;
  let ordered = 0;
  let confirmed = 0;
  let noDraft = 0;
  let dispatched = 0;

  for (const p of horizon.projections) {
    if (p.state === 'DISPATCHED') dispatched++;
    else if (p.draft_status === 'ordered') ordered++;
    else if (p.draft_status === 'confirmed') confirmed++;
    else if (p.draft_status === 'drafting' || p.draft_status === 'action_needed') drafting++;
    else noDraft++;
  }

  const stages: StageCount[] = [
    { label: t('planning.pipeline.dispatched', 'Despachado'), count: dispatched, color: 'text-green-400' },
    { label: t('planning.pipeline.noDraft'), count: noDraft, color: 'text-slate-400' },
    { label: t('planning.pipeline.drafts'), count: drafting, color: 'text-slate-300' },
    { label: t('planning.pipeline.ordered'), count: ordered, color: 'text-blue-400' },
    { label: t('planning.pipeline.confirmed'), count: confirmed, color: 'text-emerald-400' },
  ];

  return (
    <div className="bg-gray-900/80 border-t border-gray-700 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center gap-1 text-xs">
        <span className="text-slate-500 font-semibold uppercase tracking-wider mr-2">Pipeline</span>
        {stages.map((stage, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <svg className="w-3 h-3 text-slate-600 mx-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M9 5l7 7-7 7" />
              </svg>
            )}
            <span className="text-slate-500">{stage.label}:</span>
            <span className={`font-medium ${stage.color}`}>{stage.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
