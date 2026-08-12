/** Renders the same monthly report as CSV. */
export function exportCsv(rows: string[][], title: string): string {
  const header = title.length > 40 ? title.slice(0, 40) + "..." : title;
  return [header, ...rows.map((r) => r.join(","))].join("\n");
}
