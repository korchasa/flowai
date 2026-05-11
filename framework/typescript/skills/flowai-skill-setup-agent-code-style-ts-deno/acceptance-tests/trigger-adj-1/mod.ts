import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-skill-setup-agent-code-style-ts-strict (the user is on
// a Node + tsc strict project, not Deno).
export const TsDenoStyleTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-skill-setup-agent-code-style-ts-deno-trigger-adj-1";
  name = "strict TS project (adjacent)";
  skill = "flowai-skill-setup-agent-code-style-ts-deno";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We have a Node.js TypeScript service with `strict: true` in tsconfig. Add code-style rules to AGENTS.md so the assistant respects strict-mode conventions.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-agent-code-style-ts-deno`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-agent-code-style-ts-deno/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-agent-code-style-ts-deno`.",
    critical: true,
  }];
}();
