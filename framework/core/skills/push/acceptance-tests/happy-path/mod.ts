import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Happy path: a feature branch with an upstream already set, one local
 * commit ahead, clean tree. Push fast-forwards the remote; post-push
 * verification confirms @{u} == HEAD.
 */
export const PushHappyPath = new class extends AcceptanceTestScenario {
  id = "push-happy-path";
  name = "Pushes clean branch with upstream";
  skill = "push";
  maxSteps = 15;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = { PROJECT_NAME: "PushFixture" };
  interactive = true;

  override async setup(sandboxPath: string) {
    // Create a bare repo to act as `origin`, then wire the sandbox to it.
    // Push the initial commit so feature/x has somewhere to fast-forward to.
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
    // Now add another local commit so the push has something to advance.
    await Deno.writeTextFile(`${sandboxPath}/note.txt`, "hello\nworld\n");
    await runGit(sandboxPath, ["commit", "-am", "feat: extend note"]);
  }

  userQuery = "/push push the feature branch";

  userPersona =
    `You are a developer who just committed work on feature/x and wants to push.
The branch already has an upstream (origin/feature/x). Answer questions briefly.`;

  checklist = [
    {
      id: "no_force_flag",
      description:
        "Did the agent push WITHOUT `--force` or `--force-with-lease`? Inspect the trace for the actual git push command issued.",
      critical: true,
    },
    {
      id: "push_succeeded",
      description:
        "Did the push succeed (git push exited 0 and reported the fast-forward)?",
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
