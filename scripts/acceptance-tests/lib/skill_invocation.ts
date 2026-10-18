/**
 * Deterministic skill-invocation detection (FR-ACCEPT.ACP).
 *
 * Trigger scenarios assert whether the agent loaded a specific skill in
 * response to a query. Historically this was graded by the LLM judge, which
 * could only infer invocation from the agent's prose — the ACP transcript did
 * not carry tool calls. The recorder now captures `tool_call` notifications (see
 * `acp/turn_recorder.ts`), so the runner can decide these items WITHOUT the judge.
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
 * The command must also READ exactly one skill file: a search (`rg`, `grep`)
 * or a command naming several SKILL.md files is the agent looking around, not
 * loading a skill. Captured 2026-10-06 (update-trigger-adj-1, gpt-6-luna): one
 * `rg -n -i '<pattern>'` over 11 installed SKILL.md files scored as `update`.
 *
 * codex-acp 2.x (codex 0.159) parses a one-file `cat`/`sed` into a `read`
 * action and drops the command from the report. Captured 2026-09-30
 * (select-llm-model-source-parse-failure-becomes-gap, gpt-6-luna):
 * `kind: "read"`, `title: "Read file '<path>'"`, `locations: [{ path }]`, no
 * rawInput. That title is the codex bridge's own wording — claude-agent-acp
 * titles its Read tool `Read <path>` — so the Claude exclusion above holds.
 */
import type { CapturedToolCall } from "./acp/turn_recorder.ts";

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

/** Title prefix codex-acp 2.x gives a shell command it parsed as a file read. */
const CODEX_PARSED_READ_TITLE = "Read file '";

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
    if (tc.kind === "read" && tc.title.startsWith(CODEX_PARSED_READ_TITLE)) {
      for (const loc of tc.locations ?? []) {
        if (shellReadsSkill(loc.path, accepted)) return true;
      }
    }
  }
  return false;
}

/** True iff a shell command or a path names `skills/<one of accepted>/SKILL.md`. */
function shellReadsSkill(command: string, accepted: Set<string>): boolean {
  const names = new Set(
    [...command.matchAll(/skills\/([^\/\s*'"]+)\/SKILL\.md/g)].map((m) => m[1]),
  );
  if (names.size !== 1 || runsSearchProgram(command)) return false;
  const [name] = names;
  return accepted.has(name);
}

/** Programs that search a file rather than read it to the model. */
const SEARCH_PROGRAMS = new Set(["rg", "grep", "egrep", "fgrep", "ag", "ack"]);

/** True iff any stage of a shell command line starts a search program. */
function runsSearchProgram(command: string): boolean {
  for (const stage of command.split(/&&|\|\||[;|\n]/)) {
    const words = stage.trim().split(/\s+/).filter((w) => !/^\w+=/.test(w));
    const program = (words[0] ?? "").split("/").pop() ?? "";
    if (SEARCH_PROGRAMS.has(program)) return true;
  }
  return false;
}
