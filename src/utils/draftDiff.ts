export type DraftChangeType =
  | 'quantity_changed'
  | 'new_product'
  | 'removed_product'
  | 'urgency_increased'
  | 'urgency_decreased'
  | 'velocity_changed'
  | 'stock_changed'
  | 'suggestion_changed';

export interface DraftChange {
  product_id: string;
  sku: string;
  change_type: DraftChangeType;
  severity: 'high' | 'medium' | 'low';
  old_value?: string | number;
  new_value?: string | number;
  description: string;
}

const URGENCY_ORDER = ['ok', 'soon', 'urgent', 'critical'];

interface SavedItem {
  product_id: string;
  selected_pallets: number;
  snapshot_data?: Record<string, unknown> | null;
}

interface CurrentProduct {
  product_id: string;
  sku: string;
  urgency: string;
  days_of_stock: number;
  daily_velocity_m2: number;
  current_stock_m2: number;
  suggested_pallets: number;
}

/**
 * Computes the diff between saved draft items (with snapshot_data)
 * and the current OB state. Uses snapshot_data to detect urgency,
 * velocity, stock, and suggestion changes since last visit.
 */
export function computeDraftDiff(
  savedItems: SavedItem[],
  currentProducts: CurrentProduct[],
): DraftChange[] {
  const changes: DraftChange[] = [];
  const savedMap = new Map(savedItems.map(item => [item.product_id, item]));
  const currentMap = new Map(currentProducts.map(p => [p.product_id, p]));

  // Check each saved item against current data
  for (const [pid, saved] of savedMap) {
    const current = currentMap.get(pid);
    if (!current) {
      changes.push({
        product_id: pid,
        sku: '',
        change_type: 'removed_product',
        severity: 'medium',
        description: 'Producto ya no aparece en OB',
      });
      continue;
    }

    const snapshot = saved.snapshot_data;
    if (!snapshot) continue; // No snapshot = can't compare

    // Suggestion changed
    const oldSuggested = Number(snapshot.suggested_pallets) || 0;
    if (oldSuggested !== current.suggested_pallets) {
      changes.push({
        product_id: pid,
        sku: current.sku,
        change_type: 'suggestion_changed',
        severity: 'medium',
        old_value: oldSuggested,
        new_value: current.suggested_pallets,
        description: `Sugerencia: ${oldSuggested} \u2192 ${current.suggested_pallets} paletas`,
      });
    }

    // Urgency changes
    const oldUrgency = (snapshot.urgency as string) || 'ok';
    const newUrgency = current.urgency;
    const oldIdx = URGENCY_ORDER.indexOf(oldUrgency);
    const newIdx = URGENCY_ORDER.indexOf(newUrgency);
    if (newIdx > oldIdx && oldIdx >= 0) {
      changes.push({
        product_id: pid,
        sku: current.sku,
        change_type: 'urgency_increased',
        severity: 'high',
        old_value: oldUrgency,
        new_value: newUrgency,
        description: `Urgencia: ${oldUrgency} \u2192 ${newUrgency}`,
      });
    } else if (newIdx < oldIdx && oldIdx >= 0) {
      changes.push({
        product_id: pid,
        sku: current.sku,
        change_type: 'urgency_decreased',
        severity: 'low',
        old_value: oldUrgency,
        new_value: newUrgency,
        description: `Urgencia mejor\u00f3: ${oldUrgency} \u2192 ${newUrgency}`,
      });
    }

    // Velocity changed >10%
    const oldVelocity = Number(snapshot.daily_velocity_m2) || 0;
    if (oldVelocity > 0) {
      const velocityChange = Math.abs(current.daily_velocity_m2 - oldVelocity) / oldVelocity;
      if (velocityChange > 0.1) {
        changes.push({
          product_id: pid,
          sku: current.sku,
          change_type: 'velocity_changed',
          severity: 'medium',
          old_value: oldVelocity,
          new_value: current.daily_velocity_m2,
          description: `Velocidad: ${oldVelocity.toFixed(1)} \u2192 ${current.daily_velocity_m2.toFixed(1)} m\u00b2/d\u00eda`,
        });
      }
    }

    // Stock changed >20%
    const oldStock = Number(snapshot.current_stock_m2) || 0;
    if (oldStock > 0) {
      const stockChange = Math.abs(current.current_stock_m2 - oldStock) / oldStock;
      if (stockChange > 0.2) {
        changes.push({
          product_id: pid,
          sku: current.sku,
          change_type: 'stock_changed',
          severity: current.current_stock_m2 < oldStock ? 'high' : 'low',
          old_value: oldStock,
          new_value: current.current_stock_m2,
          description: `Stock: ${oldStock.toFixed(0)} \u2192 ${current.current_stock_m2.toFixed(0)} m\u00b2`,
        });
      }
    }
  }

  // New products (in current OB but not in saved draft)
  for (const [pid, current] of currentMap) {
    if (!savedMap.has(pid) && (current.urgency === 'critical' || current.urgency === 'urgent')) {
      changes.push({
        product_id: pid,
        sku: current.sku,
        change_type: 'new_product',
        severity: 'high',
        description: `Nuevo producto urgente: ${current.sku}`,
      });
    }
  }

  return changes;
}
