import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * AGENTS.md declares `## CI/CD` with a mock Status command that ALWAYS exits 2
 * (in-progress), plus tight tunables `Poll interval: 5` and
 * `Wall-clock budget: 10` → `ITER_CAP = max(1, ceil(10 / 5)) = 2`. The CI run
 * therefore never reaches a terminal verdict. The push atom MUST poll up to the
 * iteration cap and then STOP with a loud `CI ANOMALY` report (run URL + last
 * status), WITHOUT invoking `investigate` (no failed-job logs yet) and WITHOUT
 * reaching the normal happy-path TERMINATION.
 *
 * Tests FR-ATOM-PUSH.CI-AWAIT "timeout / iteration-cap → STOP anomaly" branch.
 * This backfills the test that was previously deferred; the timeout behaviour is
 * already implemented in framework/atoms/push.md, so the scenario passes against
 * the current atom. A failure here means the timeout branch is actually broken.
 */
export const PushStopsOnCiTimeout = new class extends AcceptanceTestScenario {
  id = "push-stops-on-ci-timeout";
  name = "Push STOPs with a CI anomaly report when CI never finishes";
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

    // Mock Status command: ALWAYS exits 2 (in-progress) → never terminal.
    const statusPath = `${sandboxPath}/mock-status.sh`;
    await Deno.writeTextFile(
      statusPath,
      "#!/usr/bin/env bash\necho 'mock-ci: in progress' 1>&2\nexit 2\n",
    );
    await Deno.chmod(statusPath, 0o755);

    // Mock Run URL command (referenced by the anomaly report).
    const urlPath = `${sandboxPath}/mock-runurl.sh`;
    await Deno.writeTextFile(
      urlPath,
      "#!/usr/bin/env bash\necho 'https://mock-ci.example/run/12345'\n",
    );
    await Deno.chmod(urlPath, 0o755);

    const agentsPath = `${sandboxPath}/AGENTS.md`;
    const existing = await Deno.readTextFile(agentsPath);
    // Tight tunables make the iteration cap cheap: ITER_CAP = ceil(10/5) = 2.
    const ciSection = `

## CI/CD

- **Provider:** mock-ci
- **Poll interval:** 5
- **Wall-clock budget:** 10
- **Status command:** \`bash ${statusPath}\`
- **Run URL command:** \`bash ${urlPath}\`
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
        "Did the local push itself succeed (git push exited 0 and fast-" +
        "forwarded the remote) BEFORE the CI await step started?",
      critical: true,
    },
    {
      id: "status_command_polled",
      description:
        "Did the agent invoke the declared Status command (`bash <sandbox>/" +
        "mock-status.sh` or equivalent) MORE THAN ONCE — i.e. it entered the " +
        "poll loop and re-checked after observing the in-progress (exit 2) " +
        "status, rather than checking just once?",
      critical: true,
    },
    {
      id: "stopped_with_anomaly",
      description:
        "After reaching the iteration cap without a terminal verdict, did the " +
        "agent STOP and report a CI timeout / anomaly (e.g. a `CI ANOMALY` " +
        "message noting iterations elapsed without a terminal status)? The " +
        "agent must treat the still-running build as an unresolved incident, " +
        "not as success.",
      critical: true,
    },
    {
      id: "investigate_not_invoked",
      description:
        "Confirm the agent did NOT invoke the `investigate` skill (no Skill " +
        "tool call to investigate, no `/investigate` invocation). On timeout " +
        "the build is still running (not red), so there are no failed-job " +
        "logs to investigate.",
      critical: true,
    },
    {
      id: "normal_termination_skipped",
      description:
        "Confirm the agent did NOT reach the normal happy-path TERMINATION " +
        "report (no 'Push complete' / success claim). On CI timeout the atom " +
        "STOPs with the anomaly report instead of completing.",
      critical: false,
    },
    {
      id: "run_url_surfaced",
      description:
        "Did the agent invoke the Run URL command (`bash <sandbox>/mock-" +
        "runurl.sh` or equivalent) and surface the run URL in its anomaly " +
        "report so the user can investigate the hanging run?",
      critical: false,
    },
  ];
}();
