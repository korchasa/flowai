import { getUserCountLabel } from "./stats.ts";
import { userCount } from "./config.ts";

/**
 * Prints a report using userCount.
 */
export function printReport(): void {
  console.log(getUserCountLabel());
  console.log(`Processing ${userCount} user records.`);
}
