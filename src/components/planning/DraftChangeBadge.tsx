import { useTranslation } from 'react-i18next';
import type { DraftChange } from '../../utils/draftDiff';

interface DraftChangeBadgeProps {
  change: DraftChange;
}

export function DraftChangeBadge({ change }: DraftChangeBadgeProps) {
  const { t } = useTranslation();

  switch (change.type) {
    case 'quantity_changed':
      return (
        <span className="inline-flex items-center text-xs px-2 py-1 rounded-lg border bg-amber-500/15 text-amber-300 border-amber-500/30">
          {t('planning.draftChanges.quantityBadge', 'Seleccionaste: {{draft}}, Sistema recomienda: {{current}}', {
            draft: change.draftValue ?? 0,
            current: change.currentValue ?? 0,
          })}
        </span>
      );

    case 'new_product':
      return (
        <span className="inline-flex items-center text-xs px-2 py-1 rounded-lg border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
          <span className="font-semibold mr-1">
            {t('planning.draftChanges.newLabel', 'NUEVO')}
          </span>
          {' \u2014 '}
          {t('planning.draftChanges.newDescription', 'No estaba en tu borrador')}
        </span>
      );

    case 'removed_product':
      return (
        <span className="inline-flex items-center text-xs px-2 py-1 rounded-lg border bg-red-500/15 text-red-300 border-red-500/30">
          <span className="font-semibold mr-1">
            {t('planning.draftChanges.removedLabel', 'ELIMINADO')}
          </span>
          {' \u2014 '}
          {t('planning.draftChanges.removedDescription', 'Ya no recomendado')}
        </span>
      );

    case 'urgency_changed':
      return (
        <span className="inline-flex items-center text-xs px-2 py-1 rounded-lg border bg-orange-500/15 text-orange-300 border-orange-500/30">
          {t('planning.draftChanges.urgencyBadge', 'Urgencia: {{old}} \u2192 {{new}}', {
            old: change.oldUrgency ?? '',
            new: change.newUrgency ?? '',
          })}
        </span>
      );
  }
}
