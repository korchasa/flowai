import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const MemexAuditTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "flowai-skill-memex-audit-trigger-pos-1";
  name = "audit memex for orphans and dead links";
  skill = "flowai-skill-memex-audit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run a full audit on our memex — I want to know about orphan pages, dead wikilinks, and any drift between the index and the actual files.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-memex-audit` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-memex-audit`.",
    critical: true,
  }];
}();
