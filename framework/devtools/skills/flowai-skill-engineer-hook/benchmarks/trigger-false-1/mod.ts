import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: vocabulary collision — "hook" in JavaScript/React, not a flowai
// agent-behavior hook.
export const EngineerHookTriggerFalse1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-hook-trigger-false-1";
  name = "react hook question (false-use)";
  skill = "flowai-skill-engineer-hook";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What's a hook in JavaScript and when should I use useEffect versus useMemo in my React component?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-hook`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-hook/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-hook`.",
    critical: true,
  }];
}();
