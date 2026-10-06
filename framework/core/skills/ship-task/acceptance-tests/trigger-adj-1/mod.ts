import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

// Adjacent skill: implement — the user wants the task implemented but stops
// before the commit, so the implement-to-push cycle stands down.
export const ShipTaskTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "ship-task-trigger-adj-1";
  name = "implement a task without committing (adjacent)";
  skill = "ship-task";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome: "Agent routes this request away from ship-task",
  };

  override async setup(sandboxPath: string) {
    await Deno.writeTextFile(
      `${sandboxPath}/greet.ts`,
      `/** Builds a greeting for the given name. */
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
`,
    );
    await Deno.mkdir(`${sandboxPath}/documents/tasks/2026/10`, {
      recursive: true,
    });
    await Deno.writeTextFile(
      `${sandboxPath}/documents/tasks/2026/10/add-farewell.md`,
      `---
date: 2026-10-06
status: to do
---
# Add a farewell helper

## Goal

Users need a goodbye message next to the greeting.

## Overview

\`greet.ts\` exports \`greet(name)\`; there is no farewell counterpart.

## Definition of Done

- [ ] \`farewell("Ann")\` returns \`Goodbye, Ann!\`
  - Evidence: \`deno test\` passes

## Solution

1. Add \`greet_test.ts\` with a failing test for \`farewell\`.
2. Export \`farewell(name: string): string\` from \`greet.ts\`.
3. Run \`deno test\`.
`,
    );
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "docs: plan the farewell helper",
    ]);
  }

  userQuery =
    "Implement the task in documents/tasks/2026/10/add-farewell.md, but do not commit or push anything — I want to read the diff first.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `ship-task`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `ship-task/SKILL.md` or calling the `Skill` tool with `ship-task`.",
    critical: true,
  }];
}();
