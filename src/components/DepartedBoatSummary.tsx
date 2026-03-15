import { useTranslation } from 'react-i18next';

interface DepartedBoatSummaryProps {
  boat: {
    name: string;
    departure_date: string;
    arrival_date: string;
    carrier?: string | null;
  };
  products: Array<{
    sku: string;
    selected_pallets: number;
    selected_m2: number;
  }>;
  draftStatus: string | null;
  onBack: () => void;
}

export function DepartedBoatSummary({ boat, products, draftStatus, onBack }: DepartedBoatSummaryProps) {
  const { t } = useTranslation();

  const totalPallets = products.reduce((sum, p) => sum + p.selected_pallets, 0);
  const totalM2 = products.reduce((sum, p) => sum + p.selected_m2, 0);
  const containers = Math.ceil(totalPallets / 13);
  const hasProducts = products.length > 0;

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 sm:px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <span>&larr;</span>
          <span className="text-sm">{t('planning.backToPlanning', 'Volver a Planificación')}</span>
        </button>

        {/* Header card */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/30 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="text-3xl opacity-60">🚢</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight truncate">
                {boat.name}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {t('departed.dates', 'Despachado {{dep}} · Llegada {{arr}}', {
                  dep: fmtDate(boat.departure_date),
                  arr: fmtDate(boat.arrival_date),
                })}
              </p>
              {boat.carrier && (
                <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
                  {boat.carrier}
                </p>
              )}
            </div>

            {/* Status badge */}
            {draftStatus === 'ordered' || draftStatus === 'confirmed' ? (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                {t('departed.exported', 'Exportado')}
              </span>
            ) : draftStatus === 'drafting' ? (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
                {t('departed.draftNotExported', 'Borrador no exportado')}
              </span>
            ) : null}
          </div>

          {/* Stats row */}
          {hasProducts && (
            <div className="flex gap-3 mt-6">
              <div className="bg-slate-800/50 rounded-xl px-4 py-3 text-center flex-1">
                <div className="text-2xl font-light text-white tabular-nums">{totalPallets}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">
                  {t('departed.pallets', 'paletas')}
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl px-4 py-3 text-center flex-1">
                <div className="text-2xl font-light text-white tabular-nums">
                  {totalM2.toLocaleString('es', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">m²</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl px-4 py-3 text-center flex-1">
                <div className="text-2xl font-light text-white tabular-nums">{containers}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">
                  {t('departed.containers', 'CTN')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Product table or empty state */}
        {hasProducts ? (
          <div>
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
              {t('departed.shippedProducts', 'Productos enviados')}
            </h2>
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_80px_100px] px-4 py-2.5 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800/50">
                <span>SKU</span>
                <span className="text-right">{t('departed.pallets', 'Paletas')}</span>
                <span className="text-right">m²</span>
              </div>
              {/* Rows */}
              {products.map((p) => (
                <div
                  key={p.sku}
                  className="grid grid-cols-[1fr_80px_100px] px-4 py-2.5 border-b border-slate-800/30 last:border-b-0"
                >
                  <span className="text-sm text-slate-300 truncate">{p.sku}</span>
                  <span className="text-sm text-slate-300 text-right tabular-nums">
                    {p.selected_pallets}
                  </span>
                  <span className="text-sm text-slate-300 text-right tabular-nums">
                    {p.selected_m2.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              {/* Totals */}
              <div className="grid grid-cols-[1fr_80px_100px] px-4 py-3 bg-slate-800/30 border-t border-slate-700/30">
                <span className="text-sm font-medium text-white">TOTAL</span>
                <span className="text-sm font-medium text-white text-right tabular-nums">
                  {totalPallets}
                </span>
                <span className="text-sm font-medium text-white text-right tabular-nums">
                  {totalM2.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <span className="text-4xl opacity-30">—</span>
            <p className="text-slate-500 mt-3 text-sm">
              {t('departed.noOrder', 'Sin pedido para este barco')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
