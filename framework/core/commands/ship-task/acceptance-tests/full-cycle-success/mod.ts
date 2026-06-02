import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Continuation happy path: the user has ALREADY produced a task file with a
 * filled `## Solution` section and invokes /ship-task pointing at that file.
 * The agent runs Implement (TDD cycle), Review (Approve), Commit (one commit
 * with doc sync + task status flip), Push (clean fast-forward against a
 * bare-repo origin). The checklist verifies that Plan is NOT re-run and every
 * phase transition + post-push verification fires.
 */
export const ShipTaskFullCycleSuccess = new class
  extends AcceptanceTestScenario {
  id = "ship-task-full-cycle-success";
  name = "Implement → Review → Commit → Push happy path from ready task file";
  skill = "ship-task";
  // Continuation composite skips Plan, so it is slightly tighter than `ship`.
  maxSteps = 50;
  stepTimeoutMs = 600_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Shipper",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  override async setup(sandboxPath: string) {
    const bare = `${sandboxPath}/../ship-task-remote.git`;
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

  userQuery = "/ship-task documents/tasks/2026/05/add-trim.md";

  userPersona =
    `You are a developer who has ALREADY produced the plan file documents/tasks/2026/05/add-trim.md and now wants the agent to run implement → review → commit → push in one go.
- You will NOT discuss variants — the plan is final. If the agent proposes variants or tries to re-plan, push back briefly ("Plan is final; just execute the Solution.").
- When the Implement Phase reports results, acknowledge briefly.
- When the Review Phase asks anything, answer affirmatively.
- When the Commit Phase asks about documentation or grouping, accept its defaults.
- When the Push Phase asks anything (upstream, divergence), answer "yes, please push to origin/feature/add-trim".
Keep all answers short and on-topic.`;

  checklist = [
    {
      id: "plan_not_re_run",
      description:
        "Did the agent SKIP planning — i.e. it did NOT propose variants and did NOT rewrite the existing `## Solution` section of documents/tasks/2026/05/add-trim.md? Reading the task file at the start is expected and does NOT count as re-planning.",
      critical: true,
    },
    {
      id: "implement_observable_tdd",
      description:
        "Is the TDD cycle observable in the Implement Phase trace — RED (failing test first), GREEN (implementation), CHECK (project check exit 0)?",
      critical: true,
    },
    {
      id: "review_produced_verdict",
      description:
        "Did the Review Phase output a structured report whose FIRST line contains `Approve` (or `Request Changes` / `Needs Discussion`)?",
      critical: true,
    },
    {
      id: "commit_phase_ran",
      description:
        "Did the Commit Phase produce at least one git commit using Conventional Commits format (prefix like `feat:`, `agent:`, etc.)?",
      critical: true,
    },
    {
      id: "no_force_pushed",
      description:
        "Did the Push Phase run `git push` WITHOUT `--force` or `--force-with-lease`?",
      critical: true,
    },
    {
      id: "post_push_verification",
      description:
        "After push, did the agent verify `git rev-parse @{u}` matches local `HEAD`? This is the canonical 'work reached the remote' confirmation.",
      critical: true,
    },
  ];
}();
