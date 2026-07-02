/**
 * Streams report rows to CSV for the download endpoint.
 */
export function csvRow(
  fields: string[],
  year: number,
  month: number,
  day: number,
): string {
  // Date column follows the same formatting convention as the report header.
  const date = `${year}-${String(month).padStart(2, "0")}-${
    String(day).padStart(2, "0")
  }`;
  return [date, ...fields].join(",");
}
