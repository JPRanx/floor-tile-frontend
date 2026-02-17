import { useTranslation } from 'react-i18next';
import type { DraftChange } from '../../utils/draftDiff';

interface DraftChangeBannerProps {
  changes: DraftChange[];
  onAcceptAll: () => void;
  onDismiss: () => void;
}

export function DraftChangeBanner({ changes, onAcceptAll, onDismiss }: DraftChangeBannerProps) {
  const { t } = useTranslation();

  if (changes.length === 0) return null;

  // Count changes by type for summary chips
  const quantityCount = changes.filter((c) => c.type === 'quantity_changed').length;
  const newCount = changes.filter((c) => c.type === 'new_product').length;
  const removedCount = changes.filter((c) => c.type === 'removed_product').length;
  const urgencyCount = changes.filter((c) => c.type === 'urgency_changed').length;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
      <div className="flex items-start gap-3">
        {/* Warning icon */}
        <span className="text-xl flex-shrink-0 mt-0.5">{'\u26A0\uFE0F'}</span>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-amber-200 font-semibold text-sm">
            {t('planning.draftChanges.title', '{{count}} cambios desde tu ultima visita', {
              count: changes.length,
            })}
          </h3>

          {/* Summary chips */}
          <div className="flex flex-wrap gap-2 mt-2">
            {quantityCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {quantityCount} {t('planning.draftChanges.quantities', 'cantidades')}
              </span>
            )}
            {newCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {newCount} {t('planning.draftChanges.new', 'nuevo')}
              </span>
            )}
            {removedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                {removedCount} {t('planning.draftChanges.removed', 'eliminado')}
              </span>
            )}
            {urgencyCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                {urgencyCount} {t('planning.draftChanges.urgency', 'urgencia')}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={onAcceptAll}
              className="
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                bg-emerald-600/20 text-emerald-300 border border-emerald-500/30
                hover:bg-emerald-600/30 hover:text-emerald-200 hover:border-emerald-500/50
              "
            >
              {t('planning.draftChanges.acceptAll', 'Aceptar todos')}
            </button>
            <button
              onClick={onDismiss}
              className="
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                text-slate-400 hover:text-slate-200
              "
            >
              {t('planning.draftChanges.keepDraft', 'Mantener borrador')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
