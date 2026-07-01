import { prepareTznameDelta } from "./timezone.ts";

/**
 * Render a zone name plus ISO offset as a POSIX TZ-variable string,
 * e.g. ("UTC", "+05:30") -> "UTC-05:30".
 */
export function renderTzOffset(zoneName: string, isoOffset: string): string {
  return `${zoneName}${prepareTznameDelta(isoOffset)}`;
}
