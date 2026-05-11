import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const DenoCliTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "flowai-skill-deno-cli-trigger-pos-1";
  name = "natural deno test invocation";
  skill = "flowai-skill-deno-cli";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run the unit tests in this project and tell me which ones fail. It's a Deno project.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-deno-cli` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-deno-cli`.",
    critical: true,
  }];
}();
