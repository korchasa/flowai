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
 * Tests the AGENTS.md reader rule ("The reader did not see this session").
 *
 * The rule governs how a chat reply carries names the reader cannot resolve:
 * every identifier, path or setting key taken out of the repository is
 * introduced by what it does, the name itself stays a pointer, and a choice is
 * offered by its meaning rather than by its label.
 *
 * No defect is planted. The observable is the shape of the report, so the
 * fixture stays untouched and the question is one the agent can only answer by
 * reading code the user has not read.
 *
 * `src/llm-session-compactor/` is the target because its two strategies are
 * named `SimpleHistoryCompactor` and `SummarizingHistoryCompactor` and its one
 * knob is `maxSymbols`. None of the three tells a reader what it does: "simple"
 * and "summarizing" describe the implementation, and `maxSymbols` does not say
 * that it counts characters of message content. An answer that repeats those
 * names without unpacking them is unreadable to someone who has not opened the
 * module, which is exactly the failure the rule names.
 *
 * The query asks for a recommendation as well as an explanation, so the reply
 * has to present the two strategies as a choice — the second clause of the
 * rule. It does NOT tell the agent who the reader is or ask for plain words;
 * naming the reader would script the behaviour under test.
 *
 * Measured 2026-09-19..20 on the default arm (codex `gpt-5.6-terra`), cache
 * bypassed on every run. Only `names_introduced` ever moves; the other three
 * items passed in all 11 runs.
 *
 * First shape of the item also demanded that the gloss arrive "at or before"
 * first use:
 *
 * - Template WITHOUT the rule, 1 run: fail. The reply opened by recommending
 *   `SimpleHistoryCompactor` before saying anywhere what it does, and
 *   `SummaryGenerator` appeared as a bare constructor argument.
 * - Template WITH the rule, 4 runs: 2 pass, 2 fail. One failure left
 *   `summaryMaxTokens` and `temperature` with no gloss anywhere; the other
 *   explained `SimpleHistoryCompactor({ maxSymbols })` in the NEXT bullet
 *   instead of at first mention, leaving nothing unexplained.
 *
 * That ordering demand was this file's own addition — the template's rule asks
 * only that a name be explained, not where. It was removed and the judge was
 * told outright not to score placement. Second shape:
 *
 * - Template WITHOUT the rule, 2 runs: 1 pass, 1 fail.
 * - Template WITH the rule, 4 runs: 3 pass, 1 fail.
 *
 * So the rule shifts the pass rate the right way — 1 of 3 runs without it, 5
 * of 8 with it, across both shapes — and separates nothing. The scenario does
 * not go reliably red on the untouched template, so it does not satisfy the
 * RED step.
 *
 * Root cause of the flapping, recorded so the next attempt does not repeat it:
 * the item is universally quantified over every identifier in a free-form
 * reply that carries 10-15 of them. Its pass probability is per-name
 * compliance raised to that power, so a rule that lifts compliance from 0.90
 * to 0.97 still only moves a whole run from 0.2 to 0.6 — which is the measured
 * spread. The remedy is a small fixed set of names to ask about, not a better
 * wording of the same universal item.
 *
 * `choices_named_by_meaning` passed on BOTH texts in every run: it is a
 * regression guard, not evidence for the rule. `no_code_changed` is hygiene.
 *
 * Asked afterwards why it left two names unexplained, the failing session
 * answered that nothing in the rule allowed it and that it had simply not
 * applied the rule to each identifier while listing configuration controls.
 * Caveat: `codex exec resume` replayed that session on `gpt-5.6-sol`, not the
 * `gpt-5.6-terra` that produced the reply.
 *
 * The scenario is NOT green and must not be cited as acceptance for the
 * readability requirement in documents/requirements.md until that is settled.
 */
export const AgentsRulesReaderContext = new class implements BenchmarkScenario {
  id = "agents-rules-reader-context";
  name = "Chat replies explain the names the reader has not seen";
  fixturePath = FIXTURE_PATH;
  maxSteps = 20;
  stepTimeoutMs = 300_000;

  agentsTemplateVars = SHARED_AGENTS_VARS;

  sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent reports in chat how history shortening works and which strategy to use, introducing every repository name by what it does, and changes no file",
  };

  setup(_sandboxPath: string): Promise<void> {
    // Nothing to plant: the scenario measures how the agent writes about code
    // that is already there.
    return Promise.resolve();
  }

  userQuery =
    "My conversation history gets shortened during long runs and I have never looked at that part of the code. Read it and tell me in chat how the shortening works, what controls it, and which way I should use. Do not change any file.";

  checklist = [
    {
      id: "names_introduced",
      description:
        "Step 1 — list every name the reply takes out of the repository: a class, a function, a configuration key, a file path. Step 2 — strike from that list every name used ONLY as a source pointer, that is a file path or line reference given so the reader can locate where a stated fact lives, with no claim made about the name itself; a citation is not a name the reader has to understand, so it is NOT judged here. Step 3 — for each name still on the list, decide whether the reply says in ordinary words what that thing does or holds. Placement is NOT judged: an explanation before the name, beside it, or in a later sentence all count equally. Step 4 — report how many names you kept and how many of those are left unexplained anywhere in the reply. One unexplained name is tolerated as a slip; the item PASSES with zero or one, and FAILS with two or more.",
      critical: true,
    },
    {
      id: "readable_without_repo",
      description:
        "Could a reader who has never opened this repository, and did not watch this session, follow the answer from the first sentence to the last? If understanding any sentence requires already knowing what a repository name refers to, this item fails.",
      critical: true,
    },
    {
      id: "choices_named_by_meaning",
      description:
        "The reply has to present the two ways history can be shortened as a choice. Is each way identified by what it DOES — for example 'drops the oldest messages' versus 'replaces the old ones with a summary' — rather than only by its class name? A choice offered as a bare identifier, with the behaviour left for the reader to infer from the name, fails this item.",
      critical: true,
    },
    {
      id: "no_code_changed",
      description:
        "Did the agent respect the instruction and change NO file — no edit, no formatter run that rewrites files?",
      critical: true,
    },
  ];
}();
