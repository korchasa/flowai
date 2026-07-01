import { getTimezoneName, Zone } from "../utils/timezone.ts";

/** Builds the Postgres datetime cast. */
export function datetimeCast(field: string, tz: Zone): string {
  const name = getTimezoneName(tz);
  return `${field} AT TIME ZONE '${name}'`;
}
