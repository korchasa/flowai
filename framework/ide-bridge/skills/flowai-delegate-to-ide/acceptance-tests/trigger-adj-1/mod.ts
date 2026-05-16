import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: `flowai-ai-ide-runner` (one-shot relay / fan-out / comparison
// — child's full output IS the deliverable, isolation buys nothing). When the
// user wants a side-by-side comparison across IDEs, `flowai-delegate-to-ide`
// is NOT the right fit; the relay skill is.
export const DelegateToIdeTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-delegate-to-ide-trigger-adj-1";
  name = "fan-out comparison across IDEs (adjacent)";
  skill = "flowai-delegate-to-ide";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run this prompt in both OpenCode and Claude Code in parallel and present the two answers side-by-side so I can compare them: 'What's one rule of thumb for writing maintainable TypeScript?'";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-delegate-to-ide`? For this query — a side-by-side fan-out comparison — the relay-style `flowai-ai-ide-runner` skill is appropriate, not the delegation wrapper. The agent should either invoke `flowai-ai-ide-runner` or respond directly without reading `flowai-delegate-to-ide/SKILL.md` or calling the `Skill` tool with `flowai-delegate-to-ide`.",
    critical: true,
  }];
}();
