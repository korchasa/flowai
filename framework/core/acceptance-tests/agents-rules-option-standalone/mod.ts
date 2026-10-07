import { join } from "@std/path";
import type { BenchmarkScenario } from "@acceptance-tests/types.ts";

// FR-UNIVERSAL.QA-FORMAT rule 6: every option of a question stands on its own.
// Reproduces the defect seen 2026-09-30 in a `factory` session: after a long
// report the agent offered next steps whose titles leaned on the report
// ("the anomalies found", "the current round") and the user had to ask again.
// The report and the question share one reply, as they did in that session;
// the judge reads only the options and flags every back-reference.
// Single turn on purpose: the user emulator speaks only when the agent asks
// something, so a report-only first turn ends a multi-turn scenario at once
// (observed on the first run, 2026-09-30T13-14-33).
// Do not tell the agent in the query how to write the options:
// a request that hands over that structure passes on the pre-fix text too.
export const scenario: BenchmarkScenario = {
  id: "agents-rules-option-standalone",
  name: "Each next-step option is understandable without the report above it",
  agentsTemplateVars: {
    PROJECT_NAME: "Browser agent errands benchmark",
    PROJECT_RULES:
      "- Reply to the user in Russian. Code and project documents use English unless the user requests another language for a specific deliverable.",
  },
  maxSteps: 1,
  stepTimeoutMs: 300_000,
  totalTimeoutMs: 300_000,
  sandboxState: {
    commits: [],
    expectedOutcome:
      "Agent reports on round-3.md and ends with one next-step question whose every option is understandable on its own.",
  },
  userQuery:
    "Прочитай round-3.md и расскажи, что показал этот раунд. Потом задай мне один вопрос с вариантами: чем заняться дальше, чтобы агент тратил меньше денег. Пока ничего не меняй.",
  checklist: [
    {
      id: "question_asked",
      description:
        "The assistant reply must contain a report on round-3.md followed by a question about what to do next with at least two lettered or numbered options. A reply with no such question fails.",
      critical: true,
    },
    {
      id: "options_standalone",
      description:
        "Take the question(s) with lettered or numbered options about what to do next. The reader is the benchmark's owner: they know the project in general — a browser agent is run through a fixed set of test errands on real sites and every run costs money — but they skipped everything above the question in this reply and never opened round-3.md. Read ONLY each option — its title and the lines under it — as that reader. For EACH option: can they tell, from the option's own text, what would be done, to what, and why it matters? FAIL if any option needs text outside itself: (a) an id or name from the file or the report (E4, N3, b-31d9) with nothing in the option saying what it is; (b) a pointer to earlier material — «найденные странности», «эти аномалии», «оставшиеся проблемы», «текущий раунд», «как выше», «из отчёта» — without the option stating the items it means; (c) a term the assistant coined or took from the file used as if the reader knows it (e.g. «бюджет вызовов», «доля текста страниц», «чекер») with no short explanation inside the option; (d) a number whose meaning is given only above the question (e.g. «53%» without saying what it measures). Knowledge the owner has in general is not a dependency: «все 8 тестовых поручений», «прогон», site and product names (GitHub, Booking.com, YouTube) and ordinary words need no explanation when the option makes clear what they refer to. A term explained once inside the option is fine. The cross-option trade-offs and the recommendation are not options and are not scored. Quote each dependent phrase and name the option it is in. FAIL if no such question with options exists.",
      critical: true,
    },
  ],
  fixturePath: join(import.meta.dirname!, "fixture"),
  setup(): Promise<void> {
    return Promise.resolve();
  },
};
