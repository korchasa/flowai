import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

const FIXTURE_PATH = join(import.meta.dirname!, "fixture");

// Was 0/3 on 2026-08-20 with 2-5 tool calls per run: the agent read the failing
// test and patched it with generic tools instead of invoking this skill. A live
// tool path and no skill is a routing miss, not an unreachable trigger, so the
// description was rewritten action-first on the same day — "running the
// diagnosis IS the work, even when the fix already seems obvious" — the clause
// that took engineer-prompts-for-instant from 1/3 to 2/3. The query is left
// alone: it is a plain, unhinted report of a red test, exactly the skill's case.
// The rewrite did NOT move it: still 0/3 the same evening, exit 0 in every run,
// 8, 3 and 15 tool calls — the agent opens the test, finds the cause and fixes
// the source itself.
//
// That conclusion is retracted as of 2026-08-24. In the full sweep this sandbox
// held two files, AGENTS.md and CLAUDE.md, and nothing else: the scenario
// declared no fixture, so there was no failing test for the query to refer to.
// The agent said exactly that and asked which project was meant — a correct
// answer to an impossible request, not a routing miss. Whatever the earlier runs
// measured, they measured it against a sandbox this scenario never described.
// A fixture now ships one: `slugify` leaves a trailing hyphen on
// "Release notes!", so `deno test` is red on a real project before the agent
// starts.
export const FixTestsTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "fix-tests-trigger-pos-1";
  name = "natural failing-test query";
  skill = "fix-tests";
  fixturePath = FIXTURE_PATH;
  agentsTemplateVars = {
    PROJECT_NAME: "slugkit",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  userQuery =
    "One of my tests started failing after my last refactor. Can you take a look and fix it?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `fix-tests` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `fix-tests`.",
    critical: true,
  }];
}();
