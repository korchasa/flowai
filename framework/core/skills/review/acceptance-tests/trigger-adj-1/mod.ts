import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

export const ReviewTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "review-trigger-adj-1";
  name = "JIT regression wording routes to review";
  skill = "review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  // The prompt asserts an existing "staged diff"; seed one so the precondition
  // is real. Without it the agent runs `git diff --cached`, finds an empty tree,
  // and correctly declines to review — masking the routing signal under test.
  override async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "src"), { recursive: true });
    await Deno.writeTextFile(
      join(sandboxPath, "src", "discount.ts"),
      [
        "export function applyDiscount(price: number, pct: number): number {",
        "  return price - (price * pct) / 100;",
        "}",
        "",
      ].join("\n"),
    );
    await runGit(sandboxPath, ["add", "src/discount.ts"]);
  }

  userQuery =
    "Tests pass but I'm worried I broke something subtle. Synthesize JIT tests against my staged diff to catch hidden regressions.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load `review`? JiT regression probing is now part of the review workflow, so this diff-regression wording should route to `review` rather than being treated as a separate adjacent skill.",
    critical: true,
  }];
}();
