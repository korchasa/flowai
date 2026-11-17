import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

// A declined reflect edit leaves a record (FR-ATOM-REFLECT-GATE.DECLINED-LOG).
//
// The Reflect Phase corrects the stale `deno task verify` line in AGENTS.md,
// commits it, and asks whether to push. The user says no and gives a reason.
// The phase removes its commit and the edit, and must then write one record
// of the declined edit into `AGENTS.declined.md` and commit that file alone,
// so that the next session does not make the same edit again.
//
// The session carries a real error for the reflection to quote: AGENTS.md and
// the user both name `deno task verify`, a task `deno.json` does not define.
export const ReviewAndCommitReflectDeclinedEditLogged = new class
  extends AcceptanceTestScenario {
  id = "review-and-commit-reflect-declined-edit-logged";
  name = "A declined reflect edit is recorded in the declined-edits log";
  skill = "review-and-commit";
  maxSteps = 40;
  stepTimeoutMs = 480_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `deno task verify` — the project check: format, lint and all tests.",
  };
  interactive = true;

  override sandboxState = {
    commits: [{
      message: "Remove utils.ts from tracking",
      files: ["utils.ts"],
    }],
    untracked: ["utils.ts"],
    expectedOutcome:
      "Agent reviews and commits utils.ts, reflects, corrects the stale `deno task verify` line in AGENTS.md in a separate `agent:` commit and asks whether to push it. The user declines with a reason. The agent removes that commit and the edit, then records the declined edit in `AGENTS.declined.md` and commits only that file. Final git status is clean.",
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
    "/review-and-commit Review and commit the new utility functions. The project check is `deno task verify`.";

  userPersona = `You are the developer who wrote the utility functions.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When shown review results, approve them. When asked to confirm commit, approve.
If the agent reports that \`deno task verify\` does not exist, or asks which check to run, reply: "run \`deno task check\` for now."
If the agent asks whether to push a commit it made to the instruction files, reply exactly: "no — keep that line as it is, \`verify\` comes back next sprint as an alias for \`check\`."
Keep all other answers brief and affirmative.`;

  checklist = [
    {
      id: "user_change_committed",
      description:
        "Is `utils.ts` present in a commit (the user-requested change), and is that commit still in the final `git log`?",
      critical: true,
    },
    {
      id: "reflect_commit_made_then_removed",
      description:
        "Did the agent first commit a correction of the stale `deno task verify` line in AGENTS.md as an `agent:` commit, made without asking, and then — after the user answered 'no' — remove that commit, so that the final AGENTS.md again names `deno task verify`? Fails if no such commit was ever made.",
      critical: true,
    },
    {
      id: "declined_record_written",
      description:
        "Does the file `AGENTS.declined.md` exist in the repository root at the end of the run, and does it hold a record of the declined edit that names (a) the file `AGENTS.md`, (b) what the edit did — replacing `deno task verify` with `deno task check`, in any wording — and (c) the user's reason (the `verify` task comes back as an alias)? A record missing any of the three fails this item.",
      critical: true,
    },
    {
      id: "declined_record_committed",
      description:
        "Is `AGENTS.declined.md` committed, in a commit made AFTER the undo that touches that file and no other? Inspect `git log --stat`. An uncommitted log file fails this item.",
      critical: true,
    },
    {
      id: "clean_status",
      description:
        "Is the final `git status --porcelain` empty (no untracked or modified files)?",
      critical: true,
    },
  ];
}();
