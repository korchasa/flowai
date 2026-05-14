import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-deno-cli (running ad-hoc deno commands, managing
// deps, executing tests — not configuring the standard task interface).
export const ConfigureDenoCommandsTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-configure-deno-commands-trigger-adj-1";
  name = "run deno test ad-hoc (adjacent)";
  skill = "flowai-configure-deno-commands";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run `deno test -A` for me and show the failures from the auth module only.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-configure-deno-commands`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-configure-deno-commands/SKILL.md` or calling the `Skill` tool with `flowai-configure-deno-commands`.",
    critical: true,
  }];
}();
