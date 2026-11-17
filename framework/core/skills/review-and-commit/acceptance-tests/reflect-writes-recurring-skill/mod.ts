import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

// The Reflect Phase writes a new project skill for a project-specific
// procedure the user says recurs (FR-ATOM-REFLECT-GATE.SKILL-LIFECYCLE).
//
// The user spells out a three-step pre-commit check that exists nowhere in
// the project's instructions and says they repeat it every time. The session
// has no error in it; the recurrence statement alone must start the
// reflection, and its result is a new skill holding the three steps.
export const ReviewAndCommitReflectWritesRecurringSkill = new class
  extends AcceptanceTestScenario {
  id = "review-and-commit-reflect-writes-recurring-skill";
  name = "Reflect writes a project skill for a procedure that recurs";
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
      "Agent runs the three steps the user listed, reviews and commits utils.ts, then reflects: the user said this procedure is repeated every time and no instruction file holds it, so the agent writes a new project skill with those three steps, commits it as a separate `agent:` commit and asks whether to push it.",
  };

  override async setup(sandboxPath: string) {
    await runGit(sandboxPath, ["rm", "--cached", "utils.ts"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Remove utils.ts from tracking",
    ]);
  }

  userQuery =
    "/review-and-commit Review and commit the new utility functions. Before the commit do what we do every time a utility is added here: (1) run `deno task test`, (2) run `deno check utils.ts`, (3) compare the exported functions of utils.ts with the list under `## Functions` in README.md and tell me which ones the list is missing. I have to spell these three steps out every single time.";

  userPersona = `You are the developer who wrote the utility functions.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When shown review results, approve them. When asked to confirm commit, approve.
If the agent reports functions missing from the README list, reply: "Noted, I will update the README myself later — go on with the commit."
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
      id: "new_skill_written",
      description:
        "At the end of the run, is there a NEW project skill — a `skills/<name>/SKILL.md` under the IDE config directory (`.claude/`, `.codex/` or the like) that did not exist before and is not one of the framework's own skills — whose steps are the user's pre-commit procedure: run `deno task test`, run `deno check utils.ts` (or the changed file), and compare the exported functions with the `## Functions` list in README.md? All three steps must be there, with the two commands spelled out. Writing the procedure only into AGENTS.md, or only suggesting a skill, fails this item.",
      critical: true,
    },
    {
      id: "skill_has_trigger_description",
      description:
        "Does the new skill's frontmatter carry a `name` and a `description` that says WHEN to use it (e.g. 'Use when a utility function is added…')?",
      critical: true,
    },
    {
      id: "skill_in_agent_commit",
      description:
        "Is the new skill committed in a commit SEPARATE from the one that adds `utils.ts`, with the conventional-commit type `agent` (subject starts with `agent:` or `agent(<scope>):`)?",
      critical: true,
    },
    {
      id: "push_gate_awaited",
      description:
        "After committing the new skill, did the agent ask whether to PUSH that commit and end its turn on that question, waiting for the user's reply?",
      critical: true,
    },
  ];
}();
