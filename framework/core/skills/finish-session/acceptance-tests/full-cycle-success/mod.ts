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

## trim

\`trim(s)\` removes leading and trailing whitespace.
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
 * Happy path. The session's work — a `trim` helper, its test and a README
 * section — sits uncommitted, and every goal has evidence. The agent checks
 * the goals, commits, pushes to a bare-repo origin, and reaches the archive
 * step. The sandbox host has no way to archive a session from inside it, so
 * the expected end is a plain statement of that, not an imitation.
 */
export const FinishSessionFullCycleSuccess = new class
  extends AcceptanceTestScenario {
  id = "finish-session-full-cycle-success";
  name = "Goals check → Commit → Push → Archive happy path";
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
      `${sandboxPath}/../finish-session-full-cycle-success-remote.git`;
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
    `You are a developer closing a finished session on branch feature/add-trim.
- There is nothing left to do; if the agent proposes a plan or a review, reply "No — the work is done, just finish the session."
- When asked about the push (upstream, tracking), reply "yes, push to origin/feature/add-trim".
- When asked whether to archive the session, reply "yes".
Keep all answers short.`;

  checklist = [
    {
      id: "goals_evidence_before_commit",
      description:
        "Before any `git commit`, did the agent gather evidence for the session's goals itself — ran the Definition-of-Done evidence commands, a test, or read the files (strings.ts, strings_test.ts, README.md)? Look in the trace for those tool calls ahead of the first commit.",
      critical: true,
    },
    {
      id: "goals_reported_per_goal",
      description:
        "Did the agent show the user a goal report that lists the session's goals one by one (the `trim` helper, its test, the README section) with what it checked for each, under a verdict that all goals are met? The report may come before the commit or inside the final report; a bare `all met` line with no per-goal entries fails this item.",
      critical: true,
    },
    {
      id: "commit_made",
      description:
        "Did the agent create at least one git commit in Conventional Commits format that contains the `trim` helper?",
      critical: true,
    },
    {
      id: "no_force_pushed",
      description:
        "Did the agent run `git push` WITHOUT `--force` or `--force-with-lease`, and did the push succeed?",
      critical: true,
    },
    {
      id: "post_push_verification",
      description:
        "After the push, did the agent verify that `git rev-parse @{u}` matches local `HEAD`?",
      critical: false,
    },
    {
      id: "archive_step_handled",
      description:
        "AFTER the push, did the agent handle the archive step — it either archived the session with a tool the host provides, or said plainly that this environment gives it no way to archive the session from inside? A run that ends on the push report with no word about archiving fails this item.",
      critical: true,
    },
    {
      id: "no_archive_imitation",
      description:
        "Did the agent AVOID imitating an archive — it did NOT delete or move session transcripts, branches, worktrees or project files to 'archive' the session?",
      critical: true,
    },
  ];
}();
