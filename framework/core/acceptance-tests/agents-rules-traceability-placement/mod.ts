import { join } from "@std/path";
import type { BenchmarkScenario } from "@acceptance-tests/types.ts";

const FIXTURE_PATH = join(
  import.meta.dirname!,
  "..",
  "agents-rules",
  "fixture",
);

const SHARED_AGENTS_VARS = {
  PROJECT_NAME: "ai-skel-ts",
  TOOLING_STACK: "- TypeScript\n- Deno",
  ARCHITECTURE: "- `src/llm/` — LLM client (AI SDK)\n" +
    "- `src/openrouter/` — OpenRouter client\n" +
    "- `src/agent/` — Agent orchestration\n" +
    "- `src/cost-tracker/` — Token cost tracking\n" +
    "- `src/logger/` — Structured logger\n" +
    "- `src/fetchers/` — Content fetchers (local, Jina, Brave)\n" +
    "- `src/llm-session-compactor/` — Session history compaction\n" +
    "- `src/run-context/` — Run context management",
  KEY_DECISIONS: "- Published on JSR as @korchasa/ai-skel-ts\n" +
    "- Uses AI SDK (Vercel) for LLM abstraction\n" +
    "- Deno-native, no Node.js compat layer",
};

/**
 * Tests AGENTS.md traceability placement rule:
 * - Code evidence → a SALP REF comment in source, NO file paths in SRS.
 * - Non-code evidence → placed directly in SRS/SDS.
 *
 * Setup adds a pending requirement FR-LOG-8 (getLevel() method on Logger).
 * Agent must implement it, add the traceability comment in code, mark [x] in
 * SRS, and NOT add Evidence: file paths in SRS.
 *
 * Retargeted to SALP on 2026-08-24. The checklist demanded a bare `// FR-LOG-8`
 * comment, but the AGENTS.md template the sandbox renders declares that form
 * retired and rejected by the validator, and teaches `// [REF:fr:<id>]`
 * instead. In the sweep of 2026-08-23 the agent wrote
 * `// [REF:fr:log-8] — returns the current log level` — obeying the rules it
 * was given — and the item scored it a failure. The template said both things
 * in different sections; four stale spots were corrected in the same pass, and
 * the setup now plants the `[ANC:fr:log-8]` anchor the REF points at.
 */
export const AgentsRulesTraceabilityPlacement = new class
  implements BenchmarkScenario {
  id = "agents-rules-traceability-placement";
  name = "Traceability: code evidence in code, not in SRS";
  fixturePath = FIXTURE_PATH;
  maxSteps = 25;
  stepTimeoutMs = 300_000;

  agentsTemplateVars = SHARED_AGENTS_VARS;

  sandboxState = {
    commits: [
      {
        message: "Add pending FR-LOG-8 requirement",
        files: [
          "documents/requirements.md",
        ],
      },
    ],
    expectedOutcome:
      "Agent implements getLevel(), adds // [REF:fr:log-8] in code, marks [x] in SRS without Evidence: paths",
  };

  async setup(sandboxPath: string) {
    // Add pending requirement FR-LOG-8 to SRS
    const srsPath = join(sandboxPath, "documents", "requirements.md");
    let srs = await Deno.readTextFile(srsPath);

    // Insert FR-LOG-8 after FR-LOG-7 line
    srs = srs.replace(
      "- [x] **FR-LOG-7**: Sanitize non-serializable objects (Errors, circular references) in YAML logs to prevent crashes",
      "- [x] **FR-LOG-7**: Sanitize non-serializable objects (Errors, circular references) in YAML logs to prevent crashes\n" +
        "- [ ] **FR-LOG-8**: Logger class must expose a `getLevel(): LogLevel` method returning the current log level [ANC:fr:log-8]",
    );
    await Deno.writeTextFile(srsPath, srs);
  }

  userQuery =
    "Implement FR-LOG-8: add a `getLevel()` method to the Logger class in `src/logger/logger.ts` that returns the current log level. Follow TDD and update documentation per project rules.";

  checklist = [
    {
      id: "method_implemented",
      description:
        "Did the agent add a `getLevel()` method to the `Logger` class in `src/logger/logger.ts` that returns the current log level?",
      critical: true,
    },
    {
      id: "fr_comment_in_code",
      description:
        "Did the agent add a traceability comment carrying the SALP reference `[REF:fr:log-8]` next to the `getLevel()` implementation in the source code (not in tests)? Any source comment form counts — a `//` line comment or a `/** */` block on the method both satisfy this item, since what is under test is the notation and its placement, not the comment syntax. The retired bare `// FR-LOG-8`, a GFM link, or no comment at all does NOT satisfy it. (The first version of this item on 2026-08-24 demanded the `//` form and rejected 'any other notation'; it failed a run whose JSDoc block carried the correct reference, and that was the item being wrong, not the agent.)",
      critical: true,
    },
    {
      id: "srs_marked_done",
      description:
        "Did the agent mark FR-LOG-8 as `[x]` in `documents/requirements.md`?",
      critical: true,
    },
    {
      id: "no_evidence_paths_in_srs",
      description:
        "Did the agent NOT add an evidence path pointing at the IMPLEMENTATION next to FR-LOG-8 in `documents/requirements.md` — an `Evidence: src/logger/logger.ts:42` line or any similar back-pointer to the implementing source? Code traceability lives in the `[REF:fr:log-8]` comment in code, so the SRS must not repeat it. An `**Acceptance:**` field naming the requirement's test is NOT such a path and must be counted as a pass: the project's own Requirements Lifecycle requires every FR to declare a runnable acceptance reference, and its value is a test path by construction. (Until 2026-08-24 this item forbade path references of every kind and failed two runs of three for obeying that rule.)",
      critical: true,
    },
    {
      id: "tests_pass",
      description:
        "Did the agent run tests and they pass after the implementation?",
      critical: false,
    },
  ];
}();
