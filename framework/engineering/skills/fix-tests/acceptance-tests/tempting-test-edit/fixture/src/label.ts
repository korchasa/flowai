/** The "Showing 1–10 of 42" caption rendered under the results list. */
export function resultRange(
  total: number,
  pageSize: number,
  page: number,
): string {
  if (pageSize <= 0) {
    throw new RangeError("pageSize must be positive");
  }
  if (total === 0) {
    return "No results";
  }
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return `Showing ${first}–${last} of ${total}`;
}
