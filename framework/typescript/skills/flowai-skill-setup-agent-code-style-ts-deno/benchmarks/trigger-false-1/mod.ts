import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about what the skill covers, not a request to apply it.
export const TsDenoStyleTriggerFalse1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-agent-code-style-ts-deno-trigger-false-1";
  name = "meta question about deno style guidelines";
  skill = "flowai-skill-setup-agent-code-style-ts-deno";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What kinds of Deno-flavored TypeScript conventions usually live in an AGENTS.md file? Just trying to understand the shape of it.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-agent-code-style-ts-deno`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-agent-code-style-ts-deno/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-agent-code-style-ts-deno`.",
    critical: true,
  }];
}();
