import { useTranslation } from 'react-i18next';
import type { BoatProjection } from '../../requests/planning';
import { ConfidenceDots } from './ConfidenceDots';
import { formatDateShort } from '../../utils/dateUtils';

interface ProjectedBoatPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onDrillIn: (boatId: string) => void;
  boatProjection: BoatProjection;
}

export function ProjectedBoatPreview({
  isOpen,
  onClose,
  onDrillIn,
  boatProjection,
}: ProjectedBoatPreviewProps) {
  const { t, i18n } = useTranslation();

  if (!isOpen) return null;

  const urgency = boatProjection.urgency_breakdown;
  const palletsText = `~${boatProjection.projected_pallets_min}-${boatProjection.projected_pallets_max}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl max-w-lg w-full mx-4">
        {/* Projection banner */}
        <div className="bg-amber-500/15 border-b border-amber-500/30 rounded-t-2xl px-5 py-3 flex items-center gap-2">
          <span className="text-lg">{'\u{1F310}'}</span>
          <p className="text-amber-300 text-sm font-medium">
            {t('planning.previewModal.banner', 'PROYECCI\u00D3N \u2014 Datos estimados basados en velocidad actual de ventas')}
          </p>
        </div>

        {/* Boat info header */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg opacity-80">{'\u{1F310}'}</span>
              <h3 className="text-white font-semibold truncate opacity-80">
                {boatProjection.boat_name}
              </h3>
            </div>
            <div className="text-right text-sm flex-shrink-0 ml-3 opacity-80">
              <div className="text-slate-400">
                {t('planning.departs', 'Zarpa')}: <span className="text-slate-300">{formatDateShort(boatProjection.departure_date, i18n.language)}</span>
              </div>
              <div className="text-slate-500">
                {t('planning.arrives', 'Llega')}: <span className="text-slate-400">{formatDateShort(boatProjection.arrival_date, i18n.language)}</span>
              </div>
            </div>
          </div>

          {/* Confidence + pallets row */}
          <div className="flex items-center justify-between mt-3 opacity-80">
            <div className="flex items-center gap-2">
              <span className="text-sm">{'\u{1F4E6}'}</span>
              <span className="text-slate-300 text-sm font-medium">
                {palletsText} {t('common.pallets', 'paletas')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs">
                {t('planning.confidence', 'Confianza')}
              </span>
              <ConfidenceDots level={boatProjection.confidence} />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 border-t border-dashed border-slate-700/40" />

        {/* Urgency summary */}
        <div className="px-5 py-3">
          <span className="text-slate-500 text-xs font-medium block mb-2">
            {t('planning.urgency', 'Urgencia')}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {urgency.critical > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-dashed border-red-500/30 opacity-80">
                {'\u{1F534}'} {urgency.critical} {t('planning.critical', 'cr\u00EDtico')}
              </span>
            )}
            {urgency.urgent > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/15 text-orange-400 border border-dashed border-orange-500/30 opacity-80">
                {'\u{1F7E0}'} {urgency.urgent} {t('planning.urgent', 'urgente')}
              </span>
            )}
            {urgency.soon > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-dashed border-amber-500/30 opacity-80">
                {'\u{1F7E1}'} {urgency.soon} {t('planning.soon', 'pronto')}
              </span>
            )}
            {urgency.ok > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-dashed border-emerald-500/30 opacity-80">
                {'\u{1F7E2}'} {urgency.ok} {t('planning.ok', 'ok')}
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 border-t border-dashed border-slate-700/40" />

        {/* Footer: buttons */}
        <div className="px-5 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              bg-slate-800/50 text-slate-400 border border-slate-700/50
              hover:bg-slate-700/50 hover:text-slate-300
            "
          >
            {t('planning.previewModal.close', 'Cerrar')}
          </button>
          <button
            onClick={() => onDrillIn(boatProjection.boat_id)}
            className="
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              bg-indigo-600/20 text-indigo-300 border border-indigo-500/30
              hover:bg-indigo-600/30 hover:text-indigo-200 hover:border-indigo-500/50
            "
          >
            {t('planning.previewModal.goToDetail', 'Ir al Detalle \u2192')}
          </button>
        </div>
      </div>
    </div>
  );
}
