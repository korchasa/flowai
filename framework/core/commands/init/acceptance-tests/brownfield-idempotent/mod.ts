import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const InitBrownfieldIdempotentBench = new class
  extends AcceptanceTestScenario {
  id = "init-brownfield-idempotent";
  name = "Init Brownfield Project Idempotency Check";
  skill = "init";
  stepTimeoutMs = 600_000;
  interactive = true;
  maxSteps = 20;
  agentsTemplateVars = { PROJECT_NAME: "CustomProject" };

  override async setup(sandboxPath: string) {
    // Overwrite template-generated AGENTS.md with custom content containing markers
    // that the checklist verifies are preserved after init re-run
    await Deno.writeTextFile(
      join(sandboxPath, "AGENTS.md"),
      `# YOU MUST\n- STRICTLY FOLLOW YOUR ROLE.\n---\nCUSTOM CONTENT MARKER\n## Project Information\n- Project Name: CustomProject\n`,
    );
  }

  userQuery = "/init";

  userPersona =
    `You are a developer running init on a project that already has AGENTS.md.
When the agent detects existing components, tell it to 'create missing components but preserve existing AGENTS.md'.
When shown diffs, decline all changes (say 'no' to applying diffs).
Confirm all other actions like creating missing documents.`;

  checklist = [
    {
      id: "agents_md_preserved",
      description:
        "Was the existing AGENTS.md preserved (contains 'CUSTOM CONTENT MARKER')?",
      critical: true,
    },
    {
      id: "missing_components_created",
      description:
        "Were missing components (documents/requirements.md) created?",
      critical: true,
    },
    {
      id: "user_asked_about_overwrite",
      description:
        "Did the agent ask the user about overwriting existing files or show diffs before applying?",
      critical: true,
    },
    {
      id: "dev_commands_created",
      description:
        "Does the project's OWN command runner end up carrying a real standard interface — check / test / dev / prod as tasks in deno.json, scripts in package.json, or targets in a Makefile — each wired to actual tooling rather than a stub echo? Either shape passes: the command inline in the task, or the task calling a script. This item does NOT adjudicate which; the skill bans wrapper scripts only when the runner can do the job directly, and that condition is not decidable from the artefacts. Twice stale before 2026-08-20: the item first demanded `scripts/check.ts` and failed a run that used plain tasks, then demanded its absence and failed a run that used a wrapper.",
      critical: true,
    },
  ];
}();
