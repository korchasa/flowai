/** Turn a title into a URL slug: lowercase, words joined by single hyphens. */
export function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}
