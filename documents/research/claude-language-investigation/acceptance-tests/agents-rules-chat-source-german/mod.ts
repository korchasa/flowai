import { join } from "@std/path";
import type { BenchmarkScenario } from "@acceptance-tests/types.ts";

// FR-READABILITY.LANGUAGE: the `russian_prose` item scores language integrity.
// FR-READABILITY.READER-CONTEXT: the meaning items score reader comprehension.
// One run measures both requirements; attribute a failure to the failing item.
// 2026-09-20: do not confuse optional omitted detail with reader-context drift.
//
// Source-language control. Byte-identical to `agents-rules-chat-source` except
// that the fixture is German and the language item names both German and
// English as foreign. It separates "carries wording over from an English
// source" from "mixes languages whatever the source is". See
// documents/research/claude-language-investigation/post-closure-controls.md.
export const scenario: BenchmarkScenario = {
  ...{
    "id": "agents-rules-chat-source-german",
    "name": "Russian explanation of a German operational note",
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
      "Прочитай release-note.md. Что изменилось для очереди заданий, что произойдёт при сбое и что нам нужно настроить перед включением? Файлы не меняй.",
    "checklist": [
      {
        "id": "russian_prose",
        "critical": true,
        "description":
          "Score only the assistant's user-facing prose in EVERY turn, including headings, captions and interim updates. It must be Russian. Fail on ordinary foreign-language words/phrases used as prose or headings, German or English alike (e.g. erforderlich, optional, Pros, Next steps), or their gratuitous phonetic transliteration. Do NOT score tool output, source text explicitly quoted as evidence, code blocks, exact product names, or exact code/UI identifiers supplied so the user can locate something. Backticks alone do not exempt ordinary prose. A parenthetical or appositive foreign-language rendering of wording already given in the reply's language is a redundant gloss and fails, even when it names a technical concept: the identifier exception covers only an exact string the reader must type, search for or click — a code symbol, a configuration key, or a UI label reproduced verbatim — and never a translation of ordinary source wording or of a heading. Established industry terms are permitted, including familiar Russian loanwords (кэш, тест, токен) and conventional spellings such as email, e-mail, API and JSON. Do not classify a term as an error solely because it uses Latin letters. A local nickname is not automatically an established industry term; its meaning is assessed separately. Quote any offending span and explain why it is prose rather than an exception. A wholly English response fails.",
      },
      {
        "id": "operational_meaning",
        "description":
          "The answer states all of these task facts in understandable terms: only background delivery is affected; failed work retries after 30 seconds up to three failed attempts then waits for review rather than being deleted; a notification address must be set; batch size may be omitted (20); a notification from a test failure is required before enabling. Do not demand exact wording or source section names. Fail on an omitted or wrong consequence.",
        "critical": true,
      },
    ],
  },
  fixturePath: join(import.meta.dirname!, "fixture"),
  setup(): Promise<void> {
    return Promise.resolve();
  },
};
