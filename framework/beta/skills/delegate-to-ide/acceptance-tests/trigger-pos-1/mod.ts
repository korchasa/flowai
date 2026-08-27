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
  // 2026-08-24: the old query ended "and show me its answer", which makes it a
  // one-shot relay — and this skill's own description sends those to
  // `ai-ide-runner`. The agent invoked `ai-ide-runner` and was following the
  // catalog boundary as written, so the scenario was asking for the neighbour.
  // The query now describes a delegation: work handed over, done elsewhere, in
  // its own context. (Codex itself answers 401 in the sandbox — no credentials
  // are mounted — but this checklist only asks which skill was loaded.)
  userQuery =
    "Delegate this to Codex and let it work on its own: rewrite src/util/slug.ts so it handles unicode, and don't do the edit yourself.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `delegate-to-ide` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `delegate-to-ide`.",
    critical: true,
  }];
}();
