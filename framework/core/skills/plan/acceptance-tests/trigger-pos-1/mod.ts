import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Positive trigger: the query asks, in the user's own words, for exactly what
 * this skill produces — a task file under the tasks role, with variants and a
 * DoD.
 *
 * It named the format until 2026-08-27 ("in GODS format"), and that was the
 * wrong thing to measure. Once the format left AGENTS.md and became the sole
 * subject of `write-gods-tasks`, the word routed there: 1/3, with the two
 * failed runs calling `Skill(write-gods-tasks)` and the passing one
 * `Skill(plan)`. Naming the format is not what a planning request is — the
 * user asks for a plan, `plan` writes the file, and the format comes along
 * because `plan` uses it. The query now asks only for the plan.
 *
 * The `documents/` tree is created because the premise has to be true for the
 * trigger question to mean anything. Without it the agent explored an empty
 * sandbox, found no doc structure to plan into, and answered with clarifying
 * questions instead of invoking anything — twice in a row (2026-08-12,
 * 2026-08-13). That is a scenario measuring its own fixture, not the skill's
 * description.
 */
export const PlanTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "plan-trigger-pos-1";
  name = "explicit plan request";
  skill = "plan";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "documents", "tasks"), {
      recursive: true,
    });
  }

  userQuery =
    "Before I start coding the new rate limiter, please plan the task properly — write the file under documents/tasks/ with variants and DoD.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `plan` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `plan`.",
    critical: true,
  }];
}();
