import { useTranslation } from 'react-i18next';

interface ParseDiagnosticPanelProps {
  errorMessage: string;
  missingColumns?: string[];
  foundColumns?: string[];
  onRetry: () => void;
}

export function ParseDiagnosticPanel({
  errorMessage,
  missingColumns,
  foundColumns,
  onRetry,
}: ParseDiagnosticPanelProps) {
  const { t } = useTranslation();
  const hasDiagnostics = (missingColumns && missingColumns.length > 0) || (foundColumns && foundColumns.length > 0);

  return (
    <div className="py-6 space-y-5">
      {/* Error banner */}
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h4 className="font-medium text-red-800">
          {t('upload.formatError', 'Error de Formato')}
        </h4>
        <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
      </div>

      {/* Column diagnostic */}
      {hasDiagnostics && (
        <div className="border border-slate-700 rounded-lg overflow-hidden">
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-700">
            <h5 className="text-sm font-medium text-slate-300">
              {t('upload.columnDiagnostic', 'Diagnóstico de columnas')}
            </h5>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-700">
            {/* Missing columns */}
            {missingColumns && missingColumns.length > 0 && (
              <div className="p-4">
                <h6 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">
                  {t('upload.missingColumns', 'Columnas faltantes')}
                </h6>
                <ul className="space-y-1">
                  {missingColumns.map((col) => (
                    <li
                      key={col}
                      className="text-sm text-red-800 bg-red-50 px-2 py-1 rounded flex items-center gap-1.5"
                    >
                      <span className="text-red-500">✕</span>
                      {col}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Found columns */}
            {foundColumns && foundColumns.length > 0 && (
              <div className="p-4">
                <h6 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  {t('upload.foundColumns', 'Columnas encontradas en el archivo')}
                </h6>
                <div className="max-h-48 overflow-y-auto">
                  <ul className="space-y-1">
                    {foundColumns.map((col, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-slate-300 bg-slate-900 px-2 py-1 rounded font-mono"
                      >
                        {col}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No columns found */}
      {foundColumns && foundColumns.length === 0 && (
        <p className="text-sm text-slate-500 italic">
          {t('upload.noColumnsFound', 'No se detectaron columnas en el archivo')}
        </p>
      )}

      {/* Retry button */}
      <button
        onClick={onRetry}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        {t('common.tryAgain', 'Intentar de nuevo')}
      </button>
    </div>
  );
}
