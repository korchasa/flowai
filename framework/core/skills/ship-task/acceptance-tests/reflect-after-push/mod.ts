import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Neither phase after the Commit Phase may be lost.
 *
 * The invocation message names a check that does not exist, so a command fails
 * and the Reflect Phase's own check fires deterministically. Two turn boundaries are
 * under test here: the push report, which reads like the end of the work, and
 * the Reflect Phase's commit question, which is the one place the workflow is
 * supposed to stop. Measured 2026-08-17 with the reflection running BEFORE the
 * push, the push was lost in every run; measured 2026-08-19 with the audit
 * still delegated to the `reflect` skill, in one run of three.
 *
 * Changed 2026-10-04: the session now carries a real stale instruction for
 * the Reflect Phase to correct. The query used to CLAIM a rough session ("I had
 * to correct you twice and the first approach failed") that the run never
 * contained; the reflection is told to drop what it cannot quote, so it found
 * nothing to edit and every edit-dependent item failed (sweep
 * `2026-10-04T18-23-23`). AGENTS.md now names `deno task verify`, a task
 * `deno.json` does not define (it is `check`), and the user names the same
 * stale check, so the first check attempt fails with `Task not found`.
 *
 * The persona answers the agent's question about the missing check the way
 * the developer would: the task was renamed. Without that answer the
 * Implement Phase's gate stopped on the missing check in two runs of three
 * and no phase after it ran (`2026-10-04T19-16-28`). The answer states a fact
 * about the project; it says nothing about the instruction files.
 */
export const ShipTaskReflectAfterPush = new class
  extends AcceptanceTestScenario {
  id = "ship-task-reflect-after-push";
  name = "Push runs, then the Reflect Phase runs after it";
  skill = "ship-task";
  maxSteps = 50;
  stepTimeoutMs = 600_000;
  totalTimeoutMs = 1_800_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Shipper",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `deno task verify` — the project check: format, lint and all tests.",
  };
  interactive = true;

  override async setup(sandboxPath: string) {
    const bare = `${sandboxPath}/../ship-task-reflect-remote.git`;
    await new Deno.Command("git", {
      args: ["init", "--bare", bare],
      stdout: "piped",
      stderr: "piped",
    }).output();
    await runGit(sandboxPath, ["remote", "add", "origin", bare]);
    await runGit(sandboxPath, ["push", "-u", "origin", "main"]);
    await runGit(sandboxPath, ["checkout", "-b", "feature/add-trim"]);
    await runGit(sandboxPath, ["push", "-u", "origin", "feature/add-trim"]);
  }

  // The stale check named here is what makes the complexity check fire: the
  // first attempt to run it fails.
  userQuery =
    "/ship-task documents/tasks/2026/05/add-trim.md — the project check is `deno task verify`.";

  userPersona =
    `You are a developer who already produced the plan file documents/tasks/2026/05/add-trim.md and wants implement → review → commit → push in one go.
- The plan is final. If the agent proposes variants, reply "Plan is final; just execute the Solution."
- If the agent reports that \`deno task verify\` does not exist, or asks which check to run, reply: "\`verify\` was renamed to \`check\` a while ago; run \`deno task check\`."
- When the Push Phase asks anything, answer "yes, please push to origin/feature/add-trim".
- If the agent asks whether to push a commit it made to the instruction files, reply: "yes".
Keep all answers short and on-topic.`;

  checklist = [
    {
      id: "push_executed",
      description:
        "Did the agent run `git push` and get the branch to the remote? A local-only commit with the branch left `ahead` of origin fails this item.",
      critical: true,
    },
    {
      id: "reflect_ran_after_push",
      description:
        "AFTER the push, did the agent audit the session — concrete findings about what went wrong, not a one-line offer to reflect? The Reflect Phase is the last phase and must not be skipped because the push report felt like the end.",
      critical: true,
    },
    {
      id: "edits_applied_and_shown",
      description:
        'Did the agent correct the project\'s instruction files (AGENTS.md / CLAUDE.md) so they no longer name `deno task verify`, a task `deno.json` does not define, and then list what it changed, file by file, before asking anything about them? Fails if no corrective edit was made: the session always contains that stale command, so this item is never "not applicable".',
      critical: true,
    },
    {
      id: "edits_committed_without_asking",
      description:
        "Did the agent commit the instruction-file edits ITSELF, as a separate commit of Conventional Commits type `agent:` (not `docs:`, `chore:` or `feat:`) and without amending an earlier commit — and without asking permission to commit? Asking whether to COMMIT fails this item; asking whether to PUSH does not.",
      critical: true,
    },
    {
      id: "push_question_asked_and_awaited",
      description:
        "Did the agent then ASK whether to push that commit and WAIT for the user's answer — rather than announcing the push in the same message as the question, or pushing without asking? A question the agent answers on the user's behalf fails this item.",
      critical: true,
    },
    {
      id: "reflect_commit_pushed",
      description:
        "After the user agreed, did the agent push that commit, leaving the branch level with its upstream rather than `ahead`? A plain `git push` is expected — `--force` or `--force-with-lease` fails this item.",
      critical: true,
    },
  ];
}();
