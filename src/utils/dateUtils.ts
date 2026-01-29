/**
 * Date utility functions for timezone-safe date handling.
 *
 * IMPORTANT: Date strings from the API (e.g., "2026-02-19") represent calendar dates,
 * NOT specific moments in time. When JavaScript parses these with new Date(), it
 * interprets them as UTC midnight, causing timezone offset issues:
 *
 *   new Date("2026-02-19") → Feb 19 at 00:00 UTC
 *   In Panama (UTC-5): Feb 18 at 19:00 local → displays as Feb 18 ❌
 *   In Spain (UTC+1): Feb 19 at 01:00 local → displays as Feb 19 ✓
 *
 * These utilities ensure dates display correctly regardless of user timezone.
 */

/**
 * Format a date string for display, preserving the original date regardless of timezone.
 * Use this for all API date fields (departure_date, arrival_date, etc.)
 *
 * @param dateString - ISO date string (e.g., "2026-02-19")
 * @param locale - Locale for formatting (e.g., "en-US", "es-ES")
 * @param options - Intl.DateTimeFormat options (without timeZone)
 * @returns Formatted date string
 */
export function formatDateUTC(
  dateString: string | null | undefined,
  locale: string = 'en-US',
  options: Omit<Intl.DateTimeFormatOptions, 'timeZone'> = { month: 'short', day: 'numeric' }
): string {
  if (!dateString) return '—';

  try {
    const date = new Date(dateString);
    // Force UTC timezone to prevent local timezone offset
    return date.toLocaleDateString(locale, { ...options, timeZone: 'UTC' });
  } catch {
    return dateString;
  }
}

/**
 * Format a date string with year included.
 *
 * @param dateString - ISO date string
 * @param locale - Locale for formatting
 * @returns Formatted date string with year
 */
export function formatDateWithYear(
  dateString: string | null | undefined,
  locale: string = 'en-US'
): string {
  return formatDateUTC(dateString, locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Parse a date string into a Date object for local date comparison.
 * This creates a Date at LOCAL midnight, not UTC midnight.
 *
 * Use this when comparing dates (e.g., checking if a date has passed).
 *
 * @param dateString - ISO date string (e.g., "2026-02-19")
 * @returns Date object at local midnight
 */
export function parseDateLocal(dateString: string): Date {
  // Split the date string and create a local date
  // This avoids the UTC interpretation issue
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get today's date at local midnight for comparison.
 *
 * @returns Date object at local midnight today
 */
export function getTodayLocal(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Check if a date string represents a date in the past.
 *
 * @param dateString - ISO date string
 * @returns true if the date is before today
 */
export function isDatePast(dateString: string): boolean {
  const date = parseDateLocal(dateString);
  const today = getTodayLocal();
  return date < today;
}

/**
 * Check if a date string represents today.
 *
 * @param dateString - ISO date string
 * @returns true if the date is today
 */
export function isDateToday(dateString: string): boolean {
  const date = parseDateLocal(dateString);
  const today = getTodayLocal();
  return date.getTime() === today.getTime();
}
