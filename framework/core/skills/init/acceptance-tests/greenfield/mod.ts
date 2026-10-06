import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const InitGreenfieldBench = new class extends AcceptanceTestScenario {
  id = "init-greenfield";
  name = "Init Greenfield Project with Interview";
  skill = "init";
  stepTimeoutMs = 600_000;
  interactive = true;
  maxSteps = 20;
  agentsTemplateVars = {
    PROJECT_NAME: "InitTestProject",
  };

  override async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
    // Empty directory for greenfield
  }

  userQuery = "/init";

  userPersona = `You are a developer starting a new project called 'MyProject'.
Your vision is 'World domination'. 
Target audience is 'Everyone'. 
The problem is 'Boredom' and the solution is 'Fun'. 
There are no major risks. 
The tech stack is 'Deno' and 'TypeScript'. 
The architecture is 'Monolith'. 
When the agent asks for project details or starts an interview, provide these details. 
Always confirm when asked to overwrite or create files.
Always confirm when asked to apply diffs.`;

  checklist = [
    {
      id: "interview_started",
      description:
        "Did the agent start an interview to gather project details?",
      critical: true,
    },
    {
      id: "agents_md_created",
      description:
        "Was the root AGENTS.md written with the project's own information after the interview (simulated or actual)? The benchmark harness places a generic AGENTS.md in the sandbox BEFORE the agent starts, so the file always pre-exists — judge whether the agent filled it with the interview answers (project name, vision, stack, architecture, commands), not whether it created the file from nothing.",
      critical: true,
    },
    {
      id: "doc_rules_present",
      description:
        "Does root AGENTS.md contain a '## Documentation Rules' section?",
      critical: true,
    },
    {
      id: "interconnectedness_principle_present",
      description:
        "Does root AGENTS.md contain a '## Interconnectedness Principle' section declaring ONE mechanism for ALL cross-references — doc-to-doc AND code-to-doc — namely the SALP grammar, with an anchor token declaring a target and a reference token pointing at one? Wording may vary; what must be there is a single named mechanism covering both directions. (FR-DOC-LINKS). Stale until 2026-08-20: this item demanded GFM markdown links and rejected custom anchor forms, which is what SALP is — the template moved and the checklist did not.",
      critical: true,
    },
    {
      id: "srs_sds_structure",
      description:
        "Do the generated SRS and SDS follow the pack's SRS/SDS templates? The SRS must have the numbered sections '## 1. Intro' … '## 6. Acceptance' with the template's bold fields (e.g. '**Desc:**', '**Def/Abbr:**', '**Context:**'), and any FR entry under '## 3. Functional Reqs' must carry '**Desc:**', '**Scenario:**', '**Acceptance:**' and '**Status:**' (a greenfield project may have zero FR entries yet — that is fine); the SDS must have '## 3. Components' whose entries carry '**Purpose:**', '**Interfaces:**' and '**Deps:**'. These section and field names are not in AGENTS.md — the agent has to read the SRS/SDS templates to get them (FR-INIT). Judge from the files' actual contents; if the evidence does not show them, say so rather than guessing.",
      critical: true,
    },
    {
      id: "dev_commands_configured",
      description:
        "Were development commands configured with real scripts (not just stub echo commands)?",
      critical: false,
    },
    {
      id: "no_hallucinations",
      description:
        "Does AGENTS.md only document tooling and architecture explicitly provided by user (Deno, TypeScript, Monolith) — no invented frameworks or tools?",
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
