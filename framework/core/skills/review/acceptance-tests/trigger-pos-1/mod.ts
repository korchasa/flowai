import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Positive trigger: the query describes this skill's exact job — a staged diff,
 * a QA + lead-engineer verdict on completion, quality, architecture, leftovers.
 *
 * The staged diff is real because the premise has to be true for the trigger
 * question to mean anything. Against an empty sandbox the agent went looking
 * for the diff the query promised, found nothing, and never invoked the skill —
 * the scenario was measuring its own fixture rather than the description
 * (2026-08-12, 2026-08-13).
 */
export const ReviewTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "review-trigger-pos-1";
  name = "review staged diff before commit";
  skill = "review";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    modified: ["utils.ts"],
    expectedOutcome:
      "Agent recognises a review request over a staged diff and loads the review skill",
  };

  override async setup(sandboxPath: string) {
    // The runner committed the fixture as "init"; edit and stage it so the
    // query's "I have a staged diff ready for commit" is literally true.
    await Deno.writeTextFile(
      `${sandboxPath}/utils.ts`,
      `/** Joins path segments with a single separator. */
export function joinPath(...parts: string[]): string {
  return parts.filter((p) => p.length > 0).map((p) => p.replace(/\\/+$/, ""))
    .join("/");
}
`,
    );
    await runGit(sandboxPath, ["add", "utils.ts"]);
  }

  userQuery =
    "I have a staged diff ready for commit. Review it as QA + lead engineer — verdict on completion, code quality, architecture, leftovers.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `review` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `review`.",
    critical: true,
  }];
}();
