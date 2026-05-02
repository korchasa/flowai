import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: explaining permission semantics is conceptual education, not
// running any deno command.
export const DenoCliTriggerFalse3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-deno-cli-trigger-false-3";
  name = "explain deno permission model (false-use)";
  skill = "flowai-skill-deno-cli";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Can you explain how Deno's permission model works conceptually? I'm trying to understand why it's different from Node's.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deno-cli`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deno-cli/SKILL.md` or calling the `Skill` tool with `flowai-skill-deno-cli`.",
    critical: true,
  }];
}();
