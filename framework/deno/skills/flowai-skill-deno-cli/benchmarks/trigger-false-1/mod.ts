import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about the CLI workflow itself — not an actual
// request to run any Deno command.
export const DenoCliTriggerFalse1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-deno-cli-trigger-false-1";
  name = "meta question about deno workflow";
  skill = "flowai-skill-deno-cli";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "How does the typical local development workflow look for a Deno project, and which commands do people lean on?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deno-cli`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deno-cli/SKILL.md` or calling the `Skill` tool with `flowai-skill-deno-cli`.",
    critical: true,
  }];
}();
