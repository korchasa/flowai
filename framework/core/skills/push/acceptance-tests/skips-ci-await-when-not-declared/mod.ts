import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * AGENTS.md has no `## CI/CD` section (the default — flowai's `init`
 * does not scaffold it; users populate it manually when they have CI).
 * The push atom MUST recognise the absence and skip the CI-await step
 * silently, then reach TERMINATION as if CI-await did not exist. No
 * CI tool should be invoked.
 *
 * Tests FR-ATOM-PUSH.CI-AWAIT "absent → silent skip" branch.
 */
export const PushSkipsCiAwaitWhenNotDeclared = new class
  extends AcceptanceTestScenario {
  id = "push-skips-ci-await-when-not-declared";
  name = "Push skips CI-await silently when AGENTS.md has no ## CI/CD";
  skill = "push";
  maxSteps = 15;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = { PROJECT_NAME: "PushFixture" };
  interactive = true;

  override async setup(sandboxPath: string) {
    const bare = `${sandboxPath}/../push-remote.git`;
    await new Deno.Command("git", {
      args: ["init", "--bare", bare],
      stdout: "piped",
      stderr: "piped",
    }).output();
    await runGit(sandboxPath, ["remote", "add", "origin", bare]);
    await runGit(sandboxPath, ["push", "-u", "origin", "main"]);
    await runGit(sandboxPath, ["checkout", "-b", "feature/x"]);
    await Deno.writeTextFile(`${sandboxPath}/note.txt`, "hello\n");
    await runGit(sandboxPath, ["add", "note.txt"]);
    await runGit(sandboxPath, ["commit", "-m", "feat: add note"]);
    await runGit(sandboxPath, ["push", "-u", "origin", "feature/x"]);
    await Deno.writeTextFile(`${sandboxPath}/note.txt`, "hello\nworld\n");
    await runGit(sandboxPath, ["commit", "-am", "feat: extend note"]);
    // Note: AGENTS.md (already written by the runner from the template)
    // intentionally carries NO `## CI/CD` section. No setup-time edit.
  }

  userQuery = "/push push the feature branch";

  userPersona =
    `You are a developer who just committed work on feature/x and wants to push.
The branch already has an upstream (origin/feature/x). Answer questions briefly.`;

  checklist = [
    {
      id: "push_succeeded",
      description:
        "Did the push succeed (git push exited 0 and fast-forwarded the remote)?",
      critical: true,
    },
    {
      id: "ci_await_skipped_silently",
      description:
        "Did the agent recognise the absence of a `## CI/CD` section in " +
        "AGENTS.md and emit a one-line skip note (text similar to " +
        "`No CI declared in AGENTS.md — skipping CI await.`) before " +
        "reaching TERMINATION?",
      critical: true,
    },
    {
      id: "no_ci_command_executed",
      description:
        "Confirm the trace shows NO attempt to invoke any CI status / " +
        "logs / run-URL command (no `gh run`, `glab ci`, `circleci`, or " +
        "similar). Inspect the actual Bash tool calls.",
      critical: true,
    },
    {
      id: "termination_reached",
      description:
        "Did the agent reach TERMINATION (final report including target " +
        "branch, upstream, pushed SHA, post-push verification result)?",
      critical: false,
    },
  ];
}();
