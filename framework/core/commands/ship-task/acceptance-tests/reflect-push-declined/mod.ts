import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * The declined branch of the Reflect Phase — the atom's only destructive step.
 *
 * Refusing the push is a verdict on the edits themselves, so the atom removes
 * its own commit and the file contents together — one `git reset --hard
 * HEAD~1`, behind two read-only guards that hold by construction at this
 * point in the cycle. What it may NOT do is take anything else with it: the
 * feature commit from the Commit Phase, and the push the Push Phase already
 * made, must survive untouched, and the guards are what keeps the reset from
 * reaching them.
 */
export const ShipTaskReflectPushDeclined = new class
  extends AcceptanceTestScenario {
  id = "ship-task-reflect-push-declined";
  name = "Declining the reflect push removes the commit and the edits";
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
    const bare = `${sandboxPath}/../ship-task-declined-remote.git`;
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
- When the Push Phase asks about pushing the feature work, answer "yes, please push to origin/feature/add-trim".
- BUT if the agent asks whether to push a commit it made to the instruction files (AGENTS.md / CLAUDE.md), reply exactly: "no".
Keep all answers short and on-topic.`;

  checklist = [
    {
      id: "feature_work_pushed",
      description:
        "Did the Push Phase push the feature commit for `trim` to the remote — and is that commit still present at the end of the run? The Reflect Phase's undo must not touch it.",
      critical: true,
    },
    {
      id: "reflect_commit_made_then_removed",
      description:
        "Did the agent first commit its instruction-file edits itself (an `agent:` commit, made without asking), and then — after the user answered 'no' — remove that commit, so the final `git log` no longer contains it?",
      critical: true,
    },
    {
      id: "instruction_files_restored",
      description:
        "Are AGENTS.md / CLAUDE.md back to their pre-edit content, with the final `git status` showing no uncommitted changes to them? Leaving the declined edits in the working tree fails this item.",
      critical: true,
    },
    {
      id: "undo_guards_checked_first",
      description:
        "Before the reset, did the agent verify BOTH guards — that its own commit was still HEAD, and that `git status --porcelain` was empty? `git reset --hard` is sanctioned here only behind those two checks; running it without them fails this item even though the end state looks identical.",
      critical: true,
    },
    {
      id: "no_history_rewrite_of_pushed_work",
      description:
        "Did the agent avoid rewriting any commit that had already been pushed — no `--force`, no `--force-with-lease`, and no reset reaching below its own reflect commit?",
      critical: true,
    },
  ];
}();
