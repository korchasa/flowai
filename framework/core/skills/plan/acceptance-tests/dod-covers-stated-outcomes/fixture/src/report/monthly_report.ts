import { formatReportDate } from "./date_format.ts";

/** Renders the monthly report screen header. */
export function reportHeader(
  title: string,
  year: number,
  month: number,
  day: number,
): string {
  return `${title} — ${formatReportDate(year, month, day)}`;
}
