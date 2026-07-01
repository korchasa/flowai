/**
 * Convert an ISO-8601 UTC offset into its POSIX TZ-variable equivalent.
 *
 * POSIX TZ semantics are inverted relative to ISO-8601: zones EAST of
 * Greenwich carry a NEGATIVE offset. "+05:30" -> "-05:30",
 * "-08:00" -> "+08:00". Unsigned zone names pass through unchanged.
 */
export function prepareTznameDelta(offset: string): string {
  if (offset.startsWith("+")) return "-" + offset.slice(1);
  if (offset.startsWith("-")) return "+" + offset.slice(1);
  return offset;
}
