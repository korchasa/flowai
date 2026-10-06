import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * End-to-end happy path: user invokes /ship with a simple task; the
 * agent runs Plan (proposes variants, user selects), Implement (TDD cycle),
 * Review (Approve), Commit (one commit with doc sync), Push (clean
 * fast-forward against a bare-repo origin). The checklist verifies every
 * phase transition + post-push verification.
 */
export const ShipFullCycleSuccess = new class extends AcceptanceTestScenario {
  id = "ship-full-cycle-success";
  name = "Plan → Implement → Review → Commit → Push happy path";
  skill = "ship";
  // Long-running multi-phase trace — budget generously.
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
    await Deno.writeTextFile(
      `${sandboxPath}/strings.ts`,
      "/** Capitalize the first character. */\nexport function capitalize(s: string): string {\n  if (s.length === 0) return s;\n  return s[0].toUpperCase() + s.slice(1);\n}\n",
    );
    await runGit(sandboxPath, ["add", "strings.ts"]);
    await runGit(sandboxPath, ["commit", "-m", "init: capitalize"]);
    await runGit(sandboxPath, ["push", "origin", "feature/add-trim"]);
  }

  userQuery =
    "/ship Add a configurable `trim(input, options?)` helper to strings.ts that supports trimming a custom character set (e.g. trim leading commas + spaces), in addition to the default whitespace-only trim. Touches FR-TRIM.";

  userPersona =
    `You are a developer who wants the agent to plan, implement, review, commit, and push a small task end-to-end.
- When the agent presents Plan-Phase variants, pick the simplest one in one short sentence ("Go with variant 1.").
- When the agent writes the task file, expect ALL five frontmatter keys: date, status, implements, tags, related_tasks. If you notice any missing, mention it.
- When the Implement Phase reports results, acknowledge briefly.
- When the Review Phase asks anything, answer affirmatively.
- When the Commit Phase asks about documentation or grouping, accept its defaults.
- When the Push Phase asks anything (upstream, divergence), answer "yes, please push to origin/feature/add-trim".
Keep all answers short and on-topic.`;

  checklist = [
    {
      id: "plan_phase_wrote_task_file",
      description:
        "Did the Plan Phase write a file at `documents/tasks/<YYYY>/<MM>/<slug>.md` with the required frontmatter (`date`, `status: to do`, `implements`, `tags`, `related_tasks`)?",
      critical: true,
    },
    {
      id: "plan_to_implement_gate",
      description:
        "Did the Plan Phase present at least 2 variants AND wait for the user's selection BEFORE writing the Solution section?",
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
