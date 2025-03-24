/**
 * Time utilities for consistent timestamp formatting
 * Provides functions to format timestamps with proper time zone information
 */

/**
 * Format a timestamp with various time representations
 * @param timestamp - The timestamp to format (number, string, or Date)
 * @returns An object with different time format representations
 */
export function formatTimestamps(timestamp: number | string | Date) {
  const date = new Date(timestamp);
  return {
    utc: date.toISOString(),
    local: date.toString(),
    localTime: date.toLocaleTimeString(),
    localDate: date.toLocaleDateString(),
    timeZoneName: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

/**
 * Format a timestamp as a human-readable string with time zone information
 * @param timestamp - The timestamp to format (number, string, or Date)
 * @returns A human-readable string with time zone information
 */
export function formatHumanReadable(timestamp: number | string | Date) {
  const date = new Date(timestamp);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `${date.toLocaleString()} (${timeZone})`;
}

/**
 * Get the current time in various formats
 * @returns An object with the current time in various formats
 */
export function getCurrentTime() {
  return formatTimestamps(Date.now());
}

/**
 * Calculate the time difference between two timestamps in a human-readable format
 * @param timestamp1 - The first timestamp
 * @param timestamp2 - The second timestamp (defaults to current time)
 * @returns A human-readable string representing the time difference
 */
export function getTimeDifference(timestamp1: number | string | Date, timestamp2?: number | string | Date) {
  const date1 = new Date(timestamp1);
  const date2 = timestamp2 ? new Date(timestamp2) : new Date();
  
  const diffMs = Math.abs(date2.getTime() - date1.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''}`;
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''}`;
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''}`;
  } else {
    return `${diffSec} second${diffSec !== 1 ? 's' : ''}`;
  }
}
