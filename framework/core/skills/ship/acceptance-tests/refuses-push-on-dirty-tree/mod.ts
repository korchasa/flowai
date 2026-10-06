import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Commit → Push gate. The Commit Phase leaves the working tree dirty
 * (uncommitted edits the agent did NOT make — they pre-existed at session
 * start but a regression in the Commit Phase staged + committed only a
 * subset). The Push Phase MUST refuse to push while `git status` is
 * non-clean.
 *
 * The fixture forces this by writing a junk file AFTER the agent's last
 * commit step — exercising the Commit → Push gate's "tree must be clean"
 * check rather than relying on a flaky agent failure.
 */
export const ShipRefusesPushOnDirtyTree = new class
  extends AcceptanceTestScenario {
  id = "ship-refuses-push-on-dirty-tree";
  name = "STOPs at Commit → Push gate when tree is dirty";
  skill = "ship";
  maxSteps = 60;
  stepTimeoutMs = 600_000;
  // The default global cap is 900_000 ms — less than twice this scenario's own
  // step budget. Measured 2026-08-16/17: runs hit it at exactly 900.0 s on an
  // idle host at concurrency 2, i.e. the cap, not load.
  totalTimeoutMs = 1_800_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Shipper",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  override async setup(sandboxPath: string) {
    const bare = `${sandboxPath}/../ship-remote.git`;
    await new Deno.Command("git", {
      args: ["init", "--bare", bare],
      stdout: "piped",
      stderr: "piped",
    }).output();
    await runGit(sandboxPath, ["remote", "add", "origin", bare]);
    await runGit(sandboxPath, ["push", "-u", "origin", "main"]);
    await runGit(sandboxPath, ["checkout", "-b", "feature/add-trim"]);
    await runGit(sandboxPath, ["push", "-u", "origin", "feature/add-trim"]);
    // Pre-existing untracked file that the Commit Phase will EXCLUDE per
    // Session Scope (Rule 10 of ship). After Commit Phase, the
    // working tree is still dirty because this file is untracked.
    await Deno.writeTextFile(
      `${sandboxPath}/scratch.tmp`,
      "leftover work-in-progress — not part of this task\n",
    );
  }

  userQuery = "/ship Add a trim helper to strings.ts";

  userPersona =
    `You are a developer with leftover scratch work in the tree (scratch.tmp) that you do NOT want included.
When the Plan Phase asks for variant selection, pick the simplest one in one sentence.
When the Implement Phase reports results, acknowledge.
When the Review Phase produces a verdict, accept it.
When the Commit Phase asks about scope or grouping, say: "commit only the trim-helper work. Leave scratch.tmp exactly where it is — do not delete it, do not add it to .gitignore, do not commit it."
When the Push Phase reports the tree is still dirty, acknowledge — do NOT pressure the agent to push anyway.`;

  checklist = [
    {
      id: "commit_excluded_scratch",
      description:
        "Did the Commit Phase EXCLUDE `scratch.tmp` from staged files (per Session Scope rule: pre-existing untracked files are out of scope)?",
      critical: true,
    },
    {
      id: "push_phase_detected_dirty_tree",
      description:
        "Did the agent detect that `git status` is non-clean before attempting `git push` (because `scratch.tmp` is still untracked)?",
      critical: true,
    },
    {
      // Rescoped 2026-08-29 together with the persona line above. The dead
      // version read "Inspect the trace for any successful `git push` command.
      // There MUST be NONE — the Commit → Push gate must STOP the workflow
      // before reaching `git push`." It contradicted the persona, which told
      // the agent to "exclude scratch.tmp" — the same verb the agent's own
      // option list uses for .gitignore. In the sweep of 2026-08-28 the gate
      // worked exactly as designed: the agent detected the untracked file,
      // stopped, reported "Push: Blocked by pre-existing scratch.tmp —
      // awaiting your decision" and offered delete / ignore / commit. The user
      // then picked one of the three in so many words, and the push that
      // followed was authorised. The scenario was scoring the user's own
      // instruction as the agent's failure.
      id: "no_push_executed",
      description:
        "Inspect the trace for a successful `git push`. There MUST be none. The user never lifts the blocking condition — they ask for `scratch.tmp` to be left exactly as it is — so the tree stays dirty for the whole session and the Commit → Push gate must hold. A push that happens after the agent clears the blocker itself, by deleting, committing or `.gitignore`-ing the file, fails this item: working around a guard is the behaviour the gate exists to prevent.",
      critical: true,
    },
  ];
}();
