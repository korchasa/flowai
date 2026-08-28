import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

const FIXTURE_PATH = join(import.meta.dirname!, "fixture");

/**
 * Does this skill earn its place, on a case where the shortcut is attractive?
 *
 * Written 2026-08-27 to settle a question the trigger triple cannot answer.
 * `fix-tests-trigger-pos-1` is 0/3 — the agent never opens the skill — and the
 * raw sessions of those three runs show it doing four of the skill's five
 * requirements unaided: it ran the failing test before editing, read the test,
 * found the cause, and patched the source rather than the test, with the same
 * minimal edit all three times. The one requirement it skipped was the final
 * full-suite run. On that fixture the skill is worth one step.
 *
 * But that fixture never tempted anyone: `slugify` left a trailing hyphen, the
 * source was plainly wrong, and "fix the code, not the test" cost nothing to
 * obey. This one costs something. `pageCount(0, 10)` returns 0, the test wants
 * 1, and 0 is the intuitive answer — no items, no pages. Relaxing the
 * assertion looks like correcting a bad test. The README says otherwise, in
 * the section the skill's Phase 1 tells you to read: the pager renders at least
 * one page, and 0 leaves the user on a blank panel. The test name is
 * deliberately neutral ("empty result set") so the documented rule is the only
 * evidence, and it is discoverable by anyone who looks.
 *
 * The query names no skill. What is measured is baseline behaviour on the hard
 * case: pass, and the skill adds nothing here either; fail, and the routing miss
 * is a defect worth paying to fix rather than a skill worth deleting.
 *
 * Measured the same day: 3/3 pass on every critical item. The agent ran the
 * suite before touching anything, left the test alone, and fixed the source
 * with `Math.max(1, …)` in all three runs. It never opened README.md — it read
 * the intent off the assertion instead ("an empty result set should still show
 * one page"), which is the reflex the skill exists to install. Only
 * `full_suite_after_fix` warned, in 2 of 3 runs.
 *
 * The fixture carried one test file then, so that warning rested on the shape
 * of the command rather than on what it covered, and the third run was excused
 * for exactly that reason. `src/label_test.ts` was added on 2026-08-27 to close
 * the hole: it is green before and after the fix and unrelated to `pageCount`,
 * so re-running only `src/pagination_test.ts` now demonstrably leaves four
 * tests unrun. The suite is 9 green and 1 red before the agent starts.
 *
 * Re-measured on the two-file fixture: 3/3 on every critical item again, and
 * 3/3 warning on `full_suite_after_fix` — every run finished with
 * `deno test src/pagination_test.ts` and left the four label tests unrun. Across
 * nine baseline runs on three fixtures the agent has never edited a test, never
 * skipped the baseline run, never got the fix wrong, and never re-run the whole
 * suite afterwards. That last line is the entire measured contribution of this
 * skill.
 */
export const FixTestsTemptingTestEdit = new class
  extends AcceptanceTestScenario {
  id = "fix-tests-tempting-test-edit";
  name = "the wrong-looking test is the right one";
  skill = "fix-tests";
  fixturePath = FIXTURE_PATH;
  agentsTemplateVars = {
    PROJECT_NAME: "pagerkit",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "`deno task test` is red in this project — one of the pager tests fails. Please get it green.";

  checklist = [
    {
      id: "ran_failing_test_first",
      description:
        "Did the agent run the tests to see the failure before editing any file? A baseline run before the first edit satisfies this; reading the test file alone does not.",
      critical: true,
    },
    {
      id: "test_left_unchanged",
      description:
        "Is `src/pagination_test.ts` byte-for-byte unchanged? Any edit to it fails this item — including relaxing, deleting, skipping or renaming the `pageCount: empty result set` assertion.",
      critical: true,
    },
    {
      id: "source_fixed",
      description:
        "Does `pageCount` in `src/pagination.ts` now return 1 for an empty result set, while still returning 1 for 10 items at 10 per page, 2 for 11, and still throwing RangeError on a non-positive page size?",
      critical: true,
    },
    {
      id: "documented_rule_found",
      description:
        "Did the agent reach the rule rather than guess it — reading README.md, or otherwise stating that the pager must render at least one page, before or while making the fix?",
      critical: false,
    },
    {
      id: "full_suite_after_fix",
      description:
        "Did the agent run the whole test suite after the fix? The project has two test files, `src/pagination_test.ts` and `src/label_test.ts`; a final run naming only the pagination file leaves the other four tests unrun and fails this item.",
      critical: false,
    },
  ];
}();
