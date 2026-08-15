import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Adjacent trigger: JiT regression probing reads like a separate capability but
 * belongs to `review`, so this wording must route there.
 *
 * The staged diff and the green test are real because the query asserts both
 * ("tests pass", "my staged diff"). Against an empty sandbox the agent checked
 * git first, found a clean tree and no diff to probe, and answered with three
 * options instead of invoking anything (2026-08-13) — the same false-premise
 * defect already fixed in the two `trigger-pos-1` scenarios. A scenario whose
 * premise is false measures the agent's diligence about missing input, not the
 * skill description it claims to test.
 */
export const ReviewTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "review-trigger-adj-1";
  name = "JIT regression wording routes to review";
  skill = "review";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  /**
   * Claude Code ships its own `code-review` built-in, and it answers this exact
   * request. The bench isolates the developer's `~/.claude/skills/` but cannot
   * uninstall an IDE built-in — verified absent from both `<sandbox>/.claude`
   * and `bench-home`, so it arrives with the CLI itself. A five-run series on
   * 2026-08-15 split 4/5 for that reason alone: the losing run invoked
   * `code-review` (with `ReportFindings` and nine subagents) and did the work.
   * Either capability answering this wording is the passing outcome here.
   */
  equivalentSkills = ["code-review"];

  override sandboxState = {
    commits: [],
    modified: ["discount.ts"],
    expectedOutcome:
      "Agent recognises JiT regression probing over a staged diff as review's job and loads the review skill",
  };

  override async setup(sandboxPath: string) {
    // Baseline: a module and a test that passes against it, committed, so the
    // staged change below is a genuine modification diff rather than a new file.
    await Deno.writeTextFile(
      `${sandboxPath}/discount.ts`,
      `/** Applies a percentage discount once the price clears the threshold. */
export function applyDiscount(price: number, threshold: number): number {
  return price > threshold ? price * 0.9 : price;
}
`,
    );
    await Deno.writeTextFile(
      `${sandboxPath}/discount_test.ts`,
      `import { assertEquals } from "jsr:@std/assert";
import { applyDiscount } from "./discount.ts";

Deno.test("discounts a price above the threshold", () => {
  assertEquals(applyDiscount(200, 100), 180);
});

Deno.test("leaves a price below the threshold alone", () => {
  assertEquals(applyDiscount(50, 100), 50);
});
`,
    );
    await runGit(sandboxPath, ["add", "discount.ts", "discount_test.ts"]);
    await runGit(sandboxPath, ["commit", "-m", "Add discount helper"]);

    // The subtle change the query is worried about: the boundary moves, and
    // neither committed test covers price === threshold, so the suite stays green.
    await Deno.writeTextFile(
      `${sandboxPath}/discount.ts`,
      `/** Applies a percentage discount once the price clears the threshold. */
export function applyDiscount(price: number, threshold: number): number {
  return price >= threshold ? price * 0.9 : price;
}
`,
    );
    await runGit(sandboxPath, ["add", "discount.ts"]);
  }

  userQuery =
    "Tests pass but I'm worried I broke something subtle. Synthesize JIT tests against my staged diff to catch hidden regressions.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load `review` (or the host's built-in `code-review`, declared as an accepted equivalent)? JiT regression probing is now part of the review workflow, so this diff-regression wording should route to a diff-review capability rather than being treated as a separate adjacent skill.",
    critical: true,
  }];
}();
