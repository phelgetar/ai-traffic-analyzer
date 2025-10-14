export const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 5) {
    return "just now";
  }

  let interval = seconds / 31536000;
  if (interval > 1) {
    const years = Math.floor(interval);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    const months = Math.floor(interval);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  interval = seconds / 86400;
  if (interval > 1) {
    const days = Math.floor(interval);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  interval = seconds / 3600;
  if (interval > 1) {
    const hours = Math.floor(interval);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  interval = seconds / 60;
  if (interval > 1) {
    const minutes = Math.floor(interval);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  return Math.floor(seconds) + " seconds ago";
};

/**
 * Formats a date string into a more readable format, including both the absolute date/time
 * and a relative "time ago" string.
 * Example: "Jul 29, 2024, 5:45 PM (2 hours ago)"
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);
    return `${formattedDate} (${getTimeAgo(dateString)})`;
  } catch (e) {
    return dateString; // Fallback to original string if date is invalid
  }
};

/**
 * Calculates and formats the remaining time until a future date string.
 * @param dateString The future date (e.g., estimated clearance time).
 * @returns A human-readable string like "in 2h 15m" or "Cleared".
 */
export const formatRemainingTime = (dateString: string): string | null => {
    if (!dateString) return null;
    const endDate = new Date(dateString);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();

    if (diff <= 0) return "Cleared";

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 1) return `in ${days} days`;
    if (days === 1) return `in ${days} day ${hours % 24}h`;
    if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `in ${minutes}m`;
    
    return "soon";
};

/**
 * A robust function to format a date string into a MySQL-compatible DATETIME format.
 * Handles various input formats and returns null for invalid dates.
 * @param dateInput - The date string or number from the API.
 * @returns A formatted string 'YYYY-MM-DD HH:MM:SS' or null.
 */
// FIX: Updated `dateInput` type to include `Date` to resolve a type error in `services/importer.ts` when passing `new Date()`.
export const toMySqlDateTime = (dateInput: string | number | Date | null | undefined): string | null => {
    if (dateInput == null) return null;
    // Handles ISO strings from APIs and millisecond timestamps from GeoJSON
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return null; // Invalid date
    return date.toISOString().slice(0, 19).replace('T', ' ');
};