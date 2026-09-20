export type Message = { content: string };
export const defaults = { maxChars: 12000, keepRecent: 6 };
/** Remove oldest messages until the remaining text fits the character budget. No extra model call. */
export function trimOldest(messages: Message[], maxChars = defaults.maxChars): Message[] {
  const result = [...messages];
  while (result.length && result.reduce((n, m) => n + m.content.length, 0) > maxChars) result.shift();
  return result;
}
/** Keep a generated summary of older messages plus the latest messages. Summary generation costs one extra model call. */
export async function foldHistory(
  messages: Message[],
  makeSummary: (old: Message[]) => Promise<string>,
  keepRecent = defaults.keepRecent,
): Promise<Message[]> {
  if (messages.length <= keepRecent) return messages;
  const summary = await makeSummary(messages.slice(0, -keepRecent));
  return [{ content: summary }, ...messages.slice(-keepRecent)];
}

