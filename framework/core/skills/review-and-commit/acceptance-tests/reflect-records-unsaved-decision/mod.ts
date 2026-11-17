import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

// The Reflect Phase checks that the session's decisions are recorded, and
// writes down the one that is not (FR-DOC-RESCUE).
//
// The user names the session's task file and states a decision made while
// writing the code: two layouts were weighed, one was chosen, with a reason.
// The task file says nothing about it. The session has no error; the decision
// alone must start the reflection, and its result is the decision appended to
// that task file — both alternatives, the choice and the reason.
export const ReviewAndCommitReflectRecordsUnsavedDecision = new class
  extends AcceptanceTestScenario {
  id = "review-and-commit-reflect-records-unsaved-decision";
  name = "Reflect records a session decision the task file does not hold";
  skill = "review-and-commit";
  maxSteps = 40;
  stepTimeoutMs = 480_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `deno task check` — the project check: format, lint and all tests.",
  };
  interactive = true;

  override sandboxState = {
    commits: [{
      message: "Remove utils.ts from tracking",
      files: ["utils.ts"],
    }],
    untracked: ["utils.ts"],
    expectedOutcome:
      "Agent reviews and commits utils.ts, then reflects: the decision the user stated (one flat utils.ts instead of separate `math/` and `strings/` modules, because there are only three helpers) is in no project record, so the agent appends it to documents/tasks/2026/05/add-utils.md, commits that, names it in its report and asks whether to push.",
  };

  override async setup(sandboxPath: string) {
    await runGit(sandboxPath, ["rm", "--cached", "utils.ts"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Remove utils.ts from tracking",
    ]);
  }

  userQuery =
    "/review-and-commit Review and commit the new utility functions; the task file is documents/tasks/2026/05/add-utils.md. While writing them I weighed two layouts — separate `math/` and `strings/` modules versus one flat utils.ts — and chose the flat file, because there are only three helpers and one import line is easier for callers.";

  userPersona = `You are the developer who wrote the utility functions.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When shown review results, approve them. When asked to confirm commit, approve.
If the agent asks whether to push a commit it made, reply: "yes" — this sandbox has no remote, so the workflow is expected to report that and stop.
Do not repeat or expand on the layout decision; you already stated it.
Keep all answers brief and affirmative.`;

  checklist = [
    {
      id: "user_change_committed",
      description:
        "Is `utils.ts` present in a commit (the user-requested change)?",
      critical: true,
    },
    {
      id: "decision_recorded_in_task_file",
      description:
        "At the end of the run, does `documents/tasks/2026/05/add-utils.md` record the layout decision with all three parts: (a) BOTH alternatives — separate `math/` and `strings/` modules, and one flat `utils.ts`; (b) the choice — the flat file; (c) the reason — only three helpers and a single import line for callers (any wording)? A record missing the rejected alternative or the reason fails this item, and so does a decision written only into the chat or only into a commit message.",
      critical: true,
    },
    {
      id: "decision_record_committed",
      description:
        "Is the task file with the decision committed, so that the final `git status --porcelain` does not list it as modified?",
      critical: true,
    },
    {
      id: "decision_named_in_report",
      description:
        "Did the agent tell the user, in its reflection output, that it found a decision that was not recorded anywhere and wrote it into the task file — naming the decision and the file?",
      critical: true,
    },
  ];
}();
