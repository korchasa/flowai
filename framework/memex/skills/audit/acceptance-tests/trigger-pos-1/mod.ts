import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const MemexAuditTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "audit-trigger-pos-1";
  name = "audit memex for orphans and dead links";
  skill = "audit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run a full audit on our memex — I want to know about orphan pages, dead SALP references, and any drift between the index and the actual files.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `audit` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `audit`.",
    critical: true,
  }];
}();
