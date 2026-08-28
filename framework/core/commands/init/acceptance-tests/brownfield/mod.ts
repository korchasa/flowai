import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const InitBrownfieldBench = new class extends AcceptanceTestScenario {
  id = "init-brownfield";
  name = "Init Brownfield Project with Architecture Discovery";
  skill = "init";
  stepTimeoutMs = 600_000;
  interactive = true;
  maxSteps = 20;
  agentsTemplateVars = {
    PROJECT_NAME: "InitTestProject",
    TOOLING_STACK: "- TypeScript\n- Express",
  };

  override async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
    // Files are copied from fixture/
  }

  userQuery = "/init";

  userPersona =
    `You are a developer running init on an existing Express/TypeScript project.
When the agent asks questions about the project, confirm the defaults it discovers.
When asked to create or overwrite files, approve all changes.
When shown diffs or proposals, approve them.
Keep answers brief and affirmative.`;

  checklist = [
    {
      id: "agents_md_created",
      description: "Was AGENTS.md created?",
      critical: true,
    },
    {
      id: "architecture_discovered",
      description:
        "Does AGENTS.md contain architecture description inferred from the project (Express, TypeScript)?",
      critical: true,
    },
    {
      id: "key_decisions_discovered",
      description:
        "Does AGENTS.md contain key decisions inferred from the project (e.g., using Deno, using TDD)?",
      critical: true,
    },
    {
      id: "doc_rules_present",
      description:
        "Does root AGENTS.md contain a '## Documentation Rules' section?",
      critical: true,
    },
    {
      id: "documents_folder_created",
      description:
        "Was the 'documents/' folder created with requirements.md and design.md?",
      critical: true,
    },
    {
      // Rescoped 2026-08-27 to match the sibling `brownfield-idempotent`, which
      // was repaired on 2026-08-20 and left this scenario behind. The dead
      // version asked "Were development command scripts created (e.g.
      // scripts/check.ts for Deno)?" and its partner asked whether deno.json
      // held "tasks pointing to scripts/". The init skill forbids exactly that:
      // "Do NOT create a `scripts/` directory with wrapper scripts if the
      // project's command runner can handle commands directly" — and this
      // fixture is a Deno project whose deno.json can. Run 1 of 3 on 2026-08-27
      // wrote check/test/dev/prod as plain tasks, which is what the skill asks
      // for, and both critical items failed it.
      id: "dev_commands_created",
      description:
        "Does the project's OWN command runner end up carrying a real standard interface — check / test / dev / prod as tasks in deno.json, scripts in package.json, or targets in a Makefile — each wired to actual tooling rather than a stub echo? Either shape passes: the command inline in the task, or the task calling a script. This item does NOT adjudicate which; the skill bans wrapper scripts only when the runner can do the job directly, and that condition is not decidable from the artefacts.",
      critical: true,
    },
    {
      // Distinct from the item above: this fixture ships deno.json with `test`
      // and `check` already defined, so brownfield init must EXTEND that file
      // rather than replace it or route around it.
      id: "deno_json_tasks_updated",
      description:
        "Does deno.json still exist and carry the standard tasks, with the fixture's pre-existing `test` and `check` entries extended rather than dropped or replaced by a parallel mechanism?",
      critical: true,
    },
    {
      id: "no_hallucinations",
      description:
        "Does AGENTS.md only document tooling and architecture that actually exists in the project (no invented tools or frameworks)?",
      critical: true,
    },
    {
      id: "temp_files_cleaned",
      description:
        "Were temporary files (project_info.json, interview_data.json) removed during cleanup? (FR-INIT.CLEANUP)",
      critical: false,
    },
  ];
}();
