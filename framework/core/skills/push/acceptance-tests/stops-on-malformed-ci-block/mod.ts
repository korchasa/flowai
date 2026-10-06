import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * AGENTS.md declares a `## CI/CD` section but omits the REQUIRED
 * `Status command:` key (only `Provider:` is present). The push atom
 * MUST detect the missing key and STOP fail-fast with a clear message,
 * NOT silently fall back to skip behaviour and NOT continue to
 * TERMINATION.
 *
 * Tests FR-ATOM-PUSH.CI-AWAIT "malformed → fail-fast STOP" branch.
 */
export const PushStopsOnMalformedCiBlock = new class
  extends AcceptanceTestScenario {
  id = "push-stops-on-malformed-ci-block";
  name = "Push STOPs fail-fast when ## CI/CD lacks required Status command";
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

    // Append a malformed `## CI/CD` block to AGENTS.md: Provider is set
    // but Status command is missing.
    const agentsPath = `${sandboxPath}/AGENTS.md`;
    const existing = await Deno.readTextFile(agentsPath);
    const malformed = `

## CI/CD

- **Provider:** mock-ci
`;
    await Deno.writeTextFile(agentsPath, existing + malformed);
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
      id: "malformed_detected",
      description:
        "Did the agent detect the missing `Status command` key in the " +
        "`## CI/CD` block and report it as malformed (e.g. 'CI/CD section " +
        "is malformed', 'required key missing', or similar)?",
      critical: true,
    },
    {
      id: "no_status_command_executed",
      description:
        "Confirm the agent did NOT attempt to invoke any Status / Logs / " +
        "Run-URL command (no CI tool invocation at all). Inspect Bash " +
        "tool calls in the trace.",
      critical: true,
    },
    {
      id: "stopped_before_termination",
      description:
        "Did the agent STOP without reaching the happy-path TERMINATION " +
        "report? (Fail-fast on malformed config — does NOT continue to " +
        "TOTAL STOP / final report).",
      critical: true,
    },
    {
      id: "investigate_not_invoked",
      description:
        "Confirm the agent did NOT invoke `investigate` (malformed config " +
        "is not a CI failure — the failure mode is missing config, not a " +
        "broken build).",
      critical: false,
    },
  ];
}();
