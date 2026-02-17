import type { DraftItem } from '../requests/drafts';

export interface DraftChange {
  type: 'quantity_changed' | 'new_product' | 'removed_product' | 'urgency_changed';
  productId: string;
  sku: string;
  draftValue?: number;
  currentValue?: number;
  oldUrgency?: string;
  newUrgency?: string;
}

export interface ProductRecommendation {
  product_id: string;
  sku: string;
  suggested_pallets: number;
  urgency: string;
}

/**
 * Computes the diff between a user's saved draft selections and
 * the system's current product recommendations.
 *
 * Returns an array of DraftChange objects describing what changed.
 */
export function computeDraftDiff(
  draftItems: DraftItem[],
  currentProducts: ProductRecommendation[]
): DraftChange[] {
  const changes: DraftChange[] = [];

  // Index current products by product_id for O(1) lookups
  const currentByProductId = new Map<string, ProductRecommendation>();
  for (const product of currentProducts) {
    currentByProductId.set(product.product_id, product);
  }

  // Index draft items by product_id for reverse lookup
  const draftByProductId = new Set<string>();
  for (const item of draftItems) {
    draftByProductId.add(item.product_id);
  }

  // Check each draft item against current recommendations
  for (const item of draftItems) {
    const current = currentByProductId.get(item.product_id);

    if (!current) {
      // Product was in draft but is no longer recommended
      changes.push({
        type: 'removed_product',
        productId: item.product_id,
        sku: item.product_id, // fallback; caller may enrich with real SKU
        draftValue: item.selected_pallets,
      });
      continue;
    }

    // Quantity changed by more than 1 pallet
    const palletDiff = Math.abs(item.selected_pallets - current.suggested_pallets);
    if (palletDiff > 1) {
      changes.push({
        type: 'quantity_changed',
        productId: item.product_id,
        sku: current.sku,
        draftValue: item.selected_pallets,
        currentValue: current.suggested_pallets,
      });
    }

    // Note: urgency changes are detected separately below since
    // we need the previous urgency stored in draft metadata.
    // For now, we cannot detect urgency changes from DraftItem alone
    // because DraftItem does not store urgency. The caller should
    // provide old urgency via a separate mechanism if needed.
  }

  // Products in current recommendations but not in draft -> new_product
  // Only flag HIGH_PRIORITY products (urgency-based filter)
  for (const product of currentProducts) {
    if (!draftByProductId.has(product.product_id)) {
      if (product.urgency === 'HIGH_PRIORITY') {
        changes.push({
          type: 'new_product',
          productId: product.product_id,
          sku: product.sku,
          currentValue: product.suggested_pallets,
        });
      }
    }
  }

  return changes;
}

/**
 * Overload that also detects urgency changes when old urgency data is available.
 * Pass a map of product_id -> old urgency string from the draft's metadata.
 */
export function computeDraftDiffWithUrgency(
  draftItems: DraftItem[],
  currentProducts: ProductRecommendation[],
  oldUrgencyMap: Map<string, string>
): DraftChange[] {
  const baseChanges = computeDraftDiff(draftItems, currentProducts);

  // Index current products for urgency comparison
  const currentByProductId = new Map<string, ProductRecommendation>();
  for (const product of currentProducts) {
    currentByProductId.set(product.product_id, product);
  }

  // Check urgency changes for items that are in both draft and current
  for (const item of draftItems) {
    const current = currentByProductId.get(item.product_id);
    const oldUrgency = oldUrgencyMap.get(item.product_id);

    if (current && oldUrgency && oldUrgency !== current.urgency) {
      baseChanges.push({
        type: 'urgency_changed',
        productId: item.product_id,
        sku: current.sku,
        oldUrgency,
        newUrgency: current.urgency,
      });
    }
  }

  return baseChanges;
}
