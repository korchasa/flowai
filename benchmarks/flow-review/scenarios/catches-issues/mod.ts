import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";
import {
  runGit,
  setupGitRepo,
} from "../../../../scripts/benchmarks/lib/utils.ts";

export const CatchesIssuesBench = new class extends BenchmarkSkillScenario {
  id = "flow-review-catches-issues";
  name = "Review catches code quality issues";
  skill = "flow-review";
  maxSteps = 15;
  stepTimeoutMs = 180_000;

  override async setup(sandboxPath: string) {
    await setupGitRepo(sandboxPath);

    // Initial commit with README and AGENTS.md
    await runGit(sandboxPath, ["add", "README.md", "AGENTS.md"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Initial commit with auth spec",
    ]);

    // auth.ts has multiple issues:
    // - hardcoded secret
    // - console.log with credentials
    // - TODO marker
    // - `any` types
    // - no email validation (README promises it)
    // - no error handling for invalid credentials
  }

  userQuery = "/flow-review The login function is implemented, please review";

  checklist = [
    {
      id: "diff_collected",
      description:
        "Did the agent collect git diff or git status to identify the changes?",
      critical: true,
    },
    {
      id: "verdict_reject",
      description:
        "Did the review verdict indicate Request Changes (not Approve)?",
      critical: true,
    },
    {
      id: "found_secret",
      description:
        "Did the agent flag the hardcoded secret as a critical issue?",
      critical: true,
    },
    {
      id: "found_console_log",
      description: "Did the agent flag the console.log that leaks credentials?",
      critical: true,
    },
    {
      id: "found_missing_validation",
      description:
        "Did the agent flag missing email validation (promised in README)?",
      critical: false,
    },
    {
      id: "found_any_types",
      description: "Did the agent flag the use of `any` types?",
      critical: false,
    },
    {
      id: "no_commit",
      description:
        "The agent did NOT commit any changes (review only, not commit)?",
      critical: true,
    },
  ];
}();
