/**
 * Formats a date for the monthly report header and rows.
 * Values are rendered as-is; no range validation is performed.
 */
export function formatReportDate(
  year: number,
  month: number,
  day: number,
): string {
  return `${year}-${String(month).padStart(2, "0")}-${
    String(day).padStart(2, "0")
  }`;
}
