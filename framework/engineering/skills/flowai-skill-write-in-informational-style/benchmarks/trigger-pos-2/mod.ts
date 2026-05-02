import { BenchmarkSkillScenario } from "@bench/types.ts";

export const WriteInInformationalStyleTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-in-informational-style-trigger-pos-2";
  name = "encyclopedic-tone explainer";
  skill = "flowai-skill-write-in-informational-style";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Draft an explainer about CRDTs in the same encyclopedic, source-cited tone an internal wiki article would use — strictly factual.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-write-in-informational-style` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-write-in-informational-style`.",
    critical: true,
  }];
}();
