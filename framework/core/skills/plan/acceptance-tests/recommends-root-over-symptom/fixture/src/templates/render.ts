import { getTimezoneName, Zone } from "../utils/timezone.ts";

/** Renders the timezone line shown in the page footer. */
export function renderZoneLabel(z: Zone): string {
  return `Timezone: ${getTimezoneName(z)}`;
}
