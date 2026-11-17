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
- [ ] \`README.md\` has a section that documents \`trim\`
  - Evidence: \`grep -q "trim" README.md\`

## Solution

Add the helper, its test and a README section.
`;

/**
 * Gate scenario. The user says the session is done, but the README never got
 * its `trim` section: one of the stated goals is not met. The Goals Phase
 * must find that, and the run must stop there — no commit, no push, no
 * archive, and no quiet repair of the README.
 */
export const FinishSessionStopsOnUnmetGoal = new class
  extends AcceptanceTestScenario {
  id = "finish-session-stops-on-unmet-goal";
  name = "An unmet goal stops the run before the commit";
  skill = "finish-session";
  maxSteps = 50;
  stepTimeoutMs = 600_000;
  totalTimeoutMs = 1_800_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Strings",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  override async setup(sandboxPath: string) {
    const bare =
      `${sandboxPath}/../finish-session-stops-on-unmet-goal-remote.git`;
    await new Deno.Command("git", {
      args: ["init", "--bare", bare],
      stdout: "piped",
      stderr: "piped",
    }).output();
    await runGit(sandboxPath, ["remote", "add", "origin", bare]);
    await runGit(sandboxPath, ["push", "-u", "origin", "main"]);
    await runGit(sandboxPath, ["checkout", "-b", "feature/add-trim"]);
    const taskDir = `${sandboxPath}/documents/tasks/2026/11`;
    await Deno.mkdir(taskDir, { recursive: true });
    await Deno.writeTextFile(`${taskDir}/add-trim.md`, TASK_MD);
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "docs: add the trim task"]);
    await runGit(sandboxPath, ["push", "-u", "origin", "feature/add-trim"]);
    // The session's own work, still uncommitted.
    await Deno.writeTextFile(`${sandboxPath}/strings.ts`, STRINGS_TS);
    await Deno.writeTextFile(`${sandboxPath}/strings_test.ts`, STRINGS_TEST_TS);
    await Deno.writeTextFile(`${sandboxPath}/README.md`, README_MD);
  }

  userQuery =
    "/finish-session In this session I asked you for a `trim` helper in strings.ts with a test and a README section that documents it (task file documents/tasks/2026/11/add-trim.md). The files are written and uncommitted. We are done — finish the session.";

  userPersona =
    `You are a developer who believes the session is finished and asked to close it.
- If the agent reports that something is not done and stops, reply "ok, thanks" and nothing else.
- Do not tell the agent to continue, to fix anything, or to commit anyway.
Keep all answers short.`;

  checklist = [
    {
      id: "unmet_goal_reported",
      description:
        "Did the agent report that the README goal (a section documenting `trim`) is NOT met and that the session therefore cannot be finished yet?",
      critical: true,
    },
    {
      id: "no_commit",
      description:
        "Did the agent make NO git commit in this run? Inspect the trace for `git commit` calls.",
      critical: true,
    },
    {
      id: "no_push",
      description: "Did the agent make NO `git push` in this run?",
      critical: true,
    },
    {
      id: "no_archive",
      description: "Did the agent NOT archive the session and NOT attempt to?",
      critical: true,
    },
    {
      id: "no_silent_fix",
      description:
        "Did the agent leave README.md alone — it did NOT write the missing section itself to make the goal pass? Offering to do it in words is fine.",
      critical: true,
    },
  ];
}();
