import { useTranslation } from 'react-i18next';

interface DataSourceChange {
  source: string;
  label: string;
}

interface DraftChangeBannerProps {
  /** Data sources that were updated after the draft was saved */
  changedSources: DataSourceChange[];
  /** How many days old the draft is (for the "old draft" reminder) */
  draftAgeDays: number;
  onAcceptAll: () => void;
  onDismiss: () => void;
}

export function DraftChangeBanner({ changedSources, draftAgeDays, onAcceptAll, onDismiss }: DraftChangeBannerProps) {
  const { t } = useTranslation();

  // Case 1: New data uploaded since draft was saved
  if (changedSources.length > 0) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0 mt-0.5">{'\u26A0\uFE0F'}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-amber-200 font-semibold text-sm">
              {t('planning.draftChanges.newData', 'Datos nuevos desde tu último borrador')}
            </h3>

            <div className="flex flex-wrap gap-2 mt-2">
              {changedSources.map(s => (
                <span
                  key={s.source}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30"
                >
                  {s.label}
                </span>
              ))}
            </div>

            <p className="text-xs text-slate-400 mt-2">
              {t(
                'planning.draftChanges.newDataHint',
                'Las recomendaciones pueden haber cambiado. Revisa y acepta o mantén tu selección.',
              )}
            </p>

            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={onAcceptAll}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 hover:text-emerald-200 hover:border-emerald-500/50"
              >
                {t('planning.draftChanges.acceptAll', 'Aceptar sugerido')}
              </button>
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 text-slate-400 hover:text-slate-200"
              >
                {t('planning.draftChanges.keepDraft', 'Mantener borrador')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: No new data, but draft is old (>7 days)
  if (draftAgeDays >= 7) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex-shrink-0">{'\uD83D\uDCC4'}</span>
          <span>
            {t('planning.draftChanges.oldDraft', 'Borrador guardado hace {{days}} días', {
              days: draftAgeDays,
            })}
          </span>
        </div>
      </div>
    );
  }

  // Case 3: No new data and draft is recent — show nothing
  return null;
}
