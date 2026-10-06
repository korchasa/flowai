import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * First push of a new branch (no upstream). The agent MUST ask the user
 * before running `git push --set-upstream`. The user-persona script answers
 * "yes" so the push proceeds with `-u`.
 */
export const PushSetsUpstreamOnFirstPush = new class
  extends AcceptanceTestScenario {
  id = "push-sets-upstream-on-first-push";
  name = "Asks then sets upstream on first push";
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
    // New branch with no upstream yet.
    await runGit(sandboxPath, ["checkout", "-b", "feature/y"]);
    await Deno.writeTextFile(`${sandboxPath}/y.txt`, "y\n");
    await runGit(sandboxPath, ["add", "y.txt"]);
    await runGit(sandboxPath, ["commit", "-m", "feat: add y"]);
  }

  userQuery = "/push push feature/y";

  userPersona =
    `You are a developer on a brand-new branch feature/y. When the agent asks whether to
\`git push --set-upstream origin feature/y\`, answer "yes, please set upstream".
Keep all answers short and affirmative.`;

  checklist = [
    {
      id: "asked_before_upstream",
      description:
        "Did the agent ASK the user before running `git push --set-upstream`? Look in the trace for a chat message that explicitly seeks confirmation (e.g. 'Should I run git push --set-upstream …?') BEFORE the actual push command was issued.",
      critical: true,
    },
    {
      id: "pushed_with_u_flag",
      description:
        "After user confirmation, did the agent run `git push -u origin feature/y` (or the equivalent `--set-upstream origin feature/y`)?",
      critical: true,
    },
    {
      id: "post_push_verification",
      description:
        "Did the agent verify `git rev-parse @{u}` equals `git rev-parse HEAD` after the push?",
      critical: false,
    },
  ];
}();
