import { useEffect, useState } from 'react';
import {
  fetchFactoryCommitsReconciliation,
  type FactoryCommitsReconciliation,
} from '../../requests/reconciliation';

interface Props {
  factoryId: string | null;
}

export function ReconciliationBadge({ factoryId }: Props) {
  const [data, setData] = useState<FactoryCommitsReconciliation | null>(null);

  useEffect(() => {
    if (!factoryId) return;
    let cancelled = false;
    fetchFactoryCommitsReconciliation(factoryId)
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [factoryId]);

  if (!data) return null;
  const { summary, products } = data;
  const totalGaps = summary.zombies + summary.unknown_factory_commits;
  if (totalGaps === 0) return null;

  const topThree = products
    .filter((p) => p.gap_reason !== 'matched')
    .slice(0, 3);

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-sm">
      <div className="flex items-center gap-2 text-amber-200 font-medium">
        <span>{'⚠'}</span>
        <span>
          Reconciliación con SIESA: {totalGaps} producto{totalGaps === 1 ? '' : 's'} con
          discrepancia entre nuestros pedidos y la fábrica
        </span>
      </div>
      <ul className="mt-1.5 space-y-0.5 text-xs text-amber-200/80">
        {topThree.map((p) => (
          <li key={p.product_id}>
            <span className="font-mono">{p.sku}</span>:{' '}
            {p.gap_reason === 'zombies'
              ? `tenemos ${Math.round(p.our_committed_m2).toLocaleString()} m² comprometidos, fábrica solo ${Math.round(p.factory_committed_m2).toLocaleString()} m² (posible borrador zombi)`
              : `fábrica tiene ${Math.round(p.factory_committed_m2).toLocaleString()} m² comprometidos que no rastreamos`}
          </li>
        ))}
      </ul>
    </div>
  );
}
