import { useTranslation } from 'react-i18next';

interface RemovedProduct {
  sku: string;
  pallets: number;
  m2: number;
}

interface RecalculateBarProps {
  removedProducts: RemovedProduct[];
  freedCapacity: {
    m2: number;
    pallets: number;
    containers: number;
  };
  onRecalculate: () => void;
  onRestore: (sku: string) => void;
  isRecalculating: boolean;
}

export function RecalculateBar({
  removedProducts,
  freedCapacity,
  onRecalculate,
  onRestore,
  isRecalculating,
}: RecalculateBarProps) {
  const { t } = useTranslation();

  if (removedProducts.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/50 rounded-xl p-4 backdrop-blur-xl">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-lg">🔄</span>
            <div>
              <h3 className="text-amber-300 font-semibold">
                {t('orderBuilder.productsRemoved', '{{count}} products removed', {
                  count: removedProducts.length,
                })}
              </h3>
              <p className="text-amber-400/80 text-sm">
                {freedCapacity.m2.toLocaleString()} m² {t('orderBuilder.capacityFreed', 'capacity freed')}
                {freedCapacity.containers > 0 && (
                  <span className="ml-1">
                    ({freedCapacity.containers} {t('common.containers', 'containers')})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Recalculate Button */}
          <button
            onClick={onRecalculate}
            disabled={isRecalculating}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {isRecalculating ? (
              <>
                <span className="animate-spin">⏳</span>
                {t('orderBuilder.recalculating', 'Recalculating...')}
              </>
            ) : (
              <>
                <span>🔄</span>
                {t('orderBuilder.recalculateOptimal', 'Recalculate Optimal Order')}
              </>
            )}
          </button>
        </div>

        {/* Removed Products List */}
        <div className="flex flex-wrap gap-2">
          {removedProducts.map((product) => (
            <div
              key={product.sku}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50"
            >
              <span className="text-slate-400 text-sm line-through">{product.sku}</span>
              <span className="text-slate-500 text-xs">
                ({product.pallets}p)
              </span>
              <button
                onClick={() => onRestore(product.sku)}
                className="text-amber-400 hover:text-amber-300 text-xs font-medium transition-colors"
                title={t('orderBuilder.restore', 'Restore')}
              >
                ↩ {t('orderBuilder.restore', 'Restore')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
