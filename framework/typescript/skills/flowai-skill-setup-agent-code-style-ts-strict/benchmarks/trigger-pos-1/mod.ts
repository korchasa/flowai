import { BenchmarkSkillScenario } from "@bench/types.ts";

export const TsStrictStyleTriggerPos1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-agent-code-style-ts-strict-trigger-pos-1";
  name = "add strict TS rules to AGENTS.md";
  skill = "flowai-skill-setup-agent-code-style-ts-strict";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We run TypeScript with `strict: true` on Node. Add the strict-mode code-style rules to AGENTS.md so the assistant follows them.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-setup-agent-code-style-ts-strict` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-setup-agent-code-style-ts-strict`.",
    critical: true,
  }];
}();
