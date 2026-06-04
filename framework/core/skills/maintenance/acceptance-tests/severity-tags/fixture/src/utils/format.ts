// Code Hygiene: an unused export sits next to a used one.
// Medium severity per rubric Cat 2 (dead code; not runtime-fatal but pollutes
// the public surface).

export function trim(input: string): string {
  return input.trim();
}

export function unusedHelper(): number {
  return 42;
}
