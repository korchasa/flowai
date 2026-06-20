/**
 * Shared tool-mock matcher for the ACP transport (FR-ACCEPT.ACP).
 *
 * Lifts the Claude `PreToolUse` Bash-head/discover detection
 * (`adapters/claude.ts:setupMocks`) into a single pure, IDE-agnostic function.
 * Over ACP the same logic runs once in the client interceptor instead of being
 * re-emitted as a per-IDE shell hook — replacing N bespoke hook writers.
 *
 * A tool is considered "invoked" iff its name appears as a command HEAD anywhere
 * in the Bash command: at string start, or right after a statement / pipeline /
 * group separator (`|`, `;`, `&`, `(`, `{`, backtick), past any leading `VAR=val`
 * env assignments, with an optional absolute/relative PATH prefix. A second
 * pattern blocks the discovery builtins (`command -v` / `which` / `type` /
 * `whereis` / `hash`) that would leak the binary's real path, so the tool reads
 * as genuinely unavailable. `^`/`$` are line-anchored (multiline) so a tool used
 * as the head of any newline-separated statement is caught too.
 */

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Backtick, kept as a named constant to avoid escaping noise in the patterns. */
const BTICK = "`";

/**
 * Returns true iff `tool` is invoked as a command head anywhere in `command`,
 * matching the Claude `PreToolUse` hook semantics (head + discovery builtins).
 */
export function isMockedToolInvoked(command: string, tool: string): boolean {
  const t = escapeRegExp(tool);
  const head = new RegExp(
    `(^|[|;&(){}${BTICK}])\\s*([A-Za-z_][A-Za-z0-9_]*=("[^"]*"|[^\\s]*)\\s+)*([^\\s|;&]*/)?${t}([\\s|;&]|$)`,
    "m",
  );
  const discover = new RegExp(
    `(^|[|;&(){}${BTICK}])\\s*(command\\s+-v|which|type|whereis|hash)(\\s+-[A-Za-z]+)*\\s+([^\\s|;&]*/)?${t}([\\s|;&]|$)`,
    "m",
  );
  return head.test(command) || discover.test(command);
}

/**
 * Resolves the first mocked tool matched by a Bash command, or null. The mocks
 * map is `{ toolName: cannedReason }`; the returned reason is what the
 * interceptor substitutes for the real tool's output.
 */
export function resolveMock(
  command: string,
  mocks: Record<string, string>,
): { tool: string; reason: string } | null {
  for (const [tool, reason] of Object.entries(mocks)) {
    if (isMockedToolInvoked(command, tool)) return { tool, reason };
  }
  return null;
}
