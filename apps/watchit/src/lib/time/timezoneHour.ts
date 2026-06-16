/** Returns the hour-of-day (0-23) for `date` as observed in `timezone`. */
export function getHourInTimezone(date: Date, timezone: string): number {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  }).format(date);

  // Intl can format midnight as "24" depending on locale/runtime.
  return Number(formatted) % 24;
}
