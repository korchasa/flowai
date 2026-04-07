import { join } from "@std/path";
import type { BenchmarkScenario } from "@bench/types.ts";

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
 * Tests AGENTS.md rule: "PROVIDE EVIDENCE FOR YOUR CLAIMS" + read before acting.
 *
 * Setup introduces an off-by-one bug in the retry loop (attempt starts at 0
 * instead of 1) and adds a test asserting first retry delay >= 1000ms.
 * Agent must read source, find the off-by-one, and fix the starting value.
 */
export const AgentsRulesEvidenceClaims = new class
  implements BenchmarkScenario {
  id = "agents-rules-evidence-claims";
  name = "Evidence-based claims, read before acting";
  fixturePath = FIXTURE_PATH;
  maxSteps = 20;
  stepTimeoutMs = 300_000;

  agentsTemplateVars = SHARED_AGENTS_VARS;

  sandboxState = {
    commits: [
      {
        message: "Introduce retry delay bug + add delay test",
        files: [
          "src/llm/llm.ts",
          "src/llm/llm.retry-delay.test.ts",
        ],
      },
    ],
    expectedOutcome:
      "Agent reads source, finds off-by-one (attempt=0 instead of 1), fixes it, runs tests",
  };

  async setup(sandboxPath: string) {
    // Inject off-by-one bug: change `attempt = 1` to `attempt = 0` in retry loop
    const llmPath = join(sandboxPath, "src", "llm", "llm.ts");
    let content = await Deno.readTextFile(llmPath);

    // Change starting attempt from 1 to 0 in the first retry loop
    // Original: `for (let attempt = 1; attempt <= maxValidationRetries; attempt++)`
    content = content.replace(
      "for (let attempt = 1; attempt <= maxValidationRetries; attempt++)",
      "for (let attempt = 0; attempt <= maxValidationRetries; attempt++)",
    );
    await Deno.writeTextFile(llmPath, content);

    // Create test that asserts first retry delay >= 1000ms
    const testPath = join(sandboxPath, "src", "llm", "llm.retry-delay.test.ts");
    await Deno.writeTextFile(
      testPath,
      `import { assertEquals } from "@std/assert";

/**
 * Verifies the retry delay formula: INITIAL_RETRY_DELAY * 2^(attempt-1).
 * With INITIAL_RETRY_DELAY=1000 and first attempt=1, delay should be 1000ms.
 *
 * This test reimplements calculateRetryDelay logic to verify the contract.
 */
Deno.test("first retry delay should be >= 1000ms", () => {
  const INITIAL_RETRY_DELAY = 1000;

  // Simulate what the code does: attempt starts at some value,
  // delay = INITIAL_RETRY_DELAY * 2^(attempt - 1)
  //
  // Read src/llm/llm.ts to find the starting attempt value.
  // With attempt=1: delay = 1000 * 2^0 = 1000 ✓
  // With attempt=0: delay = 1000 * 2^(-1) = 500 ✗

  // We test the EXPECTED contract: first attempt should yield >= 1000ms
  const firstAttempt = getFirstAttemptFromSource();
  const delay = INITIAL_RETRY_DELAY * Math.pow(2, firstAttempt - 1);

  assertEquals(
    delay >= 1000,
    true,
    \`First retry delay should be >= 1000ms, got \${delay}ms (attempt=\${firstAttempt})\`,
  );
});

/**
 * Reads src/llm/llm.ts and extracts the starting attempt value
 * from the first retry loop.
 */
function getFirstAttemptFromSource(): number {
  const source = Deno.readTextFileSync("src/llm/llm.ts");
  const match = source.match(/for\\s*\\(let\\s+attempt\\s*=\\s*(\\d+)/);
  if (!match) throw new Error("Could not find retry loop in src/llm/llm.ts");
  return parseInt(match[1], 10);
}
`,
    );
  }

  userQuery =
    "The retry delay test in `src/llm/llm.retry-delay.test.ts` is failing — it expects at least 1000ms delay on first retry but gets ~500ms. Investigate and fix.";

  checklist = [
    {
      id: "read_source_before_fix",
      description: "Did the agent read `src/llm/llm.ts` before making changes?",
      critical: true,
    },
    {
      id: "correct_root_cause",
      description:
        "Did the agent identify the off-by-one: retry loop starts at `attempt = 0` instead of `1`?",
      critical: true,
    },
    {
      id: "fix_is_correct",
      description:
        "Did the agent change the loop starting attempt from 0 back to 1 in src/llm/llm.ts (not modify the delay formula or weaken the test)? Note: the fix may revert the file to its committed state, so git status may not show it as modified — check the Edit tool calls or file content instead.",
      critical: true,
    },
    {
      id: "ran_tests_to_verify",
      description: "Did the agent run tests to verify the fix works?",
      critical: true,
    },
    {
      id: "no_test_weakened",
      description:
        "Did the agent NOT modify the test assertion instead of fixing the code?",
      critical: false,
    },
  ];
}();
