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
        "Take the question(s) with lettered or numbered options about what to do next. The reader is the benchmark's owner: they know the project in general — a browser agent is run through a fixed set of test errands on real sites and every run costs money — but they skipped everything above the question in this reply and never opened round-3.md. Read ONLY each option — its title and the lines under it — as that reader. For EACH option: can they tell, from the option's own text, what would be done, to what, and why it matters? FAIL if any option needs text outside itself: (a) an id or name from the file or the report (E4, N3, b-31d9) with nothing in the option saying what it is; (b) a pointer to earlier material — «найденные странности», «эти аномалии», «оставшиеся проблемы», «текущий раунд», «как выше», «из отчёта» — without the option stating the items it means; (c) a term the assistant coined or took from the file used as if the reader knows it (e.g. «бюджет вызовов», «доля текста страниц», «чекер») with no short explanation inside the option; (d) a number whose meaning is given only above the question (e.g. «53%» without saying what it measures). Knowledge the owner has in general is not a dependency: «все 8 тестовых поручений», «прогон», site and product names (GitHub, Booking.com, YouTube) and ordinary words need no explanation when the option makes clear what they refer to. A term explained once inside the option is fine. What counts as explained: a number is explained when the same phrase says what it measures («на текст страниц уходит около 43% стоимости», «текст прочитанных страниц — половина цены»); an id is explained when the thing it labels is described beside it («пропуск строк на GitHub (N1)»); a pointer is fine when the option itself then lists the items it means («сбои из списка выше: пропуск строк на GitHub, …»); a figure the option itself sets as its action («обрывать задание после 10 вызовов») needs nothing more; a plain-words description of what happened («агент не открыл ответ отеля на Booking», «прочитал, осмотрелся, прочитал снова») is not a term. Decision rule: FAIL only by quoting a phrase that matches (a)–(d) and that none of these allowances covers. «Vague», «only partly self-explanatory», «could be clearer», «borderline» and «under a strict reading» are not grounds, and neither is a claim the reader cannot verify — the item scores whether the option can be understood, not whether its facts are proven. A missing, unlabelled or title-restating Essence line is scored by the essence item, not here. The cross-option trade-offs and the recommendation are not options and are not scored. Quote each dependent phrase and name the option it is in. FAIL if no such question with options exists.",
      critical: true,
    },
    {
      id: "essence_line_per_option",
      description:
        "Take EVERY option of EVERY set of alternatives that carries its own analysis (pros, cons, risks and the like). Does each such option have its own labelled essence line - labelled `Essence`, `Суть`, `Gist` or an equivalent - placed under the option title and BEFORE the pros, that says in plain words what would be done, to what, and what the reader gets? FAIL if any such option has no essence line; if the line carries no label or is folded into another property's line; or if it only restates the title without saying what would be done and what the reader gets. Short reply options that carry no analysis of their own (Apply / Skip / Edit, yes / no) are not scored.",
      critical: true,
    },
    {
      id: "no_catch_all_option",
      description:
        "Take EVERY question with lettered or numbered options in the reply. Does any option exist only to invite a free-form answer — an option whose whole content is «Другое», «Свой вариант», «Что-то другое, напиши что», «Иное — расскажу», «Other», «Something else» or the like, and which names no concrete action of its own? FAIL if any such catch-all option appears: the user can always type a free-form reply instead of picking a letter, so the option adds nothing. An option that names a concrete alternative is NOT a catch-all, even when its title starts with «Другое» or «Иначе» (e.g. «Другое сочетание: сначала X, потом Y») — do not fail it. A sentence outside the option list is not an option and is not scored. Quote the catch-all option and name its question when you fail.",
      critical: true,
    },
  ],
  fixturePath: join(import.meta.dirname!, "fixture"),
  setup(): Promise<void> {
    return Promise.resolve();
  },
};
