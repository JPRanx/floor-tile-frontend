import api from './api';

export type GapReason = 'matched' | 'zombies' | 'unknown_factory_commits';

export interface ReconciliationProduct {
  product_id: string;
  sku: string;
  factory_existencia_m2: number;
  our_committed_m2: number;
  factory_committed_m2: number;
  gap_m2: number;
  gap_reason: GapReason;
}

export interface ReconciliationSummary {
  total_products: number;
  matched: number;
  zombies: number;
  unknown_factory_commits: number;
}

export interface FactoryCommitsReconciliation {
  factory_id: string;
  snapshot_date: string | null;
  snapshot_uploaded_at: string | null;
  products: ReconciliationProduct[];
  summary: ReconciliationSummary;
}

export async function fetchFactoryCommitsReconciliation(
  factoryId: string
): Promise<FactoryCommitsReconciliation> {
  const { data } = await api.get<FactoryCommitsReconciliation>(
    `/v2/reconciliation/factory-commits/${factoryId}`
  );
  return data;
}
