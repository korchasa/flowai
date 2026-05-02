import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-adapt-instructions (re-syncing AGENTS.md to the
// installed template — not adding a new code-style section).
export const TsDenoStyleTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-agent-code-style-ts-deno-trigger-adj-3";
  name = "re-sync AGENTS.md with template (adjacent)";
  skill = "flowai-skill-setup-agent-code-style-ts-deno";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "After the last `flowai sync`, the AGENTS.md template drifted from what we have committed. Bring our AGENTS.md back in line with the new template, keeping our project sections.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-agent-code-style-ts-deno`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-agent-code-style-ts-deno/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-agent-code-style-ts-deno`.",
    critical: true,
  }];
}();
