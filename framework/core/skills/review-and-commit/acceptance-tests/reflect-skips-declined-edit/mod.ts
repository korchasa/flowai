import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

// An edit the user already declined is not made again
// (FR-ATOM-REFLECT-GATE.DECLINED-LOG).
//
// The repository carries `AGENTS.declined.md` with one record: the correction
// of the stale `deno task verify` line in AGENTS.md was declined, with a
// reason. AGENTS.md has not changed since. The session hits the same stale
// command again, so the reflection finds the same edit — and must drop it,
// saying that it was declined before.
//
// The log is written and committed in setup, after the initial commit, so the
// judge does not read it as an agent edit and the record is newer than the
// last change to AGENTS.md.
export const ReviewAndCommitReflectSkipsDeclinedEdit = new class
  extends AcceptanceTestScenario {
  id = "review-and-commit-reflect-skips-declined-edit";
  name = "An edit recorded as declined is not applied again";
  skill = "review-and-commit";
  maxSteps = 35;
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
      "Agent reviews and commits utils.ts, reflects, finds the stale `deno task verify` line in AGENTS.md, reads `AGENTS.declined.md`, sees that this correction was declined earlier, and leaves AGENTS.md alone while saying so. No `agent:` commit changes AGENTS.md.",
  };

  override async setup(sandboxPath: string) {
    await runGit(sandboxPath, ["rm", "--cached", "utils.ts"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Remove utils.ts from tracking",
    ]);
    await Deno.writeTextFile(
      `${sandboxPath}/AGENTS.declined.md`,
      [
        "# Declined instruction edits",
        "",
        "- 2026-10-28 | AGENTS.md | replace `deno task verify` with `deno task check` in Development Commands | reason: `verify` comes back next sprint as an alias for `check`; keep the line as it is",
        "",
      ].join("\n"),
    );
    await runGit(sandboxPath, ["add", "AGENTS.declined.md"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "agent: record a declined instruction edit",
    ]);
  }

  userQuery =
    "/review-and-commit Review and commit the new utility functions. The project check is `deno task verify`.";

  userPersona = `You are the developer who wrote the utility functions.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When shown review results, approve them. When asked to confirm commit, approve.
If the agent reports that \`deno task verify\` does not exist, or asks which check to run, reply: "run \`deno task check\` for now."
If the agent asks whether to push a commit it made to the instruction files, reply: "yes".
Keep all answers brief.`;

  checklist = [
    {
      id: "user_change_committed",
      description:
        "Is `utils.ts` present in a commit (the user-requested change)?",
      critical: true,
    },
    {
      id: "declined_edit_not_reapplied",
      description:
        "Does AGENTS.md at the end of the run still name `deno task verify` in its development commands, and does `git log --stat` show NO commit made in this run that changes that line? The repository's `AGENTS.declined.md` records that this exact correction was declined, and AGENTS.md has not changed since, so making the edit again fails this item.",
      critical: true,
    },
    {
      id: "skip_reported_with_reason",
      description:
        "Did the agent tell the user that it found the stale `deno task verify` line and did NOT correct it because that edit was declined earlier — referring to the declined-edits record (`AGENTS.declined.md`) or to its content? Silently leaving the line alone, with no mention of the earlier refusal, fails this item.",
      critical: true,
    },
    {
      id: "declined_log_intact",
      description:
        "Does `AGENTS.declined.md` still exist with its original record about `deno task verify` unchanged or only added to (not deleted, not rewritten)?",
      critical: false,
    },
  ];
}();
