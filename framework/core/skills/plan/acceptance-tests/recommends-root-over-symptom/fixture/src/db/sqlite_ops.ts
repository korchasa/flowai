import { getTimezoneName, Zone } from "../utils/timezone.ts";

/** Builds the SQLite datetime modifier. */
export function datetimeModifier(field: string, tz: Zone): string {
  const name = getTimezoneName(tz);
  return `datetime(${field}, '${name}')`;
}
