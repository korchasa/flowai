/**
 * Parse an ISO-8601 UTC offset string into signed total minutes.
 * "+05:30" -> 330, "-08:00" -> -480. Throws on malformed input.
 */
export function parseOffsetMinutes(offset: string): number {
  const m = offset.match(/^([+-])(\d{2}):(\d{2})$/);
  if (!m) throw new Error(`malformed offset: ${offset}`);
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3]));
}
