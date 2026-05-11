import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const TsDenoStyleTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "flowai-skill-setup-agent-code-style-ts-deno-trigger-pos-1";
  name = "add deno code-style rules to AGENTS.md";
  skill = "flowai-skill-setup-agent-code-style-ts-deno";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "This is a Deno project. Drop the Deno/TypeScript code-style rules into AGENTS.md so the assistant follows them.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-setup-agent-code-style-ts-deno` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-setup-agent-code-style-ts-deno`.",
    critical: true,
  }];
}();
