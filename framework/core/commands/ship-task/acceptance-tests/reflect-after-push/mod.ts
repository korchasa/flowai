import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Neither phase after the Commit Phase may be lost.
 *
 * The invocation message carries explicit complexity descriptors, so the
 * Reflect Phase's own check fires deterministically. Two turn boundaries are
 * under test here: the push report, which reads like the end of the work, and
 * the Reflect Phase's commit question, which is the one place the workflow is
 * supposed to stop. Measured 2026-08-17 with the reflection running BEFORE the
 * push, the push was lost in every run; measured 2026-08-19 with the audit
 * still delegated to the `reflect` skill, in one run of three.
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

  // The descriptors here are what makes the complexity check fire.
  userQuery =
    "/ship-task documents/tasks/2026/05/add-trim.md — rough session before this: I had to correct you twice and the first approach failed.";

  userPersona =
    `You are a developer who already produced the plan file documents/tasks/2026/05/add-trim.md and wants implement → review → commit → push in one go.
- The plan is final. If the agent proposes variants, reply "Plan is final; just execute the Solution."
- If the agent asks what went wrong earlier, say the first helper returned the wrong value and you corrected the approach twice.
- When the Push Phase asks anything, answer "yes, please push to origin/feature/add-trim".
- If the agent shows you edits it made to the instruction files and asks whether to commit them, reply: "yes".
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
        "Did the agent apply corrective edits to the project's instruction files (AGENTS.md / CLAUDE.md) and then list what it changed, file by file, before asking anything about them?",
      critical: true,
    },
    {
      id: "commit_question_asked_and_awaited",
      description:
        "Did the agent ASK whether to commit those edits and WAIT for the user's answer — rather than announcing the commit in the same message as the question, or committing without asking? A question the agent answers on the user's behalf fails this item.",
      critical: true,
    },
    {
      id: "edits_committed_as_agent_type",
      description:
        "After the user agreed, did the agent commit the instruction-file edits as a separate commit of Conventional Commits type `agent:` (not `docs:`, `chore:` or `feat:`), without amending an earlier commit?",
      critical: true,
    },
  ];
}();
