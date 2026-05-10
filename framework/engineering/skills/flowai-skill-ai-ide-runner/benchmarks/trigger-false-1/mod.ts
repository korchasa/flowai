import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: tweaking the IDE itself, not running a prompt across IDE CLIs.
export const AiIdeRunnerTriggerFalse1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-ai-ide-runner-trigger-false-1";
  name = "edit IDE settings";
  skill = "flowai-skill-ai-ide-runner";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Update my Cursor settings.json to use a darker theme and a smaller editor font.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-ai-ide-runner`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-ai-ide-runner/SKILL.md` or calling the `Skill` tool with `flowai-skill-ai-ide-runner`.",
    critical: true,
  }];
}();
