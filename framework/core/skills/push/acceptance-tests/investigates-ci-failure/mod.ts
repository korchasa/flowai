import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * AGENTS.md declares `## CI/CD` with a mock Status command that exits 1
 * (CI red), plus Logs and Run URL commands. The push atom MUST observe
 * the failure, execute Logs and Run URL commands, hand off to the
 * `investigate` skill (Skill tool invocation or `/investigate` slash
 * command), and STOP without reaching the normal TERMINATION report.
 *
 * Tests FR-ATOM-PUSH.CI-AWAIT "red → Investigate Handoff" branch.
 */
export const PushInvestigatesCiFailure = new class
  extends AcceptanceTestScenario {
  id = "push-investigates-ci-failure";
  name = "Push hands off to investigate when CI reports red";
  skill = "push";
  maxSteps = 25;
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

    // Mock Status command: exits 1 (red, terminal failure).
    const statusPath = `${sandboxPath}/mock-status.sh`;
    await Deno.writeTextFile(
      statusPath,
      "#!/usr/bin/env bash\necho 'mock-ci: red' 1>&2\nexit 1\n",
    );
    await Deno.chmod(statusPath, 0o755);

    // Mock Logs command: prints a short failure log.
    const logsPath = `${sandboxPath}/mock-logs.sh`;
    await Deno.writeTextFile(
      logsPath,
      "#!/usr/bin/env bash\n" +
        "echo 'job: test'\n" +
        "echo 'FAIL tests/foo_test.ts::add_returns_sum'\n" +
        "echo '  expected 3, got 2'\n",
    );
    await Deno.chmod(logsPath, 0o755);

    // Mock Run URL command.
    const urlPath = `${sandboxPath}/mock-runurl.sh`;
    await Deno.writeTextFile(
      urlPath,
      "#!/usr/bin/env bash\necho 'https://mock-ci.example/run/12345'\n",
    );
    await Deno.chmod(urlPath, 0o755);

    const agentsPath = `${sandboxPath}/AGENTS.md`;
    const existing = await Deno.readTextFile(agentsPath);
    const ciSection = `

## CI/CD

- **Provider:** mock-ci
- **Status command:** \`bash ${statusPath}\`
- **Logs command:** \`bash ${logsPath}\`
- **Run URL command:** \`bash ${urlPath}\`
`;
    await Deno.writeTextFile(agentsPath, existing + ciSection);
  }

  userQuery = "/push push the feature branch";

  userPersona =
    `You are a developer who just committed work on feature/x and wants to push.
The branch already has an upstream (origin/feature/x). Answer questions briefly.
If the agent asks whether to start investigation, say "yes — proceed".`;

  checklist = [
    {
      id: "push_succeeded",
      description:
        "Did the local push itself succeed (git push exited 0 and fast-" +
        "forwarded the remote) BEFORE the CI await step started?",
      critical: true,
    },
    {
      id: "status_command_invoked",
      description:
        "Did the agent invoke the project's declared Status command — " +
        "specifically `bash <sandbox>/mock-status.sh` (or equivalent " +
        "execution of that script)?",
      critical: true,
    },
    {
      id: "ci_red_detected",
      description:
        "Did the agent observe the Status command exit 1 and report CI " +
        "as red / failed / broken (rather than green or in-progress)?",
      critical: true,
    },
    {
      id: "logs_command_invoked",
      description:
        "Did the agent invoke the Logs command (`bash <sandbox>/mock-" +
        "logs.sh` or equivalent) to gather failed-job logs for the " +
        "investigate handoff?",
      critical: false,
    },
    {
      id: "investigate_invoked",
      description:
        "Did the agent hand off to the `investigate` skill? Acceptable " +
        "evidence: a Skill tool call to `investigate`, a `/investigate` " +
        "slash command invocation, or inline execution of the investigate " +
        "skill's flow with the failed-run URL and logs as context. NOT a " +
        "free-form 'CI failed, please investigate' message.",
      critical: true,
    },
    {
      id: "normal_termination_skipped",
      description:
        "Confirm the agent did NOT reach the normal happy-path TERMINATION " +
        "report (no 'Push complete' / 'TOTAL STOP' message claiming the " +
        "workflow ended successfully). On CI red the atom STOPs after " +
        "investigate, not after TERMINATION.",
      critical: false,
    },
  ];
}();
