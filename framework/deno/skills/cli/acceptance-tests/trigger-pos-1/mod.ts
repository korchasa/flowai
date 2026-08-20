import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// The query was retargeted on 2026-08-20. The old one — "run the unit tests in
// this project and tell me which ones fail" — sat in the domain but picked its
// most trivial slice: `deno test` is the one Deno command a model runs without
// consulting anything, and 3 runs of 3 showed exactly that (2-5 tool calls, no
// skill). The description no longer claims that slice either; it now names what
// the reference actually adds — permission flags, `deno task`, unstable opt-ins
// and dependency management. This query asks for all three of those at once.
export const DenoCliTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "cli-trigger-pos-1";
  name = "deno dependency and task wiring";
  skill = "cli";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Add the JSR http package to this Deno project and give me a `dev` task in deno.json that serves src/main.ts with the permissions it needs.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `cli` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `cli`.",
    critical: true,
  }];
}();
