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
 * Tests AGENTS.md rule: "STRICTLY FOLLOW TDD RULES" + TDD FLOW section.
 *
 * Asks the agent to add a new exported function to an existing module.
 * The agent must follow RED→GREEN→REFACTOR→CHECK cycle.
 */
export const AgentsRulesTddCycle = new class implements BenchmarkScenario {
  id = "agents-rules-tdd-cycle";
  name = "TDD: RED→GREEN→REFACTOR→CHECK cycle";
  fixturePath = FIXTURE_PATH;
  maxSteps = 25;
  stepTimeoutMs = 300_000;

  agentsTemplateVars = SHARED_AGENTS_VARS;

  sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent follows TDD cycle: writes test first, sees it fail, implements, then runs check",
  };

  async setup(_sandboxPath: string) {
    // No modifications — fixture is a working project with passing tests
  }

  userQuery =
    "Add a `formatModelName(raw: string): string` function to `src/llm/factory.ts` that normalizes model name strings: trim whitespace, lowercase, replace spaces with hyphens. Export it from the module.";

  checklist = [
    {
      id: "test_written_first",
      description:
        "Did the agent create/modify a test file BEFORE writing the implementation code? (RED phase — test must exist before production code)",
      critical: true,
    },
    {
      id: "test_run_red",
      description:
        "Was there evidence of running the test and seeing it fail (RED phase)?",
      critical: false,
    },
    {
      id: "test_passes_green",
      description:
        "Did the agent run tests after implementation and they pass (GREEN phase)?",
      critical: true,
    },
    {
      id: "check_or_lint_run",
      description: "Did the agent run a check/lint/fmt command (CHECK phase)?",
      critical: true,
    },
    {
      id: "function_exported",
      description: "Is `formatModelName` exported from `src/llm/factory.ts`?",
      critical: true,
    },
  ];
}();
