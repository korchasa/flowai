/**
 * Deterministic skill-invocation detection (FR-ACCEPT.ACP).
 *
 * Trigger scenarios assert whether the agent loaded a specific skill in
 * response to a query. Historically this was graded by the LLM judge, which
 * could only infer invocation from the agent's prose — the ACP transcript did
 * not carry tool calls. The client now captures `tool_call` notifications (see
 * `acp/client.ts`), so the runner can decide these items WITHOUT the judge.
 *
 * Empirically, claude-code-acp surfaces a `Skill` invocation as a `tool_call`
 * with `title: "Skill"`, `kind: "other"`, `rawInput: { skill: "<name>" }`.
 * Detection keys on this explicit Skill-tool argument (plus `name`/`skillName`
 * for cross-IDE robustness).
 *
 * A bare read of a skill's `SKILL.md` is deliberately NOT treated as invocation:
 * Explore subagents read `SKILL.md` files while mapping a project, which is not
 * the main agent's invocation decision and produced false positives on
 * `skill_not_invoked` scenarios. Only the explicit Skill-tool call counts.
 */
import type { CapturedToolCall } from "./acp/client.ts";

/** Checklist item ids handled deterministically (never sent to the judge). */
export const DETERMINISTIC_SKILL_CHECK_IDS = new Set([
  "skill_invoked",
  "skill_not_invoked",
]);

/**
 * rawInput keys that carry the invoked skill's name across IDEs. Deliberately
 * excludes `command` — that is the Bash tool's argument key and would risk a
 * false match; the real Skill tool uses `skill` (claude) / `name`.
 */
const SKILL_NAME_KEYS = ["skill", "name", "skillName"];

/**
 * Returns true iff the captured tool calls contain an explicit Skill-tool call
 * naming the given skill (exact match on the argument — no substring
 * cross-match). Bare file reads do not count (see module doc).
 */
export function detectSkillInvocation(
  toolCalls: CapturedToolCall[],
  skill: string,
): boolean {
  if (!skill) return false;
  for (const tc of toolCalls) {
    const rawInput = tc.rawInput ?? {};
    for (const key of SKILL_NAME_KEYS) {
      if (rawInput[key] === skill) return true;
    }
  }
  return false;
}
