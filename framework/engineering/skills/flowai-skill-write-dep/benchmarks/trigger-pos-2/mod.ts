import { BenchmarkSkillScenario } from "@bench/types.ts";

export const WriteDepTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-write-dep-trigger-pos-2";
  name = "DEP for build pipeline overhaul";
  skill = "flowai-skill-write-dep";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Write a DEP proposing we move our build pipeline from Jenkins to GitHub Actions, including alternatives we considered and the migration path.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-write-dep` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-write-dep`.",
    critical: true,
  }];
}();
