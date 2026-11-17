import {
  AcceptanceTestScenario,
  type SandboxContext,
} from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

// The Reflect Phase repairs one wrong step of a project skill and leaves the
// rest of the file alone (FR-ATOM-REFLECT-GATE.SKILL-LIFECYCLE).
//
// The project carries a `project-check` skill whose first step runs
// `deno task verify`, a task `deno.json` does not define (it is `check`). The
// user asks for the check "the way the skill says", the command fails, and the
// reflection corrects that one command in the skill file.
export const ReviewAndCommitReflectPatchesWrongSkill = new class
  extends AcceptanceTestScenario {
  id = "review-and-commit-reflect-patches-wrong-skill";
  name = "Reflect corrects the one wrong step of a project skill";
  skill = "review-and-commit";
  maxSteps = 40;
  stepTimeoutMs = 480_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- The project check is the procedure in the `project-check` project skill.",
  };
  interactive = true;

  override sandboxState = {
    commits: [{
      message: "Remove utils.ts from tracking",
      files: ["utils.ts"],
    }],
    untracked: ["utils.ts"],
    expectedOutcome:
      "Agent reviews and commits utils.ts. The `project-check` skill's first step fails with `Task not found: verify`. In the reflection the agent changes that command to `deno task check` in the skill file, leaves the other steps as they were, commits the edit as a separate `agent:` commit and asks whether to push it.",
  };

  override async setup(sandboxPath: string, ctx: SandboxContext) {
    await runGit(sandboxPath, ["rm", "--cached", "utils.ts"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Remove utils.ts from tracking",
    ]);
    const dir = `${sandboxPath}/${ctx.configDir}/skills/project-check`;
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      `${dir}/SKILL.md`,
      [
        "---",
        "name: project-check",
        "description: Use when the project check has to be run in this project — before a commit, or when asked to verify the code.",
        "---",
        "",
        "# Project check",
        "",
        "1. Run `deno task verify` from the repository root.",
        "2. Read the whole output. A formatting failure names the file; a lint failure names the rule and the line.",
        "3. Fix what the output reports, then run the command from step 1 again until it exits 0.",
        "4. Report the final exit code and the number of tests that ran.",
        "",
      ].join("\n"),
    );
    await runGit(sandboxPath, [
      "add",
      "-f",
      `${ctx.configDir}/skills/project-check`,
    ]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "docs: add the project-check project skill",
    ]);
  }

  userQuery =
    "/review-and-commit Review and commit the new utility functions. Run the project check the way the `project-check` project skill says.";

  userPersona = `You are the developer who wrote the utility functions.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When shown review results, approve them. When asked to confirm commit, approve.
If the agent reports that \`deno task verify\` does not exist, or asks which check to run, reply: "\`verify\` was renamed to \`check\` a while ago; run \`deno task check\`."
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
      id: "skill_step_corrected",
      description:
        "At the end of the run, does the `project-check` skill file (`skills/project-check/SKILL.md` under the IDE config directory) tell the reader to run `deno task check`, and no longer `deno task verify`? Correcting only AGENTS.md, or only mentioning the problem, fails this item.",
      critical: true,
    },
    {
      id: "delta_edit_only",
      description:
        "Is the edit to the skill file a small one — the wrong command replaced, at most one sentence added — with steps 2, 3 and 4 of the skill and its frontmatter still present in substance? Inspect `git show --stat` and the diff of the `agent:` commit. A rewrite of the whole file fails this item.",
      critical: true,
    },
    {
      id: "edit_in_agent_commit",
      description:
        "Is the skill edit committed in a commit SEPARATE from the one that adds `utils.ts`, with the conventional-commit type `agent` (subject starts with `agent:` or `agent(<scope>):`)?",
      critical: true,
    },
    {
      id: "push_gate_awaited",
      description:
        "After committing the edit, did the agent ask whether to PUSH that commit and end its turn on that question, waiting for the user's reply?",
      critical: true,
    },
  ];
}();
