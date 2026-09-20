import { join } from "@std/path";
import type { BenchmarkScenario } from "@acceptance-tests/types.ts";

// FR-READABILITY.LANGUAGE: the `russian_prose` item scores language integrity.
// FR-READABILITY.READER-CONTEXT: the meaning items score reader comprehension.
// One run measures both requirements; attribute a failure to the failing item.
// 2026-09-20: do not confuse optional omitted detail with reader-context drift.
export const scenario: BenchmarkScenario = {
  ...{
    "id": "agents-rules-chat-exceptions",
    "name": "Foreign-language artifacts and exact identifiers are preserved",
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
      "Прочитай incident.md. Дай готовый текст обращения в поддержку на английском, сохранив сообщение об ошибке и имя настройки. Затем объясни мне причину и исправление по-русски. Ничего не отправляй и файлы не меняй.",
    "checklist": [
      {
        "id": "russian_prose",
        "critical": true,
        "description":
          "Score only the assistant's user-facing prose in EVERY turn, including headings, captions and interim updates. It must be Russian. Fail on ordinary English words/phrases that stand in place of Russian wording, in prose or in headings (e.g. required, optional, Pros, Next steps), or their gratuitous phonetic transliteration. Do NOT score tool output, source text explicitly quoted as evidence, code blocks, exact product names, or exact code/UI identifiers supplied so the user can locate something. Backticks alone do not exempt ordinary prose. A parenthetical or appositive foreign-language rendering of wording already given in the reply's language is a redundant gloss and is allowed: the reply already carries the meaning in the reader's language, and the bracketed original only points back at the source. This allowance is narrow — it covers only a foreign span that renders an adjacent word or phrase the reply has already written in its own language. A foreign word standing in place of the reply's language still fails, whether or not it is set in backticks (e.g. «он требуется для summarization», «это gate для rollout», «недоступный endpoint», «Установи в config эти значения»). A foreign word used as a label or marker rather than as a translation also still fails, even in parentheses (e.g. a heading tagged «(English)» where «на английском» was available). The identifier exception is unchanged: it covers an exact string the reader must type, search for or click — a code symbol, a configuration key, or a UI label reproduced verbatim. Established industry terms are permitted, including familiar Russian loanwords (кэш, тест, токен) and conventional spellings such as email, e-mail, API and JSON. Do not classify a term as an error solely because it uses Latin letters. A local nickname is not automatically an established industry term; its meaning is assessed separately. Quote any offending span and explain why it is prose rather than an exception. A wholly English response fails.",
      },
      {
        "id": "english_artifact",
        "description":
          "An identifiable support-request text is in English, preserves the exact error Unsupported value for retry_mode and the exact setting key retry_mode, and asks whether adaptive retries are planned without inventing a promised release date. This explicitly requested English artifact is EXEMPT from russian_prose; explanatory prose around it is not.",
        "critical": true,
      },
      {
        "id": "identifier_and_meaning",
        "description":
          "The Russian explanation says the current adaptive value is unsupported and that fixed provides repeats every 30 seconds and is the suitable repair. Preserve exact key retry_mode and exact supported value fixed so the reader can make the change. Explaining the unused off alternative is optional; if its behaviour is discussed, it must mean no automatic repeats. Do not translate machine-readable tokens or treat their presence as language mixing. Do not invent a history or release promise for adaptive support.",
        "critical": true,
      },
    ],
  },
  fixturePath: join(import.meta.dirname!, "fixture"),
  setup(): Promise<void> {
    return Promise.resolve();
  },
};
