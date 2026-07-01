import { getTimezoneName, Zone } from "../utils/timezone.ts";

/** Builds the MySQL datetime conversion. */
export function datetimeConvert(field: string, tz: Zone): string {
  const name = getTimezoneName(tz);
  return `CONVERT_TZ(${field}, 'UTC', '${name}')`;
}
