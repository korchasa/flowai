import { BenchmarkSkillScenario } from "@bench/types.ts";

export const TsStrictStyleTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-agent-code-style-ts-strict-trigger-pos-3";
  name = "new strict-mode service onboarding";
  skill = "flowai-skill-setup-agent-code-style-ts-strict";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Spinning up a fresh Node + TypeScript service in strict mode. Establish the agent code-style guidelines for the team before we start writing real code.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-setup-agent-code-style-ts-strict` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-setup-agent-code-style-ts-strict`.",
    critical: true,
  }];
}();
