import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Positive trigger: a task file with a filled Solution already exists; the
 * user asks to implement, review, commit and push it.
 */
export const ShipTaskTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "ship-task-trigger-pos-1";
  name = "finish a planned task through push";
  skill = "ship-task";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent recognises a ready-task-to-push request and loads the ship-task skill",
  };

  override async setup(sandboxPath: string) {
    const bare = `${sandboxPath}/../ship-task-trigger-remote.git`;
    await new Deno.Command("git", {
      args: ["init", "--bare", bare],
      stdout: "piped",
      stderr: "piped",
    }).output();
    await runGit(sandboxPath, ["remote", "add", "origin", bare]);
    await runGit(sandboxPath, ["push", "-u", "origin", "main"]);
    await runGit(sandboxPath, ["checkout", "-b", "feature/farewell"]);
    await runGit(sandboxPath, ["push", "-u", "origin", "feature/farewell"]);
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
    "The task in documents/tasks/2026/10/add-farewell.md is already planned. Implement it, review the result, commit and push.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `ship-task` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `ship-task`.",
    critical: true,
  }];
}();
