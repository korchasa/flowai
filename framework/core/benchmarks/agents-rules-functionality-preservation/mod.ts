import type { BenchmarkScenario } from "@bench/types.ts";
import { join } from "@std/path";

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
 * Tests AGENTS.md rule: "run existing tests before/after; add new tests if coverage missing".
 *
 * Asks agent to extract formatMessage from Logger into a separate module.
 * Agent must run tests before refactoring, extract, and run tests after.
 */
export const AgentsRulesFunctionalityPreservation = new class
  implements BenchmarkScenario {
  id = "agents-rules-functionality-preservation";
  name = "Test before/after refactoring";
  fixturePath = FIXTURE_PATH;
  maxSteps = 30;
  stepTimeoutMs = 300_000;

  agentsTemplateVars = SHARED_AGENTS_VARS;

  sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent runs tests before refactoring, extracts formatter, runs tests after — all pass",
  };

  async setup(_sandboxPath: string) {
    // No modifications — project has passing tests
  }

  userQuery =
    "Refactor `src/logger/logger.ts` — extract the formatting logic (the `formatMessage` method) into a separate `src/logger/formatter.ts` module. Keep the same public API of `Logger` class.";

  checklist = [
    {
      id: "tests_run_before",
      description: "Did the agent run tests BEFORE starting the refactoring?",
      critical: true,
    },
    {
      id: "formatter_extracted",
      description:
        "Does `src/logger/formatter.ts` exist with the extracted formatting logic?",
      critical: true,
    },
    {
      id: "logger_api_preserved",
      description:
        "Does `Logger` class still export the same public API (debug/info/warn/error)?",
      critical: true,
    },
    {
      id: "tests_run_after",
      description: "Did the agent run tests AFTER completing the refactoring?",
      critical: true,
    },
    {
      id: "all_tests_pass",
      description: "Do existing logger tests still pass after the refactoring?",
      critical: true,
    },
    {
      id: "imports_correct",
      description: "Are imports between logger.ts and formatter.ts correct?",
      critical: false,
    },
  ];
}();
