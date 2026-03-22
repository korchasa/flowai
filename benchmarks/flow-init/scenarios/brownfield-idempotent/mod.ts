import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const InitBrownfieldIdempotentBench = new class
  extends BenchmarkSkillScenario {
  id = "flow-init-brownfield-idempotent";
  name = "Init Brownfield Project Idempotency Check";
  skill = "flow-init";
  stepTimeoutMs = 300_000;
  interactive = true;
  maxSteps = 20;

  override async setup(_sandboxPath: string) {
    // Files are copied from fixture/ (AGENTS.md, documents/AGENTS.md, scripts/AGENTS.md, deno.json, src/)
  }

  userQuery = "/flow-init";

  userPersona =
    `You are a developer running flow-init on a project that already has AGENTS.md, documents/AGENTS.md, and scripts/AGENTS.md.
When the agent detects existing components, tell it to 'create missing components but preserve existing AGENTS.md files'.
When shown diffs, decline all changes (say 'no' to applying diffs).
Confirm all other actions like creating missing documents.`;

  checklist = [
    {
      id: "agents_md_preserved",
      description:
        "Was the existing AGENTS.md preserved (contains 'CUSTOM CONTENT MARKER')?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "documents_agents_md_preserved",
      description:
        "Was documents/AGENTS.md preserved (contains 'DOCS CUSTOM MARKER')?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "scripts_agents_md_preserved",
      description:
        "Was scripts/AGENTS.md preserved (contains 'SCRIPTS CUSTOM MARKER')?",
      critical: true,
      type: "semantic" as const,
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
      type: "semantic" as const,
    },
    {
      id: "dev_commands_created",
      description:
        "Were development command scripts created (e.g., scripts/check.ts)?",
      critical: true,
    },
  ];
}();
