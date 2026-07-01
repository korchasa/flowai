/** A timezone is either an IANA named zone or a fixed UTC offset. */
export interface Zone {
  /** e.g. "Europe/Paris". Absent for fixed-offset zones. */
  ianaName?: string;
  /** e.g. 300 for UTC+05:00. Always present. */
  offsetMinutes: number;
}

/** "UTC+05:00" style label. */
export function formatOffset(z: Zone): string {
  const sign = z.offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(z.offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
}

/** Canonical timezone identifier used by every downstream consumer. */
export function getTimezoneName(z: Zone): string {
  return z.ianaName as string;
}
