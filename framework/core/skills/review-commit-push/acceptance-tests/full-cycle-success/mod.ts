import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Tail-of-cycle happy path: the work is ALREADY written and sits uncommitted
 * in the tree (a `trim` helper plus its test, written by `setup` after the
 * fixture's init commit so they read as the session's own edits). The user
 * invokes /review-commit-push with no task file. The agent runs Review
 * (Approve), Commit (Conventional Commits), Push (fast-forward against a
 * bare-repo origin) and then the Reflect Phase in the same turn. The
 * checklist verifies that no planning or implementation happens and every
 * phase transition + post-push verification fires.
 */
export const ReviewCommitPushFullCycleSuccess = new class
  extends AcceptanceTestScenario {
  id = "review-commit-push-full-cycle-success";
  name = "Review → Commit → Push → Reflect happy path from an uncommitted diff";
  skill = "review-commit-push";
  maxSteps = 50;
  stepTimeoutMs = 600_000;
  totalTimeoutMs = 1_800_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Shipper",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  override async setup(sandboxPath: string) {
    const bare = `${sandboxPath}/../review-commit-push-remote.git`;
    await new Deno.Command("git", {
      args: ["init", "--bare", bare],
      stdout: "piped",
      stderr: "piped",
    }).output();
    await runGit(sandboxPath, ["remote", "add", "origin", bare]);
    await runGit(sandboxPath, ["push", "-u", "origin", "main"]);
    await runGit(sandboxPath, ["checkout", "-b", "feature/add-trim"]);
    await runGit(sandboxPath, ["push", "-u", "origin", "feature/add-trim"]);
    // The finished, uncommitted work — the composite's input.
    await Deno.writeTextFile(
      `${sandboxPath}/strings.ts`,
      `/** Capitalize the first character of a string. */
export function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s[0].toUpperCase() + s.slice(1);
}

/** Remove leading and trailing whitespace. */
export function trim(s: string): string {
  return s.trim();
}
`,
    );
    await Deno.writeTextFile(
      `${sandboxPath}/strings_test.ts`,
      `import { trim } from "./strings.ts";

function expectEqual(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(\`expected "\${expected}", got "\${actual}"\`);
  }
}

Deno.test("trim removes leading and trailing whitespace", () => {
  expectEqual(trim("  hello  "), "hello");
});

Deno.test("trim handles empty string", () => {
  expectEqual(trim(""), "");
});
`,
    );
  }

  userQuery =
    "/review-commit-push I added a trim helper to strings.ts with tests. Review, commit and push it.";

  userPersona =
    `You are a developer who has finished a small change (a trim helper in strings.ts plus strings_test.ts) and wants it reviewed, committed and pushed in one go.
- There is no task file and you do not want one. If the agent asks for a task file or proposes a plan, reply "No plan needed — the change is done, just review, commit and push."
- When the Review Phase asks anything, answer affirmatively.
- When the Commit Phase asks about documentation or grouping, accept its defaults.
- When the Push Phase asks anything (upstream, divergence), answer "yes, please push to origin/feature/add-trim".
- If the agent asks whether to push a commit it made to the instruction files, reply "yes".
Keep all answers short and on-topic.`;

  checklist = [
    {
      id: "no_plan_or_implement",
      description:
        "Did the agent SKIP planning and implementation — it did NOT ask for a task file, did NOT propose variants, and did NOT rewrite `strings.ts` or `strings_test.ts` beyond what the review itself required (running tests and the project check is expected and does NOT count)?",
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
        "Did the Commit Phase produce at least one git commit using Conventional Commits format (prefix like `feat:`, `test:`, etc.) that contains the trim helper?",
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
    {
      id: "reflect_after_push",
      description:
        "After the push report, did the agent run the Reflect Phase in the same turn — a stated complexity verdict (reflection warranted or not) appears AFTER the push output? A run that ends on the push report with no reflection verdict fails this item.",
      critical: true,
    },
  ];
}();
