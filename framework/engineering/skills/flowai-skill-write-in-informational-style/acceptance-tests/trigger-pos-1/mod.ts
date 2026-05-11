import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const WriteInInformationalStyleTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-write-in-informational-style-trigger-pos-1";
  name = "rewrite marketing copy as neutral";
  skill = "flowai-skill-write-in-informational-style";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Rewrite this product page so it reads as a neutral informational article — no marketing tone, no superlatives, just factual prose.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-write-in-informational-style` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-write-in-informational-style`.",
    critical: true,
  }];
}();
