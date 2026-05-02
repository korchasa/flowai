import { BenchmarkSkillScenario } from "@bench/types.ts";

export const TsStrictStyleTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-agent-code-style-ts-strict-trigger-pos-2";
  name = "tightening tsconfig and aligning agent guidelines";
  skill = "flowai-skill-setup-agent-code-style-ts-strict";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I just turned on `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` in tsconfig.json. Update AGENTS.md so the assistant writes code that respects those flags.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-setup-agent-code-style-ts-strict` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-setup-agent-code-style-ts-strict`.",
    critical: true,
  }];
}();
