import { BenchmarkSkillScenario } from "@bench/types.ts";

export const InitBrownfieldIdempotentBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-init-brownfield-idempotent";
  name = "Init Brownfield Project Idempotency Check";
  skill = "flowai-init";
  stepTimeoutMs = 600_000;
  interactive = true;
  maxSteps = 20;

  override async setup(_sandboxPath: string) {
    // Files are copied from fixture/ (AGENTS.md, documents/AGENTS.md, scripts/AGENTS.md, deno.json, src/)
  }

  userQuery = "/flowai-init";

  userPersona =
    `You are a developer running flowai-init on a project that already has AGENTS.md, documents/AGENTS.md, and scripts/AGENTS.md.
When the agent detects existing components, tell it to 'create missing components but preserve existing AGENTS.md files'.
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
      id: "documents_agents_md_preserved",
      description:
        "Was documents/AGENTS.md preserved (contains 'DOCS CUSTOM MARKER')?",
      critical: true,
    },
    {
      id: "scripts_agents_md_preserved",
      description:
        "Was scripts/AGENTS.md preserved (contains 'SCRIPTS CUSTOM MARKER')?",
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
        "Were development command scripts created (e.g., scripts/check.ts)?",
      critical: true,
    },
  ];
}();
