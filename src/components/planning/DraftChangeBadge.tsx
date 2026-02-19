import type { DraftChange } from '../../utils/draftDiff';

interface DraftChangeBadgeProps {
  change: DraftChange;
}

const BADGE_STYLES: Record<string, string> = {
  urgency_increased: 'bg-red-500/15 text-red-300 border-red-500/30',
  urgency_decreased: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  stock_changed: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  velocity_changed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  suggestion_changed: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  new_product: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  removed_product: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  quantity_changed: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

export function DraftChangeBadge({ change }: DraftChangeBadgeProps) {
  const style = BADGE_STYLES[change.change_type] || 'bg-slate-500/15 text-slate-300 border-slate-500/30';

  return (
    <span className={`inline-flex items-center text-xs px-2 py-1 rounded-lg border ${style}`}>
      {change.description}
    </span>
  );
}
