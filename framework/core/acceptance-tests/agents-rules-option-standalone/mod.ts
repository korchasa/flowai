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
// Shared reader framing of the three rule-6 items.
const OPTIONS_READER =
  "Take the question(s) with lettered or numbered options about what to do next. The reader is the benchmark's owner: they know the project in general — a browser agent is run through a fixed set of test errands on real sites and every run costs money — but they skipped everything above the question in this reply and never opened round-3.md. Read ONLY each option — its title and the lines under it — as that reader. The cross-option trade-offs and the recommendation are not options and are not scored. FAIL if no such question with options exists.";

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
    // Rule 6 split into three narrow items (2026-10-18): one broad item with
    // four kinds of defect false-failed 4 of 10 clean calibration replies on
    // the claude judge, and every longer wording of it got worse.
    {
      id: "options_labels_explained",
      description:
        `${OPTIONS_READER} List every label in the options made of letters and digits: errand or anomaly ids such as E7, N9, E1–E3, N2–N4, or a build id. FAIL if a label appears in an option whose own text does not say in words what that label stands for. A label is explained when the thing it labels is described in the same option («зависание поиска на Amazon (N9)», «задание на Gmail (E7)»); a range is explained when the option says what the labelled items are. Site and product names are not labels. Quote each unexplained label and name its option.`,
      critical: true,
    },
    {
      id: "options_pointers_resolved",
      description:
        `${OPTIONS_READER} Find every pointer in an option: a phrase that names a set of items as if the reader already knew which ones — «найденные странности», «эти аномалии», «четыре сбоя», «оставшиеся проблемы», «текущий раунд», «главный вывод», «как выше», «из списка выше». FAIL if the option does not itself name ALL the items such a pointer stands for — naming some of them («четыре сбоя», then one example) fails. Fine: a pointer followed in the same option by the full list; a count stated as a fact («в трёх заданиях из семи»); a description that is complete in itself («сбои, из-за которых агент повторяет действия: …»); a sentence saying some data is missing («в файле это не измерено»). Judge only the option's own words — do not compare its list with the report. Labels such as E7 and numbers are scored by other items; ignore them here. Quote each unresolved pointer and name its option.`,
      critical: true,
    },
    {
      id: "options_numbers_terms_explained",
      description:
        `${OPTIONS_READER} Labels such as E7 or N9 and pointers such as «эти аномалии» are scored by other items; ignore them here. FAIL only for (a) a percentage or money amount from the report whose meaning the option never gives («снижает долю в 61%» with no «of what»; «сколько из $2.10 ушло» without saying whose cost $2.10 is), or (b) a coined name — a term the assistant or the file made up for a concept («бюджет вызовов», «чекер») — used as if the reader knew it, with no short explanation in the option. A number is explained only when its own sentence says what it measures: a percentage names the whole it is a share of («на текст страниц уходит около 61% стоимости»; «доля в 61%» or «доля текста 61%» with no «стоимости», «цены» or «затрат» fails), and a money amount says whose cost it is. The option's title or subject does not explain a number. Never a defect: a figure the option sets as its action («обрывать задание после 12 вызовов»); a stated cost («прогон стоит около $5»); counts of errands; ordinary words of the domain (вызов, прогон, сценарий, оценка, поручение, текст страниц); plain descriptions of what happened or what is broken, however terse; site and product names. Quote each failing number or name and its option.`,
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
