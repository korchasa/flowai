import { BenchmarkSkillScenario } from "../../../../../../scripts/benchmarks/lib/types.ts";

export const InitBrownfieldUpdateBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-init-brownfield-update";
  name = "Init Brownfield Project Update with Diff Confirmation";
  skill = "flowai-init";
  stepTimeoutMs = 180_000;

  override async setup(_sandboxPath: string) {
    // Files are copied from fixture/ (AGENTS.md, documents/AGENTS.md, scripts/AGENTS.md, deno.json, src/)
  }

  userQuery = "/flowai-init";

  userPersona =
    `You are a developer re-running flowai-init on an existing project that already has all AGENTS.md files.
When the agent detects existing components, tell it to 'update existing files'.
When shown diffs for AGENTS.md files, confirm applying the changes (say 'yes').
When asked about other actions, confirm them.
You want the framework template updates but also want your custom content preserved.`;

  checklist = [
    {
      id: "diff_shown_root",
      description:
        "Did the agent show a diff or proposed changes for the root AGENTS.md before applying?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "diff_shown_documents",
      description:
        "Did the agent show a diff or proposed changes for documents/AGENTS.md before applying?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "project_rules_preserved",
      description:
        "Were the project-specific rules between --- markers preserved in AGENTS.md (contains 'MY PROJECT SPECIFIC RULES')?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "user_confirmation_requested",
      description:
        "Did the agent ask for user confirmation before applying changes to each file?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "three_files_handled",
      description:
        "Did the agent handle all 3 AGENTS.md files (root, documents/, scripts/)?",
      critical: true,
      type: "semantic" as const,
    },
  ];
}();
