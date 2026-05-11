import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Happy-path: agent runs the full plan -> implement -> review-and-commit cycle
// for a trivial Deno project. Verifies all three phase gates fire and the work
// lands as a commit.
export const DoWithPlanFullCycleBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-do-with-plan-full-cycle";
  name = "Full plan -> implement -> review-and-commit cycle";
  skill = "flowai-do-with-plan";
  maxSteps = 90;
  stepTimeoutMs = 1_200_000;
  totalTimeoutMs = 2_400_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;
  userPersona =
    "A pragmatic developer. When asked to choose a planning variant, pick the first / simplest one. Keep answers short.";

  userQuery =
    "/flowai-do-with-plan Add a `greet(name: string): string` function to greet.ts that returns `Hello, <name>!`. Add a Deno test for it. Touches FR-GREET.";

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent plans (writes documents/tasks/<YYYY>/<MM>/<slug>.md), implements greet.ts + greet_test.ts, runs `deno test`, reviews with Approve verdict, and commits.",
  };

  checklist = [
    {
      id: "plan_file_written",
      description:
        "Did the agent write a task file at `documents/tasks/<YYYY>/<MM>/<slug>.md` with frontmatter (`date`, `status`, `implements`, `tags`, `related_tasks`) and a filled `## Solution` section?",
      critical: true,
    },
    {
      id: "variant_selection_gate",
      description:
        "Did the agent honour the variant gate in Plan Phase? PASS if EITHER (a) the agent emitted ≥1 variant block (Pros/Cons/Risks) and paused for user input before filling Solution, OR (b) the agent invoked the explicit single-variant exception from `flowai-plan-exp-permanent-tasks` Step 4 ('Only offer 1 variant when the task has an obvious path with no meaningful trade-offs') with a brief justification, and proceeded to write Solution without a multi-variant pause. FAIL only if the agent skipped the gate entirely (no variant analysis AND no explicit single-variant justification).",
      critical: true,
    },
    {
      id: "implement_phase_executed",
      description:
        "Did the agent create greet.ts and greet_test.ts (or equivalents) under TDD — write a failing test first, then make it green? The transcript should show test runs.",
      critical: true,
    },
    {
      id: "check_gate_enforced",
      description:
        "Before transitioning to Review-and-Commit, did the agent confirm the project check (e.g. `deno test`) exits 0 AND `git status` is non-empty?",
      critical: true,
    },
    {
      id: "review_verdict_emitted",
      description:
        "Did the Review-and-Commit Phase emit a structured review report with a verdict on the first line (`Approve | Request Changes | Needs Discussion`)?",
      critical: true,
    },
    {
      id: "commit_landed",
      description:
        "After verdict Approve, did the agent run `git commit` (Conventional Commits format) and is `git status` clean afterward? Inspect git log for a new commit.",
      critical: true,
    },
    {
      id: "no_skill_delegation",
      description:
        "Did the agent execute the inlined steps directly without invoking `flowai-plan-exp-permanent-tasks`, `flowai-skill-review`, `flowai-commit-beta`, `flowai-review-and-commit-beta` via the Skill tool? Inspect tool-call traces.",
      critical: true,
    },
  ];

  override async setup(sandboxPath: string): Promise<void> {
    // Empty setup — fixture already seeds the project. Agent works on a clean tree.
    void sandboxPath;
  }
}();
