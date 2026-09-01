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
 * A bare `fs/read_text_file` of a skill's `SKILL.md` is deliberately NOT
 * treated as invocation: Explore subagents read `SKILL.md` files while mapping
 * a project, which is not the main agent's invocation decision and produced
 * false positives on `skill_not_invoked` scenarios.
 *
 * codex has no Skill tool at all: codex-acp lists the installed skills in the
 * prompt and the model loads one by reading its `SKILL.md` from the shell.
 * Captured 2026-09-01 (epic-trigger-pos-1, gpt-5.6-terra): `kind: "execute"`,
 * `rawInput.command` = `sed -n '1,240p' <sandbox>/.codex/skills/epic/SKILL.md`.
 * So a shell command that names `skills/<skill>/SKILL.md` explicitly counts as
 * invocation too — the path is delimited on both sides, so neither a glob
 * sweep over every skill directory nor a longer skill name can cross-match.
 */
import type { CapturedToolCall } from "./acp/client.ts";

/** Checklist item ids handled deterministically (never sent to the judge). */
export const DETERMINISTIC_SKILL_CHECK_IDS = new Set([
  "skill_invoked",
  "skill_not_invoked",
]);

/**
 * rawInput keys that carry the invoked skill's name across IDEs. `command` is
 * NOT in this list — it is the shell tool's argument and is parsed separately
 * for an explicit `skills/<name>/SKILL.md` path (see `shellReadsSkill`); the
 * real Skill tool uses `skill` (claude) / `name`.
 */
const SKILL_NAME_KEYS = ["skill", "name", "skillName"];

/**
 * Returns true iff the captured tool calls contain an explicit Skill-tool call
 * naming the given skill (exact match on the argument — no substring
 * cross-match). Bare file reads do not count (see module doc).
 *
 * `equivalents` are host-provided skills the scenario accepts in place of
 * `skill` (see `BenchmarkScenario.equivalentSkills`): an IDE built-in that
 * answers the same request cannot be uninstalled from the sandbox, so a
 * scenario may declare it as a second acceptable answer.
 */
export function detectSkillInvocation(
  toolCalls: CapturedToolCall[],
  skill: string,
  equivalents: readonly string[] = [],
): boolean {
  const accepted = new Set([skill, ...equivalents].filter((s) => s));
  if (accepted.size === 0) return false;
  for (const tc of toolCalls) {
    const rawInput = tc.rawInput ?? {};
    for (const key of SKILL_NAME_KEYS) {
      const named = rawInput[key];
      if (typeof named === "string" && accepted.has(named)) return true;
    }
    const command = rawInput.command;
    if (typeof command === "string" && shellReadsSkill(command, accepted)) {
      return true;
    }
  }
  return false;
}

/** True iff a shell command names `skills/<one of accepted>/SKILL.md`. */
function shellReadsSkill(command: string, accepted: Set<string>): boolean {
  for (const m of command.matchAll(/skills\/([^\/\s*'"]+)\/SKILL\.md/g)) {
    if (accepted.has(m[1])) return true;
  }
  return false;
}
