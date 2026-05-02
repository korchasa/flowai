import { BenchmarkSkillScenario } from "@bench/types.ts";

export const WriteInInformationalStyleTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-in-informational-style-trigger-pos-3";
  name = "strip opinion, keep facts";
  skill = "flowai-skill-write-in-informational-style";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Take my opinionated blog draft about Kubernetes and rewrite it in a dry, neutral, fact-only register suitable for a reference page.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-write-in-informational-style` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-write-in-informational-style`.",
    critical: true,
  }];
}();
