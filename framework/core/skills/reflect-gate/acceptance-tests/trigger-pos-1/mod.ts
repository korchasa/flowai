import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Positive trigger: close the session by auditing it AND writing the lessons
 * into the project instructions as a commit. Analysis alone belongs to
 * `reflect`; the edit-and-commit half is what makes this `reflect-gate`.
 *
 * The session's work is real: setup commits it, and the query retells what
 * happened. Against a bare `init` repo the agent found nothing to audit and
 * asked what the user meant instead of acting (2026-10-02, Claude arm) — the
 * scenario was measuring its own false premise.
 */
export const ReflectGateTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "reflect-gate-trigger-pos-1";
  name = "close the session and commit the lessons";
  skill = "reflect-gate";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: ["feat: add greeting helper"],
    expectedOutcome:
      "Agent recognises a close-the-session request with instruction edits and loads the reflect-gate skill",
  };

  override async setup(sandboxPath: string) {
    await Deno.writeTextFile(
      `${sandboxPath}/greet.ts`,
      `/** Builds a greeting for the given name. */
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
`,
    );
    await runGit(sandboxPath, ["add", "greet.ts"]);
    await runGit(sandboxPath, ["commit", "-m", "feat: add greeting helper"]);
  }

  userQuery =
    "We're done for today. In this session we added greet.ts; you committed it twice before noticing that `deno lint` failed, because our instructions never say to run the linter before a commit. Audit how this session went, fix our project instructions based on what you find, and commit those fixes.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `reflect-gate` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `reflect-gate`.",
    critical: true,
  }];
}();
