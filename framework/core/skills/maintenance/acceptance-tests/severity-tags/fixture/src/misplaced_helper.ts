// This file is at the wrong location: helpers belong under src/utils/.
// Structural Integrity finding shape; High per rubric Cat 1 (impacts import paths
// for several callers, but no runtime fatality).
export function slug(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
