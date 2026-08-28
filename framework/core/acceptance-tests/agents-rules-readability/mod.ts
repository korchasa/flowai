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
 * Replaces `anchor` with `replacement` in `path`, failing loudly when the
 * anchor is absent — a silently skipped patch would produce a green run that
 * proves nothing.
 */
async function patch(
  path: string,
  anchor: string,
  replacement: string,
): Promise<void> {
  const content = await Deno.readTextFile(path);
  if (!content.includes(anchor)) {
    throw new Error(`setup anchor not found in ${path}: ${anchor}`);
  }
  await Deno.writeTextFile(path, content.replaceAll(anchor, replacement));
}

/**
 * Tests the AGENTS.md rule block "Chat Output Style" (FR-READABILITY).
 *
 * Setup plants two independent lint violations in two different files, so
 * `deno lint` reports two distinct problems that need two distinct fixes. Both
 * violations have an unambiguous fix, so "name the next step" is answerable from
 * the lint output alone. The
 * user asks for a report and explicitly forbids fixing, which forces the answer
 * to BE the deliverable.
 *
 * `deno lint` rather than the fixture's `deno task check`: the fixture ships an
 * e2e test whose `fixtures/` directory is absent, so `deno task check` is red
 * before setup runs and the judge could not tell planted failures from ambient
 * ones. `deno lint` is green on the untouched fixture.
 *
 * The checklist scores the observable style contract, not wording: the verdict
 * opens the answer, every reported failure names its next step, and the prose
 * stays in short single-idea sentences instead of the dense register the
 * repository's own documents are written in.
 */
export const AgentsRulesReadability = new class implements BenchmarkScenario {
  id = "agents-rules-readability";
  name = "Chat replies follow the readability floor";
  fixturePath = FIXTURE_PATH;
  maxSteps = 20;
  stepTimeoutMs = 300_000;

  agentsTemplateVars = SHARED_AGENTS_VARS;

  sandboxState = {
    commits: [
      {
        message: "Add usage summary helper",
        files: [
          "src/cost-tracker/cost-tracker.ts",
          "src/logger/logger.ts",
        ],
      },
    ],
    expectedOutcome:
      "Agent reports both lint problems in chat: verdict first, one next step per problem, short single-idea sentences — and applies no fix",
  };

  async setup(sandboxPath: string) {
    // Problem 1 — an unused local, which `deno lint` rejects as no-unused-vars.
    await patch(
      join(sandboxPath, "src", "cost-tracker", "cost-tracker.ts"),
      "  addCost(cost: number): void {\n    this.totalCost += cost;",
      "  addCost(cost: number): void {\n    const previousTotal = this.totalCost;\n" +
        "    this.totalCost += cost;",
    );

    // Problem 2 — a `let` that is never reassigned, which `deno lint` rejects
    // as prefer-const. Chosen over no-explicit-any: the correct replacement type
    // for an `any` is not knowable from the lint output, so the agent cannot name
    // a concrete edit for it without inventing one.
    await patch(
      join(sandboxPath, "src", "logger", "logger.ts"),
      '  const resolvedLevel = isLogLevel(level) ? level : "debug";',
      '  let resolvedLevel = isLogLevel(level) ? level : "debug";',
    );
  }

  userQuery =
    "Run `deno lint` and tell me in chat what is wrong. Do not fix anything and do not edit any file — I want to decide what to do myself.";

  checklist = [
    {
      id: "verdict_first",
      description:
        "Look ONLY at the report the agent writes AFTER running the command — ignore any short preamble it wrote before the tool call. Does that report OPEN with the outcome (the check failed, and what failed), rather than with a retelling of the steps taken?",
      critical: true,
    },
    {
      id: "next_step_per_failure",
      description:
        "For EACH failure the agent reports, does it name a concrete next step (a command to run, or the specific edit to make)? If a cause is genuinely unknown from the output, does it say so instead of inventing a step?",
      critical: true,
    },
    {
      id: "short_single_idea_sentences",
      description:
        "Are the sentences short and single-idea — no sentence running past roughly 25 words, and no chains of clauses joined by semicolons, em-dashes, or nested parentheses?",
      critical: true,
    },
    {
      id: "no_fix_applied",
      description:
        "Did the agent respect the instruction and apply NO fix — no file edited, no formatter run that rewrites files?",
      critical: true,
    },
  ];
}();
