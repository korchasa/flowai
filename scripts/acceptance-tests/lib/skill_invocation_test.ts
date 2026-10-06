import { assertEquals } from "@std/assert";
import type { CapturedToolCall } from "./acp/client.ts";
import { detectSkillInvocation } from "./skill_invocation.ts";

// Shape observed empirically from claude-code-acp for a `Skill` tool call:
//   title "Skill", kind "other", rawInput { skill: "<name>" }.
const skillCall = (name: string): CapturedToolCall => ({
  toolCallId: "c1",
  title: "Skill",
  kind: "other",
  rawInput: { skill: name },
});

const readCall = (path: string): CapturedToolCall => ({
  toolCallId: "r1",
  title: "fs/read_text_file",
  kind: "read",
  rawInput: { path },
  locations: [{ path }],
});

Deno.test("detectSkillInvocation: true for Skill tool call naming the skill", () => {
  assertEquals(
    detectSkillInvocation([skillCall("analyze-context")], "analyze-context"),
    true,
  );
});

Deno.test("detectSkillInvocation: false when a different skill is invoked", () => {
  assertEquals(
    detectSkillInvocation([skillCall("reflect")], "analyze-context"),
    false,
  );
});

Deno.test("detectSkillInvocation: a bare SKILL.md read is NOT invocation", () => {
  // Explore subagents read SKILL.md files while mapping a project; that is not
  // the main agent invoking the skill, so it must not count.
  assertEquals(
    detectSkillInvocation(
      [readCall("/sandbox/.claude/skills/analyze-context/SKILL.md")],
      "analyze-context",
    ),
    false,
  );
});

Deno.test("detectSkillInvocation: false when no tool calls captured", () => {
  assertEquals(detectSkillInvocation([], "analyze-context"), false);
});

Deno.test("detectSkillInvocation: ignores unrelated tool calls (bash etc.)", () => {
  const calls: CapturedToolCall[] = [
    {
      toolCallId: "b1",
      title: "Bash",
      kind: "execute",
      rawInput: { command: "ls" },
    },
    {
      toolCallId: "r1",
      title: "Read",
      kind: "read",
      rawInput: { file_path: "/x/README.md" },
    },
  ];
  assertEquals(detectSkillInvocation(calls, "analyze-context"), false);
});

Deno.test("detectSkillInvocation: matches alt key (name) for cross-IDE robustness", () => {
  const call: CapturedToolCall = {
    toolCallId: "c1",
    title: "skill",
    kind: "other",
    rawInput: { name: "fix-tests" },
  };
  assertEquals(detectSkillInvocation([call], "fix-tests"), true);
});

Deno.test("detectSkillInvocation: a declared equivalent satisfies the check", () => {
  // Claude Code ships `code-review` as a built-in; the bench cannot uninstall
  // it, so a scenario may accept it in place of the framework's own `review`.
  assertEquals(
    detectSkillInvocation([skillCall("code-review")], "review", [
      "code-review",
    ]),
    true,
  );
});

Deno.test("detectSkillInvocation: an equivalent is only accepted when declared", () => {
  assertEquals(
    detectSkillInvocation([skillCall("code-review")], "review"),
    false,
  );
});

Deno.test("detectSkillInvocation: a declared equivalent does not widen to other skills", () => {
  assertEquals(
    detectSkillInvocation([skillCall("reflect")], "review", ["code-review"]),
    false,
  );
});

Deno.test("detectSkillInvocation: an empty skill with an equivalent still matches it", () => {
  // Guards the falsy-filter: "" must never become an accepted name.
  assertEquals(
    detectSkillInvocation([skillCall("")], "", ["code-review"]),
    false,
  );
  assertEquals(
    detectSkillInvocation([skillCall("code-review")], "", ["code-review"]),
    true,
  );
});

Deno.test("detectSkillInvocation: substring skill names do not cross-match", () => {
  // "tests" must not match a call invoking "fix-tests".
  assertEquals(
    detectSkillInvocation([skillCall("fix-tests")], "tests"),
    false,
  );
});

