import { join } from "@std/path";
import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const InitBrownfieldIdempotentBench = new class
  extends BenchmarkSkillScenario {
  id = "flow-init-brownfield-idempotent";
  name = "Init Brownfield Project Idempotency Check";
  skill = "flow-init";

  async setup(sandboxPath: string) {
    // Files are copied from fixture/
  }

  userQuery = "/flow-init";

  userPersona =
    `You are a developer running flow-init on a project that already has AGENTS.md.
When the agent detects existing components, tell it to 'create missing components but preserve existing AGENTS.md'.
Confirm all other actions.`;

  checklist = [
    {
      id: "agents_md_preserved",
      description:
        "Was the existing AGENTS.md preserved (contains 'CUSTOM CONTENT MARKER')?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "missing_components_created",
      description:
        "Were missing components (rules, documents/requirements.md) created?",
      critical: true,
    },
    {
      id: "user_asked_about_overwrite",
      description:
        "Did the agent ask the user about overwriting existing files?",
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
