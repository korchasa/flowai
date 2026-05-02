import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerSkillTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-skill-trigger-pos-3";
  name = "agent-invocable capability";
  skill = "flowai-skill-engineer-skill";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Author a reusable capability the assistant can auto-discover whenever it sees a request to migrate a Postgres schema. What does the package look like?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-skill` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-skill`.",
    critical: true,
  }];
}();
