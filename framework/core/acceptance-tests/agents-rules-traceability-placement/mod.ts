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
 * - Code evidence → `// FR-<ID>` comment in source, NO file paths in SRS.
 * - Non-code evidence → placed directly in SRS/SDS.
 *
 * Setup adds a pending requirement FR-LOG-8 (getLevel() method on Logger).
 * Agent must implement it, add FR-LOG-8 traceability comment in code,
 * mark [x] in SRS, and NOT add Evidence: file paths in SRS.
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
      "Agent implements getLevel(), adds // FR-LOG-8 in code, marks [x] in SRS without Evidence: paths",
  };

  async setup(sandboxPath: string) {
    // Add pending requirement FR-LOG-8 to SRS
    const srsPath = join(sandboxPath, "documents", "requirements.md");
    let srs = await Deno.readTextFile(srsPath);

    // Insert FR-LOG-8 after FR-LOG-7 line
    srs = srs.replace(
      "- [x] **FR-LOG-7**: Sanitize non-serializable objects (Errors, circular references) in YAML logs to prevent crashes",
      "- [x] **FR-LOG-7**: Sanitize non-serializable objects (Errors, circular references) in YAML logs to prevent crashes\n" +
        "- [ ] **FR-LOG-8**: Logger class must expose a `getLevel(): LogLevel` method returning the current log level",
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
        "Did the agent add a `// FR-LOG-8` traceability comment near the `getLevel()` implementation in the source code (not in tests)?",
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
        "Did the agent NOT add file paths as evidence (e.g., `Evidence: src/logger/logger.ts:42` or similar path references) next to FR-LOG-8 in `documents/requirements.md`? The SRS should contain only the `[x]` marker and the requirement text, without code file path references — code traceability lives in the `// FR-LOG-8` comment in code.",
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
