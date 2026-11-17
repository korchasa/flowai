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

const DENO_JSON = `{
  "lock": false,
  "tasks": {
    "test": "deno test -A",
    "check": "deno fmt --check && deno lint && deno test -A"
  },
  "fmt": {
    "exclude": [".claude/", ".codex/", ".opencode/", ".cursor/", "documents/", "acceptance-tests/", "AGENTS.md", "CLAUDE.md", "README.md"]
  },
  "lint": {
    "exclude": [".claude/", ".codex/", ".opencode/", ".cursor/", "documents/", "acceptance-tests/"]
  },
  "test": {
    "exclude": [".claude/", ".codex/", ".opencode/", ".cursor/", "acceptance-tests/"]
  }
}
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
 * The Reflect Phase of the session-finish workflow (FR-FINISH-SESSION,
 * FR-ATOM-REFLECT-GATE). It sits between the push and the archive: archiving
 * is the last act of a session, so a lesson of the session has to reach the
 * instruction files before it.
 *
 * The session carries one real stale instruction: AGENTS.md names
 * `deno task verify` as the project check, and `deno.json` defines `check`.
 * The user asks for the project check before the finish, the first attempt
 * fails with `Task not found`, and the persona states the rename. The
 * reflection corrects the line in a separate `agent:` commit, asks whether to
 * push it, pushes on "yes", and only then reaches the archive step.
 */
export const FinishSessionReflectBeforeArchive = new class
  extends AcceptanceTestScenario {
  id = "finish-session-reflect-before-archive";
  name = "The session finish reflects after the push and before the archive";
  skill = "finish-session";
  maxSteps = 60;
  stepTimeoutMs = 600_000;
  totalTimeoutMs = 1_800_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Strings",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `deno task verify` — the project check: format, lint and all tests.",
  };
  interactive = true;

  override async setup(sandboxPath: string) {
    const bare = `${sandboxPath}/../finish-session-reflect-remote.git`;
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
    await Deno.writeTextFile(`${sandboxPath}/deno.json`, DENO_JSON);
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "docs: add the trim task"]);
    await runGit(sandboxPath, ["push", "-u", "origin", "feature/add-trim"]);
    // The session's own work, still uncommitted.
    await Deno.writeTextFile(`${sandboxPath}/strings.ts`, STRINGS_TS);
    await Deno.writeTextFile(`${sandboxPath}/strings_test.ts`, STRINGS_TEST_TS);
    await Deno.writeTextFile(`${sandboxPath}/README.md`, README_MD);
  }

  userQuery =
    "/finish-session In this session I asked you for a `trim` helper in strings.ts with a test and a README section that documents it (task file documents/tasks/2026/11/add-trim.md). The files are written and uncommitted. Run the project check named in AGENTS.md first, then finish the session.";

  userPersona =
    `You are a developer closing a finished session on branch feature/add-trim.
- There is nothing left to do; if the agent proposes a plan or a review, reply "No — the work is done, just finish the session."
- If the agent reports that \`deno task verify\` does not exist, or asks which check to run, reply: "\`verify\` was renamed to \`check\` a while ago; run \`deno task check\` and carry on with the finish."
- When asked about the push of the feature work (upstream, tracking), reply "yes, push to origin/feature/add-trim".
- If the agent asks whether to push a commit it made to the instruction files (AGENTS.md / CLAUDE.md), reply exactly: "yes".
- When asked whether to archive the session, reply "yes".
Keep all answers short.`;

  checklist = [
    {
      id: "feature_work_pushed",
      description:
        "Did the agent commit the `trim` helper in a Conventional Commits commit and push it to origin/feature/add-trim without `--force`?",
      critical: true,
    },
    {
      id: "stale_check_corrected_in_agent_commit",
      description:
        "AFTER the feature push, did the agent correct the stale `deno task verify` line in AGENTS.md (it now names `deno task check`) and commit that edit itself, without asking, in a commit SEPARATE from the feature commit with the conventional-commit type `agent` (subject starts with `agent:` or `agent(<scope>):`)? Fails if no such commit exists: the session always contains that stale command.",
      critical: true,
    },
    {
      id: "push_question_answered_by_user",
      description:
        "After the `agent:` commit, did the agent ask whether to push that commit and end its turn on the question, and push it only after the user replied 'yes'? Pushing it without the question fails this item.",
      critical: true,
    },
    {
      id: "archive_after_reflection",
      description:
        "Did the archive step come AFTER the reflection — the agent either archived the session with a tool the host provides, or said plainly that this environment gives it no way to archive the session from inside — and only after the `agent:` commit was made and its push question answered? A run that reaches the archive step with no reflection before it, or that ends without a word about archiving, fails this item.",
      critical: true,
    },
    {
      id: "remote_holds_everything",
      description:
        "At the end of the run, does `git rev-parse @{u}` equal `git rev-parse HEAD`, with the `agent:` commit present on the remote branch?",
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
