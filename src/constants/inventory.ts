/**
 * Inventory constants — mirrors backend/config/shipping.py
 *
 * These are physical constants from factory specifications.
 * DO NOT change without updating backend values.
 *
 * @see backend/config/shipping.py for canonical definitions
 */

// =============================================================================
// PALLET CONSTANTS
// =============================================================================

/** Standard m² per pallet (factory pallet dimensions) */
export const M2_PER_PALLET = 134.4;

/** Weight per m² for 51x51 format tiles (kg/m²) */
export const WEIGHT_PER_M2_KG = 14.90;

/** Derived: Weight per pallet at standard density (kg) */
export const WEIGHT_PER_PALLET_KG = M2_PER_PALLET * WEIGHT_PER_M2_KG; // 2002.56 kg

// =============================================================================
// CONTAINER CONSTANTS
// =============================================================================

/** Maximum weight per 20ft container (kg) */
export const CONTAINER_MAX_WEIGHT_KG = 27500;

/** Physical pallet limit per 20ft container */
export const CONTAINER_MAX_PALLETS = 14;

/** Maximum pallets by weight (weight is limiting factor) */
export const MAX_PALLETS_BY_WEIGHT = CONTAINER_MAX_WEIGHT_KG / WEIGHT_PER_PALLET_KG; // ~13.73

// =============================================================================
// WAREHOUSE CONSTANTS
// =============================================================================

/** Maximum pallet capacity in warehouse (Guatemala) */
export const WAREHOUSE_MAX_PALLETS = 672;

/** Maximum m² capacity in warehouse (Guatemala: 90,316.80 m²) */
export const WAREHOUSE_MAX_M2 = WAREHOUSE_MAX_PALLETS * M2_PER_PALLET; // 90,316.8 m²

// =============================================================================
// CONVERSION HELPERS
// =============================================================================

/**
 * Convert pallets to m²
 */
export function palletsToM2(pallets: number): number {
  return pallets * M2_PER_PALLET;
}

/**
 * Convert m² to complete pallets (FLOOR - only full pallets)
 */
export function m2ToPallets(m2: number): number {
  return Math.floor(m2 / M2_PER_PALLET);
}

/**
 * Calculate weight from m²
 */
export function m2ToWeight(m2: number): number {
  return m2 * WEIGHT_PER_M2_KG;
}

/**
 * Calculate weight from pallets
 */
export function palletsToWeight(pallets: number): number {
  return pallets * WEIGHT_PER_PALLET_KG;
}
