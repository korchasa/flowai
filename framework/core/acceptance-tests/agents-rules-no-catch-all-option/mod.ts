import { join } from "@std/path";
import type { BenchmarkScenario } from "@acceptance-tests/types.ts";

// FR-UNIVERSAL.QA-FORMAT rule 7: no catch-all option.
// Reproduces the defect seen 2026-09-30..10-06 in Claude sessions: a short
// clarifying question whose answer space is open got a closing option that
// only invited a free-form reply («D. Другое — расскажу», «C. Что-то другое,
// напиши что»), although the user can always type a reply instead of a letter.
// The query asks WHY the user wants a feature: that open answer space is
// what produced the catch-all in every observed case.
// Single turn: the user emulator speaks only when the agent asks, and the
// question itself is what is scored.
// Do not mention free-form answers or "other" in the query: a request that
// forbids the catch-all passes on the pre-fix text too.
export const scenario: BenchmarkScenario = {
  id: "agents-rules-no-catch-all-option",
  name: "A clarifying question carries no catch-all option",
  agentsTemplateVars: {
    PROJECT_NAME: "ai-skel-ts",
    TOOLING_STACK: "- TypeScript\n- Deno",
    ARCHITECTURE: "- `src/llm/` — LLM client (AI SDK)\n" +
      "- `src/openrouter/` — OpenRouter client\n" +
      "- `src/cost-tracker/` — Token cost tracking\n" +
      "- `src/fetchers/` — Content fetchers (local, Jina, Brave)",
    PROJECT_RULES:
      "- Reply to the user in Russian. Code and project documents use English unless the user requests another language for a specific deliverable.",
  },
  maxSteps: 1,
  stepTimeoutMs: 300_000,
  totalTimeoutMs: 300_000,
  sandboxState: {
    commits: [],
    expectedOutcome:
      "Agent asks one clarifying question about the purpose of an LLM response cache, with concrete options only, and changes nothing.",
  },
  userQuery:
    "Хочу добавить в библиотеку кэш ответов LLM. Прежде чем что-то предлагать, задай мне один вопрос с вариантами ответа: зачем мне этот кэш. Пока ничего не меняй.",
  checklist: [
    {
      id: "question_asked",
      description:
        "The assistant reply must contain a question about why the user wants an LLM response cache, with at least two lettered or numbered options, and the agent must not edit any project file. A reply with no such question, or one that changes files, fails.",
      critical: true,
    },
    {
      id: "no_catch_all_option",
      description:
        "Take EVERY question with lettered or numbered options in the reply. Does any option exist only to invite a free-form answer — an option whose whole content is «Другое», «Свой вариант», «Что-то другое, напиши что», «Иное — расскажу», «Other», «Something else» or the like, and which names no concrete purpose or action of its own? FAIL if any such catch-all option appears: the user can always type a free-form reply instead of picking a letter, so the option adds nothing. An option that names a concrete alternative is NOT a catch-all, even when its title starts with «Другое» or «Иначе» (e.g. «Другое: кэш нужен для офлайн-тестов») — do not fail it. A sentence outside the option list is not an option and is not scored. Quote the catch-all option and name its question when you fail.",
      critical: true,
    },
  ],
  fixturePath: join(import.meta.dirname!, "..", "agents-rules", "fixture"),
  setup(): Promise<void> {
    return Promise.resolve();
  },
};
