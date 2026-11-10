import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: surface vocabulary match ("research") but the user actually wants
// to look up a single property listing — that is a job for a browser tool.
export const DeepResearchTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "deep-research-trigger-false-1";
  name = "research a property listing online";
  skill = "deep-research";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Help me research this one apartment listing online — basically just open the page and tell me whether the address checks out.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `deep-research`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `deep-research/SKILL.md` or calling the `Skill` tool with `deep-research`.",
    critical: true,
  }];
}();
