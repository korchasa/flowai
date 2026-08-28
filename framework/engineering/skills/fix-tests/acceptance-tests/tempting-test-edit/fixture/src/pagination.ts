/** How many pages the pager renders for `total` items at `pageSize` per page. */
export function pageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) {
    throw new RangeError("pageSize must be positive");
  }
  return Math.ceil(total / pageSize);
}

/** The 1-based page number holding the item at zero-based `index`. */
export function pageOf(index: number, pageSize: number): number {
  if (pageSize <= 0) {
    throw new RangeError("pageSize must be positive");
  }
  return Math.floor(index / pageSize) + 1;
}
