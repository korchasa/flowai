import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Was 0/3 on 2026-08-20, exit 0 with 2 tool calls per run: the agent piped the
// task straight into `codex exec` from bash and got a 401, never opening this
// skill. Notable because the old description already listed "have <ide> do
// <task>" almost verbatim — a matching trigger phrase loses to a tool the model
// can reach for directly. The rewrite therefore says what the phrases could
// not: shelling out to the other CLI is the wrong path, the isolated context is
// the whole point.
export const DelegateToIdeTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "delegate-to-ide-trigger-pos-1";
  name = "delegate a task to another IDE";
  skill = "delegate-to-ide";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Have Codex implement a small TypeScript helper that capitalises a string, and show me its answer.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `delegate-to-ide` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `delegate-to-ide`.",
    critical: true,
  }];
}();
