import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

const STRINGS_TS = `/** Remove leading and trailing whitespace. */
export function trim(s: string): string {
  return s.trim();
}
`;

const STRINGS_TEST_TS = `import { trim } from "./strings.ts";

Deno.test("trim removes leading and trailing whitespace", () => {
  if (trim("  hello  ") !== "hello") throw new Error("trim failed");
});
`;

const README_MD = `# Strings

Small string helpers.
`;

const TASK_MD = `---
date: 2026-11-10
status: in progress
---
# Add a trim helper

## Goal

Callers need one helper that strips surrounding whitespace.

## Definition of Done

- [x] \`strings.ts\` exports \`trim\`
  - Evidence: \`grep -q "export function trim" strings.ts\`
- [x] \`strings_test.ts\` covers \`trim\`
  - Evidence: \`grep -q "trim" strings_test.ts\`
- [x] \`README.md\` has a section that documents \`trim\`
  - Evidence: \`grep -q "trim" README.md\`

## Solution

Add the helper, its test and a README section.
`;

/**
 * Two goals stated by the user, one delivered. The task file ticks ALL three
 * Definition-of-Done boxes, but the README never got its `trim` section, so
 * the third box is a claim the evidence command contradicts. The skill must
 * gather evidence itself, report the README goal as not met, and change
 * nothing. Everything is committed in `setup`, so any diff is the agent's.
 */
export const CheckGoalsReportsUnmetGoal = new class
  extends AcceptanceTestScenario {
  id = "check-goals-reports-unmet-goal";
  name = "Reports a goal as not met when a ticked box has no evidence";
  skill = "check-goals";
  maxSteps = 25;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Strings",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override async setup(sandboxPath: string) {
    const taskDir = `${sandboxPath}/documents/tasks/2026/11`;
    await Deno.mkdir(taskDir, { recursive: true });
    await Deno.writeTextFile(`${sandboxPath}/strings.ts`, STRINGS_TS);
    await Deno.writeTextFile(`${sandboxPath}/strings_test.ts`, STRINGS_TEST_TS);
    await Deno.writeTextFile(`${sandboxPath}/README.md`, README_MD);
    await Deno.writeTextFile(`${taskDir}/add-trim.md`, TASK_MD);
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "feat: add trim helper"]);
  }

  userQuery =
    "/check-goals In this session I asked you for two things: a `trim` helper in strings.ts with a test, and a README section that documents it. The task file is documents/tasks/2026/11/add-trim.md. Are the goals of this session met?";

  checklist = [
    {
      id: "unmet_goal_reported",
      description:
        "Did the agent report that the README goal (a section documenting `trim`) is NOT met, even though its Definition-of-Done box in the task file is ticked?",
      critical: true,
    },
    {
      id: "evidence_gathered",
      description:
        "Did the agent gather evidence itself — run a command (e.g. `grep` on README.md) or read README.md — instead of trusting the ticked boxes of the task file? Look in the trace for the tool call.",
      critical: true,
    },
    {
      id: "overall_verdict_not_met",
      description:
        "Does the report carry an overall verdict saying that not all goals of the session are met (it must NOT conclude that everything is done)?",
      critical: true,
    },
    {
      id: "met_goal_reported",
      description:
        "Did the agent report the `trim` helper with its test as met, naming what it checked?",
      critical: false,
    },
    {
      id: "read_only",
      description:
        "Did the agent leave the project unchanged — it did NOT write the README section, did NOT edit the task file or its checkboxes, and made no commit? Offering to fix it in words is fine.",
      critical: true,
    },
  ];
}();
