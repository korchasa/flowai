/** Format hours and minutes as a zero-padded "HH:MM" clock string. */
export function formatClock(hours: number, minutes: number): string {
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${hh}:${mm}`;
}
