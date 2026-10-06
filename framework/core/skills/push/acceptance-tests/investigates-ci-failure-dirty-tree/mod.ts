import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Same CI-red setup as `push-investigates-ci-failure`, but the developer has
 * uncommitted work in the tree when they push: an edit to `note.txt` and an
 * untracked `wip.txt`. A push does not need a clean tree, and a red build
 * must still be diagnosed — so the investigation runs in a temporary
 * `git worktree` of the pushed SHA, where the tree is clean by construction,
 * and the developer's files stay exactly as they were.
 *
 * The failure this guards against (measured 2026-10-06 on `gpt-6-luna`): the
 * handoff claimed "the worktree is already clean (step 5 verified
 * `@{u} == HEAD`)", which proves only that the commit reached the remote, and
 * `investigate`'s Clean Baseline rule then refused to run in the dirty tree.
 *
 * Tests FR-ATOM-PUSH.CI-AWAIT "red → Investigate Handoff" on a dirty tree.
 */
export const PushInvestigatesCiFailureDirtyTree = new class
  extends AcceptanceTestScenario {
  id = "push-investigates-ci-failure-dirty-tree";
  name = "Push investigates a red CI in a worktree of the pushed SHA";
  skill = "push";
  maxSteps = 30;
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

    // Commit the CI declaration and the mocks with the note change: the
    // runner commits `init` before setup runs, so anything left uncommitted
    // here reaches the agent as a dirty tree, and `investigate`'s Clean
    // Baseline rule then forbids the handoff this scenario tests.
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "feat: extend note"]);

    // The developer's own work in progress, left uncommitted on purpose: one
    // edit to a tracked file and one untracked file. Neither is part of the
    // push, and both must survive the run byte for byte.
    await Deno.writeTextFile(
      `${sandboxPath}/note.txt`,
      "hello\nworld\ndraft line, not ready\n",
    );
    await Deno.writeTextFile(`${sandboxPath}/wip.txt`, "unfinished idea\n");
  }

  userQuery = "/push push the feature branch";

  userPersona =
    `You are a developer who just committed work on feature/x and wants to push.
The branch already has an upstream (origin/feature/x). Answer questions briefly.
You also have uncommitted work in progress in the tree (an edit to note.txt and
a new wip.txt); it is not part of this push. If the agent asks about it, say it
is your unfinished work and must stay exactly as it is.
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
      id: "investigate_invoked",
      description:
        "After the Status command reported red, did the agent hand off to " +
        "the `investigate` skill (a skill invocation, a `/investigate` " +
        "command, or inline execution of its flow with the run URL and " +
        "logs as context) and carry the investigation to a report? A stop " +
        "that only says the tree is dirty, or asks the user to clean it, " +
        "does NOT count.",
      critical: true,
    },
    {
      id: "investigated_in_sha_worktree",
      description:
        "Did the investigation run in a temporary git worktree of the " +
        "pushed commit — a `git worktree add <path> <sha>` where `<sha>` " +
        "is the pushed HEAD (literal SHA or a ref resolving to it), with " +
        "the investigation's commands run inside that path?",
      critical: true,
    },
    {
      id: "wip_untouched",
      description:
        "Did the developer's uncommitted work survive unchanged: `note.txt` " +
        "still holds the line `draft line, not ready` as an uncommitted " +
        "change and `wip.txt` still exists untracked? Any `git stash`, " +
        "`git checkout -- note.txt`, `git restore`, `git reset --hard`, " +
        "`git clean`, or a commit that swallowed these files fails this " +
        "item.",
      critical: true,
    },
    {
      id: "worktree_removed",
      description: "Did the agent remove the temporary worktree when the " +
        "investigation finished (`git worktree remove <path>`, or an " +
        "explicit note that it was left for the user with its path)?",
      critical: false,
    },
    {
      id: "no_fix_applied",
      description:
        "Did the agent leave the fix unapplied — no product file edited " +
        "and no new commit made after the push? The mocked log names a " +
        "test the fixture does not have, so an honest 'cannot reproduce " +
        "from this commit' report passes; a recommended fix is not required.",
      critical: false,
    },
  ];
}();
