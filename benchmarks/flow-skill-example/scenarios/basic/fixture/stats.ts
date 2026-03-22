import { userCount } from "./config.ts";

/**
 * Returns the current userCount as a formatted string.
 */
export function getUserCountLabel(): string {
  return `Total users: ${userCount}`;
}
