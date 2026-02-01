/**
 * Formatting utilities for consistent number display across the application.
 */

/**
 * Format m² values with 2 decimal places and locale-aware thousand separators.
 * @param value - The m² value to format (handles undefined/null safely)
 * @returns Formatted string like "1,881.60" or "0.00"
 */
export const formatM2 = (value: number | undefined | null): string => {
  return (value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
