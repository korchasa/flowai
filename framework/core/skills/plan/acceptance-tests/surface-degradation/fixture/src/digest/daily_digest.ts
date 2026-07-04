import { emailSubject } from "../notify/email_notifier.ts";

/** Assembles the daily digest email from the day's notification titles. */
export function digestBody(titles: string[]): string {
  return titles.map((t) => `* ${emailSubject(t, 60)}`).join("\n");
}
