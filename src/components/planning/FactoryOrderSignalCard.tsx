import { useTranslation } from 'react-i18next';
import type { FactoryOrderSignal } from '../../requests/planning';

interface FactoryOrderSignalCardProps {
  signal: FactoryOrderSignal;
  lang: string;
}

function formatSignalDate(dateStr: string, lang: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(lang === 'es' ? 'es-CO' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}

export function FactoryOrderSignalCard({ signal: sig, lang }: FactoryOrderSignalCardProps) {
  const { t } = useTranslation();
  const st = sig.signal_type;

  // Card color: amber for actionable/in-progress, red for critical, slate for calm
  const cardClass = sig.is_overdue
    ? (st === 'in_production' || st === 'order_today')
      ? 'bg-amber-500/10 border-amber-500/30'
      : 'bg-red-500/10 border-red-500/30'
    : (sig.days_until_order != null && sig.days_until_order <= 14)
      ? 'bg-amber-500/10 border-amber-500/30'
      : 'bg-slate-800/30 border-slate-700/50';

  // Text color
  const textClass = sig.is_overdue
    ? (st === 'in_production' || st === 'order_today') ? 'text-amber-300' : 'text-red-300'
    : (sig.days_until_order != null && sig.days_until_order <= 14) ? 'text-amber-300' : 'text-slate-300';

  // Icon: factory for in_production/on_track, warning for critical
  const icon = (!sig.is_overdue || st === 'in_production') ? '\u{1F3ED}' : '\u26A0\uFE0F';

  // Boat suffix helper
  const boatSuffix = sig.target_boat_name ? (
    <span className="ml-1">
      {' '}{sig.target_boat_name}
      {sig.target_boat_departure && (
        <span className="opacity-70 ml-1">
          ({formatSignalDate(sig.target_boat_departure, lang)})
        </span>
      )}
    </span>
  ) : null;

  // Title line based on signal type
  let titleContent;
  if (!sig.is_overdue) {
    titleContent = (
      <>
        {t('planning.factorySignal.title', 'Próximo pedido fábrica')}
        {sig.next_order_date && (
          <>
            {': '}
            {formatSignalDate(sig.next_order_date, lang)}
            {sig.days_until_order != null && (
              <span className="ml-1 opacity-70">({sig.days_until_order}d)</span>
            )}
            {boatSuffix && <>{' — '}{t('planning.factorySignal.for', 'para')}{boatSuffix}</>}
          </>
        )}
      </>
    );
  } else {
    switch (st) {
      case 'in_production':
        titleContent = (
          <>
            {t('planning.factorySignal.inProduction', 'En producción')}
            {sig.limiting_production_delivery && (
              <>
                {' — '}
                {t('planning.factorySignal.estDelivery', 'entrega est.')}
                {' '}
                {formatSignalDate(sig.limiting_production_delivery, lang)}
              </>
            )}
            {boatSuffix && <>{' — '}{t('planning.factorySignal.for', 'para')}{boatSuffix}</>}
          </>
        );
        break;
      case 'production_delayed':
        titleContent = (
          <>
            {t('planning.factorySignal.productionDelayed', 'Producción retrasada')}
            {sig.target_boat_name && (
              <>
                {' — '}
                {t('planning.factorySignal.wontMake', 'no alcanza')}
                {' '}{sig.target_boat_name}
              </>
            )}
          </>
        );
        break;
      case 'order_today':
        titleContent = (
          <>
            {t('planning.factorySignal.orderToday', 'Ordena hoy')}
            {sig.target_boat_name && (
              <>
                {' — '}
                {t('planning.factorySignal.canMake', 'alcanza')}
                {boatSuffix}
              </>
            )}
          </>
        );
        break;
      case 'no_production':
        titleContent = (
          <>
            {t('planning.factorySignal.noProduction', 'No alcanza producción')}
            {sig.target_boat_name && (
              <>
                {' — '}
                {t('planning.factorySignal.nextBoat', 'próximo barco')}:{boatSuffix}
              </>
            )}
          </>
        );
        break;
      default:
        titleContent = (
          <>
            {t('planning.factorySignal.overdue', 'Pedido fábrica vencido')}
            {sig.next_order_date && (
              <>
                {': '}
                {formatSignalDate(sig.next_order_date, lang)}
                {sig.days_until_order != null && (
                  <span className="ml-1 opacity-70">({sig.days_until_order}d)</span>
                )}
              </>
            )}
          </>
        );
    }
  }

  return (
    <div className={`rounded-xl border px-5 py-3 flex items-center justify-between ${cardClass}`}>
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <div>
          <div className={`text-sm font-medium ${textClass}`}>
            {titleContent}
          </div>
          {sig.limiting_product_sku && (
            <div className="text-xs text-slate-500 mt-0.5">
              {t('planning.factorySignal.limitedBy', 'Limitado por')}: {sig.limiting_product_sku}
              {sig.effective_coverage_days != null && (
                <span className="ml-2">
                  ({sig.effective_coverage_days}d {t('planning.factorySignal.coverage', 'cobertura')})
                </span>
              )}
            </div>
          )}
          {(sig.product_count != null && sig.product_count > 0) && (
            <div className="text-xs text-slate-500 mt-0.5">
              ~{sig.estimated_pallets} paletas, {sig.product_count} productos
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
