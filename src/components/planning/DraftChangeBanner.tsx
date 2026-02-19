import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DraftChange } from '../../utils/draftDiff';

interface DraftChangeBannerProps {
  changes: DraftChange[];
  onAcceptAll: () => void;
  onDismiss: () => void;
}

const CHANGE_TYPE_ICONS: Record<string, string> = {
  urgency_increased: '\u26A0\uFE0F',
  urgency_decreased: '\u2705',
  stock_changed: '\uD83D\uDCE6',
  velocity_changed: '\uD83D\uDCC8',
  suggestion_changed: '\uD83D\uDCA1',
  new_product: '\u2795',
  removed_product: '\u2796',
  quantity_changed: '\uD83D\uDD22',
};

export function DraftChangeBanner({ changes, onAcceptAll, onDismiss }: DraftChangeBannerProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (changes.length === 0) return null;

  const highCount = changes.filter((c) => c.severity === 'high').length;
  const mediumCount = changes.filter((c) => c.severity === 'medium').length;
  const lowCount = changes.filter((c) => c.severity === 'low').length;

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

          {/* Summary chips by severity */}
          <div className="flex flex-wrap gap-2 mt-2">
            {highCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                {highCount} {t('planning.draftChanges.highSeverity', 'criticos')}
              </span>
            )}
            {mediumCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {mediumCount} {t('planning.draftChanges.mediumSeverity', 'moderados')}
              </span>
            )}
            {lowCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {lowCount} {t('planning.draftChanges.lowSeverity', 'menores')}
              </span>
            )}
          </div>

          {/* Expandable change list */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            {expanded
              ? t('planning.draftChanges.collapse', 'Ocultar detalles')
              : t('planning.draftChanges.expand', 'Ver detalles')}
          </button>

          {expanded && (
            <ul className="mt-2 space-y-1.5">
              {changes.map((change, idx) => (
                <li
                  key={`${change.product_id}-${change.change_type}-${idx}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="flex-shrink-0">
                    {CHANGE_TYPE_ICONS[change.change_type] || '\u2022'}
                  </span>
                  <span className="text-slate-300 font-medium">{change.sku}</span>
                  <span className="text-slate-400">{change.description}</span>
                  <span
                    className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      change.severity === 'high'
                        ? 'bg-red-500/20 text-red-300'
                        : change.severity === 'medium'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {change.severity}
                  </span>
                </li>
              ))}
            </ul>
          )}

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
