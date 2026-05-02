import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: debugging an existing hook is diagnosis, not authoring a new hook.
export const EngineerHookTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-hook-trigger-false-3";
  name = "debug existing hook (false-use)";
  skill = "flowai-skill-engineer-hook";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "My pre-tool hook stopped firing after the last update. The script is still in place — figure out why it's not running anymore.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-hook`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-hook/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-hook`.",
    critical: true,
  }];
}();
