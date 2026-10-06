import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * AGENTS.md declares `## CI/CD` with a mock Status command that exits 0
 * (CI green). The push atom MUST invoke the Status command, observe the
 * green exit, and continue to TERMINATION without invoking `investigate`.
 *
 * Tests FR-ATOM-PUSH.CI-AWAIT "green → TERMINATION" branch.
 */
export const PushAwaitsCiSuccess = new class extends AcceptanceTestScenario {
  id = "push-awaits-ci-success";
  name = "Push awaits CI and proceeds when Status command reports green";
  skill = "push";
  maxSteps = 20;
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

    // Mock CI Status command: exits 0 (green) immediately.
    const statusPath = `${sandboxPath}/mock-status.sh`;
    await Deno.writeTextFile(
      statusPath,
      "#!/usr/bin/env bash\necho 'mock-ci: green'\nexit 0\n",
    );
    await Deno.chmod(statusPath, 0o755);

    // Append `## CI/CD` section to runner-generated AGENTS.md.
    const agentsPath = `${sandboxPath}/AGENTS.md`;
    const existing = await Deno.readTextFile(agentsPath);
    const ciSection = `

## CI/CD

- **Provider:** mock-ci
- **Status command:** \`bash ${statusPath}\`
`;
    await Deno.writeTextFile(agentsPath, existing + ciSection);
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
      id: "status_command_invoked",
      description:
        "Did the agent invoke the project's declared Status command — " +
        "specifically `bash <sandbox>/mock-status.sh` (or equivalent " +
        "execution of that script)? Inspect Bash tool calls in the trace.",
      critical: true,
    },
    {
      id: "ci_green_reported",
      description:
        "Did the agent observe the Status command exit 0 and announce CI " +
        "as green / passed / success (rather than skip, malformed, or " +
        "failed)?",
      critical: true,
    },
    {
      id: "investigate_not_invoked",
      description:
        "Confirm the agent did NOT invoke the `investigate` skill (no " +
        "Skill tool call to investigate, no `/investigate` slash command). " +
        "Investigate is only for CI red, not green.",
      critical: true,
    },
    {
      id: "termination_reached",
      description:
        "Did the agent reach TERMINATION (final report) AFTER observing " +
        "CI green?",
      critical: false,
    },
  ];
}();
