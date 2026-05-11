import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Regression scenario: pre-flight project check must NOT run stack-specific
 * verification commands when the corresponding manifest is absent.
 *
 * Bug: on a non-Deno project the agent runs `deno task check` (or
 * `deno check <file>`) which creates `deno.lock` as a side effect; that lock
 * file then gets swept into the commit by Phase 2.
 *
 * Fixture: pure Python project (main.py + requirements.txt + README.md).
 * NO deno.json, NO package.json, NO Makefile.
 */
export const NonDenoProjectBench = new class extends AcceptanceTestScenario {
  id = "flowai-review-and-commit-non-deno-project";
  name =
    "Review-and-commit on a non-Deno project must NOT run deno commands or create deno.lock";
  skill = "flowai-review-and-commit";
  maxSteps = 25;
  stepTimeoutMs = 420_000;
  // No TOOLING_STACK hint — force the agent to detect the stack from the
  // filesystem rather than from AGENTS.md. The bug being tested is: agent
  // blindly runs `deno task check` because it's the first example in the
  // pre-flight instructions, without checking whether deno.json exists.
  agentsTemplateVars = {
    PROJECT_NAME: "TextStats",
  };
  interactive = true;

  override sandboxState = {
    commits: [{
      message: "Remove main.py from tracking",
      files: ["main.py"],
    }],
    untracked: ["main.py"],
    expectedOutcome:
      "Agent reviews untracked main.py on a Python (non-Deno) project. Pre-flight check must NOT run any `deno *` command. `deno.lock` must NOT appear in the working tree or in any commit. Agent commits main.py.",
  };

  override async setup(sandboxPath: string) {
    // main.py is committed in `init` by the runner. Untrack it so the agent
    // sees it as an untracked file to review and commit.
    await runGit(sandboxPath, ["rm", "--cached", "main.py"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Remove main.py from tracking",
    ]);
  }

  userQuery =
    "/flowai-review-and-commit Review and commit the new main.py text statistics utility.";

  userPersona =
    `You are a Python developer who just added a small text statistics utility (main.py).
The project uses Python 3 stdlib only — there is NO deno.json, NO package.json, NO Makefile.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When shown review results, approve them. When asked to confirm commit, approve.
Keep answers brief and affirmative.`;

  checklist = [
    {
      id: "no_deno_lock_in_status",
      description:
        "Check the FINAL GIT STATUS section of the evidence: the file `deno.lock` MUST NOT appear there in any state (untracked, modified, staged, or otherwise). The fixture is a pure Python project with no deno.json — `deno.lock` should never exist in the working tree. If `deno.lock` is present, this check FAILS.",
      critical: true,
    },
    {
      id: "no_deno_lock_in_commits",
      description:
        "Check the GIT LOG and GIT DIFF (init..HEAD) sections of the evidence: `deno.lock` MUST NOT appear as an added or modified file in any of the agent's commits. If any commit contains `deno.lock`, this check FAILS.",
      critical: true,
    },
    {
      id: "no_deno_commands_executed",
      description:
        "Check the agent conversation log: did the agent execute any `deno *` command (e.g., `deno task check`, `deno check`, `deno fmt`, `deno lint`, `deno test`, `deno cache`, `deno run`)? It MUST NOT have. The project has no deno.json — running stack-specific commands when the corresponding manifest is absent is forbidden by the skill. If you find ANY `deno *` invocation in the logs, this check FAILS.",
      critical: true,
    },
    {
      id: "stack_aware_check_or_skip",
      description:
        "In the review report (Phase 1), did the agent EITHER (a) explicitly note 'No automated checks configured' (or equivalent — e.g., 'no project check command found for Python stack'), OR (b) attempt a Python-specific check command such as `ruff check`, `pytest`, `python -m py_compile`, `flake8`, or similar? Either is acceptable. What is NOT acceptable: trying `deno *` or `npm *` commands on a Python project.",
      critical: true,
    },
    {
      id: "main_py_committed",
      description:
        "Check the GIT LOG section: is `main.py` present in at least one of the agent's new commits (commits created after 'Remove main.py from tracking')? The user explicitly asked to commit it.",
      critical: true,
    },
    {
      id: "clean_final_status",
      description:
        "Check the FINAL GIT STATUS section: after the agent finishes, the working tree must be clean (no untracked, no modified, no staged files). Specifically, no `deno.lock`, no temp files, no leftover artifacts.",
      critical: true,
    },
    {
      id: "review_completed_before_commit",
      description:
        "Did the agent complete Phase 1 (review with verdict) BEFORE starting Phase 2 (commit)? Look for a structured review report with a verdict line (Approve/Request Changes/Needs Discussion).",
      critical: false,
    },
  ];
}();
