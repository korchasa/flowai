import { join } from "@std/path";
import type { BenchmarkScenario } from "@acceptance-tests/types.ts";

// FR-READABILITY.LANGUAGE: the `russian_prose` item scores language integrity.
// FR-READABILITY.READER-CONTEXT: the meaning items score reader comprehension.
// One run measures both requirements; attribute a failure to the failing item.
// 2026-09-20: do not confuse optional omitted detail with reader-context drift.
export const scenario: BenchmarkScenario = {
  ...{
    "id": "agents-rules-chat-interface",
    "name": "Interface labels explained through permissions",
    "agentsTemplateVars": {
      "PROJECT_NAME": "Chat language acceptance fixture",
      "PROJECT_RULES":
        "- Reply to the user in Russian. Code and project documents use English unless the user requests another language for a specific deliverable.",
    },
    "maxSteps": 1,
    "stepTimeoutMs": 300000,
    "totalTimeoutMs": 300000,
    "sandboxState": {
      "commits": [],
      "expectedOutcome":
        "User-facing explanation preserves the requested language, task facts, and reader-understandable meanings.",
    },
    "userQuery":
      "Прочитай описание экрана access-panel.md. Нужно дать подрядчику доступ к одному проекту на неделю. Какой режим выбрать, что заполнить и как потом отозвать доступ? Файлы не меняй.",
    "checklist": [
      {
        "id": "russian_prose",
        "critical": true,
        "description":
          "Score only the assistant's user-facing prose in EVERY turn, including headings, captions and interim updates. It must be Russian. Fail on ordinary English words/phrases that stand in place of Russian wording, in prose or in headings (e.g. required, optional, Pros, Next steps), or their gratuitous phonetic transliteration. Do NOT score tool output, source text explicitly quoted as evidence, code blocks, exact product names, or exact code/UI identifiers supplied so the user can locate something. Backticks alone do not exempt ordinary prose. A parenthetical or appositive foreign-language rendering of wording already given in the reply's language is a redundant gloss and is allowed: the reply already carries the meaning in the reader's language, and the bracketed original only points back at the source. This allowance is narrow — it covers only a foreign span that renders an adjacent word or phrase the reply has already written in its own language. A foreign word standing in place of the reply's language still fails, whether or not it is set in backticks (e.g. «он требуется для summarization», «это gate для rollout», «недоступный endpoint», «Установи в config эти значения»). A foreign word used as a label or marker rather than as a translation also still fails, even in parentheses (e.g. a heading tagged «(English)» where «на английском» was available). The identifier exception is unchanged: it covers an exact string the reader must type, search for or click — a code symbol, a configuration key, or a UI label reproduced verbatim. Established industry terms are permitted, including familiar Russian loanwords (кэш, тест, токен) and conventional spellings such as email, e-mail, API and JSON. Do not classify a term as an error solely because it uses Latin letters. A local nickname is not automatically an established industry term; its meaning is assessed separately. Quote any offending span and explain why it is prose rather than an exception. A wholly English response fails.",
      },
      {
        "id": "permission_meaning",
        "description":
          "The answer identifies the chosen mode by its effect: access to one selected project, and says to select the intended project. An exact label alone does not explain this. If the other scope is discussed, its description must not contradict team-wide access. Do NOT require an unsolicited discussion of the rejected mode or the fact that it also includes future projects: omitting those details is not reader-context drift.",
        "critical": true,
      },
      {
        "id": "expiry_and_revoke",
        "description":
          "The answer tells the reader to set expiry to a date/time one week away and explains the revocation action by its effect: the current key stops working immediately. Exact labels without these effects fail. If the answer discusses Grace Window or rotation, explain that it concerns an old key remaining usable after replacement, rather than the current key's one-week lifetime. Do not require unsolicited discussion of an unused field or the blank-expiry case. Do not invent a replacement key during revocation.",
        "critical": true,
      },
    ],
  },
  fixturePath: join(import.meta.dirname!, "fixture"),
  setup(): Promise<void> {
    return Promise.resolve();
  },
};
