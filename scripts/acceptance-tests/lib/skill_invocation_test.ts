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
