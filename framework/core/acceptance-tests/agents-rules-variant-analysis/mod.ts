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
 * Tests the AGENTS.md rule block "Variant Analysis" (FR-UNIVERSAL.QA-FORMAT)
 * with no skill in the query — the rule alone has to carry the layout.
 *
 * The defect the user reported: a variant arrives as one block of running
 * text with pros, cons and risks mixed into the prose. It shows up on any
 * option, the first one included, so the checklist scores every option of
 * every set the reply opens and fails on the first one written as prose.
 *
 * The request states ONE goal (cache the fetcher responses) and forbids
 * writing code; every choice the reply puts to the user, it has to raise on
 * its own. Do NOT enumerate those choices in the query and do not list
 * candidate answers for them: a request that hands over that structure is
 * satisfied by the pre-fix rule text as well, and the scenario then separates
 * nothing.
 *
 * No defect is planted: the scenario scores the layout of the answer, not a
 * repair, so the verdict does not depend on how much of the fixture the agent
 * reads.
 */
export const AgentsRulesVariantAnalysis = new class
  implements BenchmarkScenario {
  id = "agents-rules-variant-analysis";
  name = "Every option set carries four labelled properties";
  fixturePath = FIXTURE_PATH;
  maxSteps = 20;
  stepTimeoutMs = 300_000;

  agentsTemplateVars = SHARED_AGENTS_VARS;

  sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent puts the open decisions to the user as option sets, each option carrying Pros, Cons, Risks and Best-for as separately labelled parts — and writes no code",
  };

  setup(_sandboxPath: string): Promise<void> {
    return Promise.resolve();
  }

  userQuery =
    "I want response caching for the content fetchers in `src/fetchers/` — the same URL gets fetched repeatedly and we pay for Jina and Brave calls. " +
    "Work out how it should be built and tell me what you would do. " +
    "Do not write or edit any code yet; I want to agree the shape first.";

  checklist = [
    {
      id: "no_option_written_as_a_paragraph",
      description:
        "Take EVERY option of EVERY set of alternatives the agent puts to the user. Is each option's analysis broken into separate labelled parts, one property per line or bullet? FAIL if ANY option is written as a running paragraph, or as a single line that folds several properties behind commas, semicolons or dashes. This is the defect the scenario exists to catch: prose where a labelled list belongs. It FAILS on the very first option written that way — the first set is not exempt.",
      critical: true,
    },
    {
      id: "all_four_properties_labelled_per_option",
      description:
        "For EVERY option of EVERY set, are all FOUR properties present, each as its own labelled part — pros (or advantages), cons (or drawbacks), risks, and who/what it is best for? FAIL if any option carries only two or three of them, even when the missing property is arguably obvious, and FAIL if a property is present but only as a clause inside another property's sentence.",
      critical: true,
    },
    {
      id: "tradeoffs_outside_the_options",
      description:
        "For each set of alternatives, are the cross-option trade-offs stated as their OWN part that follows the option list — not folded into one option's properties and not omitted? A short trade-off sentence per set is enough; the item asks where it sits, not how long it is.",
      critical: true,
    },
    {
      id: "no_code_written",
      description:
        "Did the agent respect the instruction and write or edit NO code — no source file created or modified?",
      critical: true,
    },
  ];
}();
