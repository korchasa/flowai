import { join } from "@std/path";
import type { BenchmarkScenario } from "@acceptance-tests/types.ts";

// FR-READABILITY.LANGUAGE: the `russian_prose` item scores language integrity.
// FR-READABILITY.READER-CONTEXT: the meaning items score reader comprehension.
// One run measures both requirements; attribute a failure to the failing item.
// 2026-09-20: do not confuse optional omitted detail with reader-context drift.
export const scenario: BenchmarkScenario = {
  ...{
    "id": "agents-rules-chat-code",
    "name": "Code identifiers explained through behaviour",
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
      "Посмотри history.ts. Как здесь освобождают место в истории разговора, какие настройки на это влияют и какой способ выбрать, если важно сохранить договорённости из начала разговора? Файлы не меняй.",
    "checklist": [
      {
        "id": "russian_prose",
        "critical": true,
        "description":
          "Score only the assistant's user-facing prose in EVERY turn, including headings, captions and interim updates. It must be Russian. Fail on ordinary English words/phrases used as prose or headings (e.g. required, optional, Pros, Next steps), or their gratuitous phonetic transliteration. Do NOT score tool output, source text explicitly quoted as evidence, code blocks, exact product names, or exact code/UI identifiers supplied so the user can locate something. Backticks alone do not exempt ordinary prose. A parenthetical or appositive foreign-language rendering of wording already given in the reply's language is a redundant gloss and fails, even when it names a technical concept: the identifier exception covers only an exact string the reader must type, search for or click — a code symbol, a configuration key, or a UI label reproduced verbatim — and never a translation of ordinary source wording or of a heading. Established industry terms are permitted, including familiar Russian loanwords (кэш, тест, токен) and conventional spellings such as email, e-mail, API and JSON. Do not classify a term as an error solely because it uses Latin letters. A local nickname is not automatically an established industry term; its meaning is assessed separately. Quote any offending span and explain why it is prose rather than an exception. A wholly English response fails.",
      },
      {
        "id": "strategy_meaning",
        "description":
          "Explain the two choices by their behaviour: delete oldest messages to fit a text budget versus replace older messages with a generated summary and retain recent ones. Explain the recommendation for retaining early agreements and the extra model call required by summarization. Class/function names alone do not satisfy this check; omitting names is fine.",
        "critical": true,
      },
      {
        "id": "settings_meaning",
        "description":
          "Explain the two concrete controls without relying on the reader knowing code identifiers: maxChars is a limit on characters in retained message content (default 12000), keepRecent is a count of latest messages kept unchanged by summarization (default 6). Exact spelling is optional. Merely listing names/numbers without units and roles fails. Do not judge incidental variable names inside code examples.",
        "critical": true,
      },
    ],
  },
  fixturePath: join(import.meta.dirname!, "fixture"),
  setup(): Promise<void> {
    return Promise.resolve();
  },
};
