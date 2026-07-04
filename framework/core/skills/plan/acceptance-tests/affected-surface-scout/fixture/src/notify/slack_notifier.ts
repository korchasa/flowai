/** Posts notification summaries to Slack channels. */
export function slackHeadline(title: string, maxLen: number): string {
  // Headline follows the same truncation convention as email subjects.
  const cut = title.length > maxLen ? title.slice(0, maxLen) + "..." : title;
  return `:bell: ${cut}`;
}

export function postToSlack(channel: string, title: string): void {
  console.log(`slack ch=${channel} text=${slackHeadline(title, 80)}`);
}
