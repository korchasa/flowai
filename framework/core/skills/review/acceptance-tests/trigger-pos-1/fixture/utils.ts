/** Joins path segments with a single separator. */
export function joinPath(...parts: string[]): string {
  return parts.filter((p) => p.length > 0).join("/");
}