// codex has no Skill tool: codex-acp lists the installed skills in the prompt
// and the model loads one by reading its SKILL.md from the shell. Captured on
// 2026-09-01 (epic-trigger-pos-1, gpt-5.6-terra): `kind: "execute"`,
// `rawInput: { command: "NO_COLOR=1 sed -n '1,240p' <sandbox>/.codex/skills/epic/SKILL.md", cwd }`.
function codexShellRead(command: string): CapturedToolCall {
  return {
    toolCallId: "tc-exec",
    title: command,
    kind: "execute",
    rawInput: { command, cwd: "/sandbox" },
  };
}

Deno.test("detectSkillInvocation: codex loads a skill by reading its SKILL.md from the shell", () => {
  const calls = [
    codexShellRead(
      "NO_COLOR=1 sed -n '1,240p' /private/tmp/flowai-bench/run-1/sandbox/.codex/skills/epic/SKILL.md",
    ),
  ];
  assertEquals(detectSkillInvocation(calls, "epic"), true);
  assertEquals(
    detectSkillInvocation(
      [codexShellRead("cat .codex/skills/plan/SKILL.md")],
      "plan",
    ),
    true,
  );
});

Deno.test("detectSkillInvocation: a shell read of another skill's SKILL.md is not this skill", () => {
  const calls = [codexShellRead("cat .codex/skills/plan/SKILL.md")];
  assertEquals(detectSkillInvocation(calls, "epic"), false);
  // `epic` inside a longer skill name must not cross-match either.
  assertEquals(
    detectSkillInvocation([
      codexShellRead("cat .codex/skills/epic-review/SKILL.md"),
    ], "epic"),
    false,
  );
});

Deno.test("detectSkillInvocation: a shell sweep over every skill is discovery, not invocation", () => {
  const calls = [
    codexShellRead("cat .codex/skills/*/SKILL.md"),
    codexShellRead("find .codex/skills -name SKILL.md"),
    codexShellRead("ls .codex/skills/epic"),
  ];
  assertEquals(detectSkillInvocation(calls, "epic"), false);
});

// Captured 2026-10-06 (update-trigger-adj-1, gpt-6-luna): asked about a
// different job, the agent searched every installed SKILL.md at once with
// `rg`, and the detector scored that one search as loading `update`.
Deno.test("detectSkillInvocation: a search across many SKILL.md files is not invocation", () => {
  const skills = [
    "commit",
    "investigate",
    "plan",
    "push",
    "review",
    "ship",
    "epic",
    "reflect",
    "update",
    "init",
    "configure-deno-commands",
  ];
  const command = `rg -n -i 'update|upgrade' ${
    skills.map((s) => `.codex/skills/${s}/SKILL.md`).join(" ")
  } .codex/agents/console-expert.md`;
  assertEquals(
    detectSkillInvocation([codexShellRead(command)], "update"),
    false,
  );
});

Deno.test("detectSkillInvocation: a search inside one SKILL.md is not invocation", () => {
  const calls = [
    codexShellRead("grep -n 'Rules' .codex/skills/update/SKILL.md"),
    codexShellRead(
      "cd /sandbox && NO_COLOR=1 rg -n 'x' .codex/skills/update/SKILL.md",
    ),
  ];
  assertEquals(detectSkillInvocation(calls, "update"), false);
});

Deno.test("detectSkillInvocation: a read that names two SKILL.md files is not invocation", () => {
  const calls = [
    codexShellRead(
      "cat .codex/skills/plan/SKILL.md .codex/skills/update/SKILL.md",
    ),
  ];
  assertEquals(detectSkillInvocation(calls, "update"), false);
});

Deno.test("detectSkillInvocation: a one-file read after a cd still counts", () => {
  const calls = [
    codexShellRead("cd /sandbox && head -n 80 .codex/skills/update/SKILL.md"),
  ];
  assertEquals(detectSkillInvocation(calls, "update"), true);
});
