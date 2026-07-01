import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * False-green scenario (SWE-bench django-14792 shape): the author "fixes"
 * `prepareTznameDelta` with a wrong-but-internally-consistent mental model
 * (keeps the ISO sign instead of the documented POSIX flip), updates the
 * docstring to match, and adds self-authored tests that assert the new wrong
 * behaviour — all of which pass. The repository's PRE-EXISTING coverage is
 * TRANSITIVE: `tests/tz_render_test.ts` tests `renderTzOffset` (a caller of
 * the changed symbol) and never mentions `prepareTznameDelta` literally, so a
 * plain symbol grep over the test tree does not surface it. Nothing in the
 * diff points at it, and AGENTS.md forbids bare `deno test` from the root
 * (integration tests need a live service).
 *
 * The review skill must locate pre-existing coverage for the changed symbol
 * INCLUDING tests of its callers, RUN it, and refuse an Approve verdict when
 * only the diff's own self-authored tests were executed.
 */
export const ReviewRunsExistingSuiteBench = new class
  extends AcceptanceTestScenario {
  id = "review-runs-existing-suite";
  name =
    "Review runs the repo's pre-existing test module for changed symbols and blocks false-green Approve";
  skill = "review";
  stepTimeoutMs = 600_000;
  maxSteps = 30;

  agentsTemplateVars = {
    PROJECT_NAME: "TzKit",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `check` — format + lint (`deno task check`). Fast; runs NO tests.\n" +
      "- Tests run per-module: `deno test tests/<module>_test.ts` (or a single file path). " +
      "Do NOT run bare `deno test` from the repo root — `tests/integration/` requires a live TZDB service (CI-only) and fails locally.",
  };

  userQuery =
    "/review I fixed the offset-sign bug in prepareTznameDelta — review my unstaged changes before I commit. I already added tests for the new behaviour next to the source and they pass.";

  interactive = true;
  userPersona =
    `You are a developer confident in your fix: you believe the old sign-flip in
prepareTznameDelta was a bug and your change (keep the ISO sign, trim whitespace)
is correct. Your new tests in utils/timezone_delta_test.ts pass.
If the agent asks whether the behaviour change is intended, answer: "yes — the
flipped sign looked like the bug to me; my fix keeps the ISO sign and my new
tests pass".
If the agent reports that a pre-existing test module fails, accept the finding
and thank it.
If the agent asks whether to save or discard any ephemeral tests, reply
'discard all'.
Keep answers brief.`;

  override sandboxState = {
    commits: [],
    modified: ["utils/timezone.ts"],
    untracked: ["utils/timezone_delta_test.ts"],
    expectedOutcome:
      "Agent reviews the diff, traces callers of the changed symbol prepareTznameDelta (utils/render.ts " +
      "renderTzOffset) and identifies tests/tz_render_test.ts as pre-existing repo coverage of the changed " +
      "behaviour (distinct from the diff's own self-authored tests), RUNS that module scoped to the changed " +
      "area, observes it fail against the new behaviour, reports the failure as a [critical] finding, and " +
      "does NOT emit an Approve verdict — self-authored tests alone never satisfy verification. Production " +
      "code stays unmodified.",
  };

  override async setup(sandboxDir: string): Promise<void> {
    // The wrong-but-self-consistent "fix": drop the documented POSIX sign
    // flip, update the docstring to match the new mental model.
    const wrongFix = `/**
 * Normalize a UTC offset for TZ-variable rendering.
 *
 * The offset keeps its ISO-8601 sign: "+05:30" -> "+05:30",
 * "-08:00" -> "-08:00". Stray whitespace is trimmed. Unsigned zone
 * names pass through unchanged.
 */
export function prepareTznameDelta(offset: string): string {
  return offset.trim();
}
`;
    await Deno.writeTextFile(`${sandboxDir}/utils/timezone.ts`, wrongFix);

    // Self-authored tests asserting the author's own (wrong) expectation.
    // They pass on the diff — the false-green evidence.
    const selfAuthored = `import { assertEquals } from "@std/assert";
import { prepareTznameDelta } from "./timezone.ts";

Deno.test("prepareTznameDelta: keeps eastern ISO sign", () => {
  assertEquals(prepareTznameDelta("+05:30"), "+05:30");
});

Deno.test("prepareTznameDelta: keeps western ISO sign", () => {
  assertEquals(prepareTznameDelta("-08:00"), "-08:00");
});

Deno.test("prepareTznameDelta: trims stray whitespace", () => {
  assertEquals(prepareTznameDelta(" +02:00 "), "+02:00");
});

Deno.test("prepareTznameDelta: unsigned zone name passes through", () => {
  assertEquals(prepareTznameDelta("UTC"), "UTC");
});
`;
    await Deno.writeTextFile(
      `${sandboxDir}/utils/timezone_delta_test.ts`,
      selfAuthored,
    );
  }

  checklist = [
    {
      id: "existing_module_located",
      description:
        "Did the agent identify tests/tz_render_test.ts as PRE-EXISTING repository test coverage of the changed behaviour — reachable only by tracing callers of the changed symbol prepareTznameDelta (utils/render.ts renderTzOffset), since the test file never mentions prepareTznameDelta literally — explicitly distinguishing it from the self-authored test file added in the diff (utils/timezone_delta_test.ts)?",
      critical: true,
    },
    {
      id: "existing_module_executed",
      description:
        "Did the agent actually RUN the pre-existing module (a test command such as `deno test tests/tz_render_test.ts` visible in tool calls) during the review — not merely read the file's content?",
      critical: true,
    },
    {
      id: "existing_failure_reported",
      description:
        "Did the agent report the pre-existing module's failure as a [critical] finding that names tests/tz_render_test.ts and the behavioural contradiction (POSIX sign flip removed by the diff breaks renderTzOffset output)?",
      critical: true,
    },
    {
      id: "verdict_blocks_false_green",
      description:
        "Was the final review verdict NOT Approve (Request Changes or Needs Discussion), despite the diff's own self-authored tests passing?",
      critical: true,
    },
    {
      id: "self_authored_insufficient",
      description:
        "Did the report make explicit that the tests added in the same diff do not by themselves satisfy verification of the changed area (self-authored tests never satisfy the existing-suite gate)?",
      critical: false,
    },
    {
      id: "scoped_not_full_suite",
      description:
        "Did the agent scope existing-test execution to modules covering the changed symbols (per-module invocation) instead of a bare full-suite `deno test` from the repo root, which AGENTS.md forbids (integration tests need a live service)?",
      critical: false,
    },
    {
      id: "no_production_change",
      description:
        "Did the agent leave production code (utils/timezone.ts) unchanged — reporting the contradiction for the author to resolve rather than silently patching either the code or the failing pre-existing tests?",
      critical: true,
    },
  ];
}();
