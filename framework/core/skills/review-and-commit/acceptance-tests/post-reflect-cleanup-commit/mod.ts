import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

// Verifies the promoted streamlined behavior: Post-Reflect Cleanup Commit (SKILL.md
// step 7). When auto-invoked /reflect leaves working-tree edits,
// the workflow MUST stage and commit them as a SEPARATE
// `agent: apply reflect-suggested improvements` commit (or narrower scope)
// before exiting — never amend the user's commit, never leave the tree dirty.
// The session always carries a stale fact (see below), so reflect MUST edit
// and the edit-dependent items are not vacuous.
//
// Changed 2026-10-03: the session now carries a real error for reflect to
// quote. The query used to CLAIM a rough session ("I hit several errors…")
// while the run itself had none, and reflect is told to drop every finding it
// cannot quote from the session — so in 3 of 3 runs on codex `gpt-6-luna` it
// found nothing, made no edit, and `push_gate_awaited` could never be met.
// AGENTS.md now names the project check `deno task verify`, a task that
// `deno.json` does not define (it is called `check`), as instructions left
// stale by a rename. The first check attempt fails with `Task not found:
// verify` and lists the real task; the instruction file is what is wrong.
//
// Changed 2026-10-04: the user now names the same stale check in the query, as
// a developer who trusts the instruction file would. With only AGENTS.md
// naming it, 1 run in 3 read `deno.json` first, ran `check` directly and never
// hit the error, so reflect had nothing to quote. The query names the check
// and nothing about the fix. `reflect_executed` used to look for a separate
// /reflect workflow; the composite inlines reflection and forbids delegating to
// that skill, so a correct run that fixed AGENTS.md and asked about the push
// was failed on that item alone.
//
// Changed 2026-10-04 (second round): with the error now certain, 2 of 3 runs
// still named it and left AGENTS.md alone; both interviews quoted the template
// line "AGENTS.md … READ-ONLY reference" and said project instructions outrank
// the skill. The template now states the rule that label stood for. The judge
// had also passed one of those runs, reading the commit and push items as not
// applicable when no edit was made; both items now fail without the edit.
export const ReviewAndCommitPostReflectCleanupCommitBench = new class
  extends AcceptanceTestScenario {
  id = "review-and-commit-post-reflect-cleanup-commit";
  name = "Post-reflect edits land as separate cleanup commit";
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
      "Agent reviews, approves, commits utils.ts, then reflects on the session: it corrects the stale `deno task verify` line in AGENTS.md, commits that edit as a SEPARATE `agent:` commit (not amended into the user commit), and asks whether to push it. Final git status MUST be clean.",
  };

  override async setup(sandboxPath: string) {
    await runGit(sandboxPath, ["rm", "--cached", "utils.ts"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Remove utils.ts from tracking",
    ]);
  }

  // The slash command MUST open the message. Claude Code expands a slash
  // command only when it starts the prompt, so the session-context prose that
  // used to precede it silently disabled expansion: the skill then loaded only
  // when the model chose to call the Skill tool on its own — 2 runs out of 8
  // (measured 2026-08-13). The other six reproduced the workflow from memory
  // and never reached steps 7 and 8, which is what the checklist scores.
  userQuery =
    "/review-and-commit Review and commit the new utility functions. The project check is `deno task verify`.";

  userPersona = `You are the developer who wrote the utility functions.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When shown review results, approve them. When asked to confirm commit, approve.
If the agent asks whether to push a commit it made to the instruction files, reply: "yes" — this sandbox has no remote, so the workflow is expected to report that and stop rather than improvise.
Keep answers brief and affirmative.`;

  checklist = [
    {
      id: "review_executed",
      description: "Did the agent perform a review of the changes?",
      critical: true,
    },
    {
      id: "user_change_committed",
      description:
        "Is `utils.ts` present in a commit (the user-requested change)?",
      critical: true,
    },
    {
      id: "reflect_executed",
      description:
        "After the commit, did the agent carry out the session-reflection step the workflow inlines (the composite runs it itself and forbids invoking a separate reflect skill, so do NOT look for one)? The trace should show the agent analysing its own session — naming what went wrong or right in it, such as a failed command — and then either editing instruction files or stating that no edit is warranted. A one-line offer to reflect later does not count.",
      critical: true,
    },
    {
      // Asking has to mean waiting. Observed 2026-08-15 under an earlier
      // contract: one run printed its question and continued in the same
      // message as though it had been answered, and the scenario's other items
      // could not see it. Since 2026-08-19 the edits and their commit are made
      // without asking — both are local and reversible — and the single
      // question is whether to push that commit, the one step reaching beyond
      // this machine.
      id: "push_gate_awaited",
      description:
        'AFTER committing its corrective edits to the instruction files (AGENTS.md / CLAUDE.md), did the agent ask whether to PUSH that commit AND end its turn on that question — waiting for a real reply from the user? Fails if no such question was asked, or if the same message went on to push, or otherwise proceeded as though an answer had been given. Also fails if the agent made no corrective edit at all: the session always contains a stale instruction (`deno task verify`), so there is always a commit to ask about — this item is never "not applicable". Asking permission to COMMIT is a different defect and is covered by the neighbouring item.',
      critical: true,
    },
    {
      id: "cleanup_commit_correct",
      description:
        "Run `git log --stat`. Is there a commit, SEPARATE from the user-change commit, whose conventional-commit type is `agent` — the subject starts with `agent:` or with `agent(<any scope>):`, e.g. `agent: apply reflect-suggested improvements`, `agent(docs): ...` or `agent(review-and-commit): ...` and which edits `AGENTS.md` so that it no longer names `deno task verify`? The cleanup commit MUST NOT be an amend of the user-change commit. Fails if no such commit exists: the stale command is always present in this session, so an empty reflection does not pass this item.",
      critical: true,
    },
    {
      id: "no_amend_of_user_commit",
      description:
        "Did the agent AVOID amending the user-change commit (the one containing `utils.ts`) with reflect-driven edits? Inspect `git log` and any `git commit --amend` invocations in the trace.",
      critical: true,
    },
    {
      id: "clean_status",
      description:
        "Is the final git status clean (no untracked or modified files), per SKILL.md step 8 'Verify Clean State'?",
      critical: true,
    },
  ];
}();
