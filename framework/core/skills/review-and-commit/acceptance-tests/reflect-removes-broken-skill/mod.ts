import {
  AcceptanceTestScenario,
  type SandboxContext,
} from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

// The Reflect Phase removes a project skill whose whole procedure is dead
// (FR-ATOM-REFLECT-GATE.SKILL-LIFECYCLE).
//
// The project carries a `changelog-entry` skill. Every step of it names
// something the repository does not have: a `changelog:add` task, a
// `scripts/changelog.ts` script and a `CHANGELOG.yaml` file. The user asks the
// agent to follow it, the first step fails, and the user says the changelog
// was dropped months ago. Nothing else in the project refers to the skill, so
// the reflection removes its directory instead of rewriting it.
//
// The skill is written and committed in setup, after the initial commit, so
// the judge does not read it as an agent edit.
export const ReviewAndCommitReflectRemovesBrokenSkill = new class
  extends AcceptanceTestScenario {
  id = "review-and-commit-reflect-removes-broken-skill";
  name = "Reflect removes a project skill whose procedure no longer exists";
  skill = "review-and-commit";
  maxSteps = 40;
  stepTimeoutMs = 480_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `deno task check` — the project check: format, lint and all tests.",
  };
  interactive = true;

  override sandboxState = {
    commits: [{
      message: "Remove utils.ts from tracking",
      files: ["utils.ts"],
    }],
    untracked: ["utils.ts"],
    expectedOutcome:
      "Agent reviews and commits utils.ts. The `changelog-entry` project skill fails at its first step and the user says the changelog was dropped. In the reflection the agent removes the `changelog-entry` skill directory in a separate `agent:` commit and asks whether to push it.",
  };

  override async setup(sandboxPath: string, ctx: SandboxContext) {
    await runGit(sandboxPath, ["rm", "--cached", "utils.ts"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Remove utils.ts from tracking",
    ]);
    const dir = `${sandboxPath}/${ctx.configDir}/skills/changelog-entry`;
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      `${dir}/SKILL.md`,
      [
        "---",
        "name: changelog-entry",
        "description: Use when committing a change in this project — adds the change to the changelog before the commit.",
        "---",
        "",
        "# Changelog entry",
        "",
        '1. Run `deno task changelog:add "<one-line summary of the change>"`.',
        "2. Check that `CHANGELOG.yaml` gained exactly one entry: `deno run -A scripts/changelog.ts verify`.",
        "3. Stage `CHANGELOG.yaml` together with the change.",
        "",
      ].join("\n"),
    );
    await runGit(sandboxPath, [
      "add",
      "-f",
      `${ctx.configDir}/skills/changelog-entry`,
    ]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "docs: add the changelog-entry project skill",
    ]);
  }

  userQuery =
    "/review-and-commit Review and commit the new utility functions. Add the changelog entry the way the `changelog-entry` project skill says.";

  userPersona = `You are the developer who wrote the utility functions.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When shown review results, approve them. When asked to confirm commit, approve.
If the agent reports that the changelog task, script or file does not exist, or asks what to do about the changelog, reply: "Right — the changelog was dropped from this project months ago, nothing here uses it any more. Commit without it."
If the agent asks whether to push a commit it made to the instruction or skill files, reply: "yes" — this sandbox has no remote, so the workflow is expected to report that and stop.
Keep all other answers brief and affirmative.`;

  checklist = [
    {
      id: "user_change_committed",
      description:
        "Is `utils.ts` present in a commit (the user-requested change)?",
      critical: true,
    },
    {
      id: "broken_skill_removed",
      description:
        "At the end of the run, is the `changelog-entry` project skill gone — no `skills/changelog-entry/SKILL.md` under the IDE config directory (`.claude/`, `.codex/` or the like) in the working tree? Every step of that skill names a task, script or file the repository does not have, the user confirmed the changelog was dropped, and nothing else refers to the skill. Leaving the skill in place, or rewriting it into a different procedure, fails this item.",
      critical: true,
    },
    {
      id: "removal_in_agent_commit",
      description:
        "Run `git log --stat`. Is the removal of the skill committed in a commit SEPARATE from the commit that adds `utils.ts`, with the conventional-commit type `agent` (subject starts with `agent:` or `agent(<scope>):`)?",
      critical: true,
    },
    {
      id: "removal_reported",
      description:
        "Did the agent name the removed skill and the reason (its commands and files no longer exist) in its list of reflect edits, so the user can judge the removal without opening a diff?",
      critical: true,
    },
    {
      id: "push_gate_awaited",
      description:
        "After committing the removal, did the agent ask whether to PUSH that commit and end its turn on that question, waiting for the user's reply?",
      critical: true,
    },
  ];
}();
