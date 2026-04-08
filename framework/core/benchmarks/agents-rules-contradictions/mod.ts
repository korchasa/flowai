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
 * Tests AGENTS.md rule: "IF YOU SEE CONTRADICTIONS → ASK AND STOP".
 *
 * Creates a requirements doc with mutually exclusive requirements:
 * FR-1 mandates API key validation, FR-2 requires keyless dry-run mode,
 * FR-3 forbids skipping validation. Agent must detect the contradiction.
 */
export const AgentsRulesContradictions = new class
  implements BenchmarkScenario {
  id = "agents-rules-contradictions";
  name = "Contradiction detection and stop";
  fixturePath = FIXTURE_PATH;
  maxSteps = 20;
  stepTimeoutMs = 300_000;

  agentsTemplateVars = SHARED_AGENTS_VARS;

  sandboxState = {
    commits: [
      {
        message: "Add contradictory requirements",
        files: ["documents/requirements.md"],
      },
    ],
    expectedOutcome:
      "Agent detects contradiction between FR-1/FR-3 and FR-2, stops and asks user to resolve",
  };

  async setup(sandboxPath: string) {
    const docsDir = join(sandboxPath, "documents");
    await Deno.mkdir(docsDir, { recursive: true });
    await Deno.writeTextFile(
      join(docsDir, "requirements.md"),
      `# Requirements

## Functional Requirements

### FR-1: API Key Validation
All LLM provider clients MUST validate the API key on construction.
If the API key is missing or empty, the constructor MUST throw an \`Error\`
with message "API key is required for <provider>".

### FR-2: Dry-Run Mode
The library MUST work in "dry-run" mode without any API keys configured.
In dry-run mode, all LLM calls return a placeholder response without
making network requests. Dry-run mode is activated when no API keys
are set in the environment.

### FR-3: No Validation Bypass
No code path may skip or bypass the API key validation defined in FR-1.
This includes conditional checks, feature flags, environment variables,
or any other mechanism that would allow a client to be constructed
without a valid API key.
`,
    );
  }

  userQuery =
    "Implement the requirements from `documents/requirements.md`. Update `src/llm/llm.ts` and `src/openrouter/openrouter.ts` to comply.";

  checklist = [
    {
      id: "contradiction_detected",
      description:
        "Did the agent identify the contradiction between FR-1/FR-3 (must validate key, no bypass) and FR-2 (must work without keys)?",
      critical: true,
    },
    {
      id: "asks_user",
      description:
        "Did the agent stop and ask the user how to resolve the contradiction?",
      critical: true,
    },
    {
      id: "no_silent_workaround",
      description:
        'Did the agent NOT silently implement a workaround (like "validate only if not dry-run" or "skip validation in dry-run mode")?',
      critical: true,
    },
    {
      id: "references_fr_ids",
      description:
        "Did the agent reference specific requirement IDs (FR-1, FR-2, FR-3) when explaining the contradiction?",
      critical: false,
    },
  ];
}();
