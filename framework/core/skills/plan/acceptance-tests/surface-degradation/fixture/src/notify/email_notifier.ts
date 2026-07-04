/** Sends transactional email notifications. */
export function emailSubject(title: string, maxLen: number): string {
  // Truncate long titles so subjects fit provider limits.
  const cut = title.length > maxLen ? title.slice(0, maxLen) + "..." : title;
  return `[notify] ${cut}`;
}

export function sendEmail(to: string, title: string): void {
  const subject = emailSubject(title, 60);
  console.log(`email to=${to} subject=${subject}`);
}
