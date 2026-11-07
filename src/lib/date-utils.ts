/**
 * Date and Time utilities for Addis Ababa Barbershop
 * Timezone: Africa/Addis_Ababa (East Africa Time, UTC+3, no DST)
 */

export const SHOP_TIMEZONE = "Africa/Addis_Ababa";
export const UTC_OFFSET_HOURS = 3;

/**
 * Returns the current date and time in Addis Ababa as a Date object.
 */
export function getNowInAddis(): Date {
  const now = new Date();
  // Format to Addis Ababa string and re-parse to get exact local components
  const addisString = now.toLocaleString("en-US", { timeZone: SHOP_TIMEZONE });
  return new Date(addisString);
}

/**
 * Parses "HH:mm" string into minutes from midnight (0 to 1439)
 */
export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Formats minutes from midnight into "HH:mm" 24h format
 */
export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Formats minutes from midnight into 12h display (e.g. "09:00 AM", "02:30 PM")
 */
export function minutesTo12HourString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
}

/**
 * Combines a "YYYY-MM-DD" date string and "HH:mm" time string into an ISO Date in UTC+3
 */
export function createAddisDateTime(dateStr: string, timeStr: string): Date {
  // ISO format with explicit +03:00 offset: YYYY-MM-DDTHH:mm:00+03:00
  return new Date(`${dateStr}T${timeStr}:00+03:00`);
}

/**
 * Extracts "YYYY-MM-DD" from a Date in Addis Ababa timezone
 */
export function getAddisDateString(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // outputs "YYYY-MM-DD"
}

/**
 * Gets day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday) for a "YYYY-MM-DD" string
 */
export function getDayOfWeekFromDateString(dateStr: string): number {
  // Using explicit noon in Addis Ababa to avoid any boundary shifts
  const d = new Date(`${dateStr}T12:00:00+03:00`);
  return d.getDay();
}
