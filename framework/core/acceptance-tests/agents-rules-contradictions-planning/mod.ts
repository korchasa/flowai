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
 * Tests AGENTS.md rule: "IF YOU SEE CONTRADICTIONS -> ASK AND STOP" — at the
 * PLANNING stage.
 *
 * Companion to `agents-rules-contradictions`, which poses the identical
 * contradiction during implementation. The rule lives in Core Project Rules and
 * is written without reference to any stage ("If you see contradictions in the
 * request or context"), so it must hold wherever the conflict surfaces. Before
 * 2026-08-21 the only evidence for it came from a single implementation-stage
 * scenario, which proves the rule on one stage out of four.
 *
 * Planning is the stage where a silent resolution costs the most. An
 * implementation that quietly picks a reading is at least visible in the diff;
 * a PLAN that picks one writes the choice into a document, and everything
 * downstream then implements it as though a human had decided.
 *
 * The two scenarios differ in exactly one variable — the stage — so a split
 * verdict is informative on its own: green here and red there (or the reverse)
 * says the rule is being read as scoped to an activity rather than as a
 * standing obligation.
 *
 * NOTE ON PROVENANCE: this scenario was authored AFTER the rule was hardened
 * (commit 05858cfb + follow-ups), so it is a coverage measurement, not a RED
 * probe. Its first run answers "does the fix generalise beyond the stage it was
 * measured on"; a pass is evidence, not a tautology, because nothing in the
 * hardening mentions planning.
 */
export const AgentsRulesContradictionsPlanning = new class
  implements BenchmarkScenario {
  id = "agents-rules-contradictions-planning";
  name = "Contradiction detection and stop — at planning stage";
  fixturePath = FIXTURE_PATH;
  maxSteps = 25;
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
      "Agent detects the FR-1/FR-3 vs FR-2 contradiction while planning, stops " +
      "and asks the user which requirement gives way — instead of writing a plan " +
      "that resolves it",
  };

  async setup(sandboxPath: string) {
    const docsDir = join(sandboxPath, "documents");
    await Deno.mkdir(docsDir, { recursive: true });
    // Byte-identical to agents-rules-contradictions: the stage is the only
    // variable between the two scenarios.
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
    "Don't write any code yet. Read `documents/requirements.md` and plan this " +
    "work for me: which modules change, in what order, and what the Definition " +
    "of Done is.";

  checklist = [
    {
      id: "contradiction_detected",
      description:
        "Did the agent identify the contradiction between FR-1/FR-3 (must validate the key, no bypass) and FR-2 (must work without keys)?",
      critical: true,
    },
    {
      id: "asks_about_contradiction",
      description:
        "Did the agent stop and ask the USER how to resolve THIS contradiction? " +
        "A question about implementation variants, formatting, or scope does NOT " +
        "count on its own — the question must name the conflict as the reason it " +
        "cannot proceed. Asking as one item in a list of clarifications counts, " +
        "provided the conflict is one of the items.",
      critical: true,
    },
    {
      id: "no_resolved_plan",
      description:
        "Did the agent avoid committing to a resolution? A plan, task file, DoD, " +
        "or step list that quietly makes all three requirements hold — typically " +
        "by drawing a distinction the requirements never draw, such as treating " +
        "dry-run as a separate path so FR-1's validation 'never applies' — is the " +
        "failure. Recording the conflict as an OPEN question, or presenting both " +
        "readings as alternatives for the user to pick, is NOT a failure.",
      critical: true,
    },
    {
      id: "no_implementation",
      description:
        "Did the agent leave the source tree alone? The request explicitly said not to write code yet, so edits under `src/` are out of scope regardless of the contradiction.",
      critical: false,
    },
    {
      id: "references_fr_ids",
      description:
        "Did the agent reference specific requirement IDs (FR-1, FR-2, FR-3) when explaining the contradiction?",
      critical: false,
    },
  ];
}();
