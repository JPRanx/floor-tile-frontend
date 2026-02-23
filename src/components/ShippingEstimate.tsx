import { useTranslation } from 'react-i18next';
import type { ShippingCostConfig } from '../requests/orderBuilder';

interface ShippingEstimateProps {
  totalM2: number;
  costConfig: ShippingCostConfig;
  numBLs: number;
}

export function ShippingEstimate({ totalM2, costConfig, numBLs }: ShippingEstimateProps) {
  const { t } = useTranslation();

  if (totalM2 <= 0) {
    return (
      <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            {'\u{1F4B0}'}
          </span>
          {t('shippingEstimate.title', 'Estimado de Envío')}
        </h3>
        <p className="text-slate-500 text-sm">{t('shippingEstimate.selectProducts', 'Selecciona productos para ver el estimado de costos')}</p>
      </div>
    );
  }

  const m2PerContainer = costConfig.m2_per_container;
  const containersNeeded = Math.ceil(totalM2 / m2PerContainer);

  // Fill analysis
  const lastContainerM2 = totalM2 % m2PerContainer || m2PerContainer;
  const lastContainerFill = lastContainerM2 / m2PerContainer;
  const m2ToFill = lastContainerFill < 1 ? Math.round(m2PerContainer - lastContainerM2) : 0;

  // Cost calculation
  const containerCost = containersNeeded * costConfig.per_container_total_usd;
  const blCost = numBLs * costConfig.bl_fixed_costs_usd;
  const totalCost = containerCost + blCost;
  const overheadPerM2 = totalCost / totalM2;

  // What overhead would be if last container was full
  const filledTotalM2 = totalM2 + m2ToFill;
  const filledOverheadPerM2 = m2ToFill > 0 ? totalCost / filledTotalM2 : overheadPerM2;
  const savingsPerM2 = overheadPerM2 - filledOverheadPerM2;

  // Container fill status
  const getContainerStatus = () => {
    if (lastContainerFill >= 0.9 || m2ToFill === 0) {
      return { color: 'emerald', label: t('shippingEstimate.wellUtilized', 'Contenedores bien utilizados'), icon: '✅' };
    }
    if (lastContainerFill >= 0.7) {
      return { color: 'amber', label: t('shippingEstimate.partialFill', 'Parcialmente lleno'), icon: '⚠️' };
    }
    return { color: 'red', label: t('shippingEstimate.lowFill', 'Desperdicio significativo'), icon: '🔴' };
  };

  const status = getContainerStatus();
  const fullContainers = m2ToFill > 0 ? containersNeeded - 1 : containersNeeded;

  return (
    <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5 shadow-xl">
      {/* Header */}
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          💰
        </span>
        {t('shippingEstimate.title', 'Estimado de Envío')}
      </h3>

      <div className="space-y-4">
        {/* Container count + fill */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">{t('shippingEstimate.containers', 'Contenedores')}</span>
          <span className="text-white font-semibold">
            {containersNeeded}
            {m2ToFill > 0 && (
              <span className="text-slate-500 text-sm ml-1">
                ({fullContainers} {t('shippingEstimate.full', 'llenos')}, 1 {t('shippingEstimate.at', 'al')} {Math.round(lastContainerFill * 100)}%)
              </span>
            )}
          </span>
        </div>

        {/* Cost breakdown */}
        <div className="bg-slate-900/50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">{t('shippingEstimate.containerCosts', 'Costo contenedores')} ({containersNeeded} × ${costConfig.per_container_total_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
            <span className="text-slate-300">${containerCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">{t('shippingEstimate.blCosts', 'Costo BLs')} ({numBLs} × ${costConfig.bl_fixed_costs_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
            <span className="text-slate-300">${blCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-slate-700/50">
            <span className="text-white font-medium">{t('shippingEstimate.totalCost', 'Costo total estimado')}</span>
            <span className="text-white font-bold text-lg">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Overhead per m² — the key metric */}
        <div className="flex items-center justify-between bg-indigo-500/10 rounded-xl px-4 py-3">
          <span className="text-indigo-300 text-sm font-medium">{t('shippingEstimate.overheadPerM2', 'Sobrecosto por m²')}</span>
          <span className="text-2xl font-bold text-indigo-200">${overheadPerM2.toFixed(2)}/m²</span>
        </div>

        {/* Container fill warning */}
        {m2ToFill > 0 && lastContainerFill < 0.9 && (
          <div className={`rounded-xl px-4 py-3 ${
            status.color === 'amber' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <div className="flex items-start gap-2">
              <span className="text-lg">{status.icon}</span>
              <div>
                <p className={`text-sm font-medium ${
                  status.color === 'amber' ? 'text-amber-300' : 'text-red-300'
                }`}>
                  {t('shippingEstimate.containerPartial', 'Contenedor {{num}} está al {{pct}}%', {
                    num: containersNeeded,
                    pct: Math.round(lastContainerFill * 100),
                  })}
                </p>
                <p className={`text-xs mt-1 ${
                  status.color === 'amber' ? 'text-amber-400/70' : 'text-red-400/70'
                }`}>
                  {t('shippingEstimate.addToOptimize', 'Agrega {{m2}} m² para llenar → reduce sobrecosto a ${{savings}}/m²', {
                    m2: m2ToFill.toLocaleString(),
                    savings: filledOverheadPerM2.toFixed(2),
                  })}
                  {savingsPerM2 > 0.01 && (
                    <span className="text-emerald-400 font-medium ml-1">
                      ({t('shippingEstimate.save', 'ahorra')} ${savingsPerM2.toFixed(2)}/m²)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Well utilized message */}
        {(lastContainerFill >= 0.9 || m2ToFill === 0) && (
          <div className="rounded-xl px-4 py-3 bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-sm text-emerald-300 flex items-center gap-2">
              ✅ {t('shippingEstimate.wellUtilized', 'Contenedores bien utilizados')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
