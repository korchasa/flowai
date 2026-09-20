import { join } from "@std/path";
import type { BenchmarkScenario } from "@acceptance-tests/types.ts";

// FR-READABILITY.LANGUAGE: the `russian_prose` item scores language integrity.
// FR-READABILITY.READER-CONTEXT: the meaning items score reader comprehension.
// One run measures both requirements; attribute a failure to the failing item.
// 2026-09-20: do not confuse optional omitted detail with reader-context drift.
export const scenario: BenchmarkScenario = {
  ...{
    "id": "agents-rules-chat-dialogue",
    "name": "Multi-turn choice remains understandable in follow-up",
    "agentsTemplateVars": {
      "PROJECT_NAME": "Chat language acceptance fixture",
      "PROJECT_RULES":
        "- Reply to the user in Russian. Code and project documents use English unless the user requests another language for a specific deliverable.",
    },
    "maxSteps": 3,
    "stepTimeoutMs": 300000,
    "totalTimeoutMs": 300000,
    "sandboxState": {
      "commits": [],
      "expectedOutcome":
        "User-facing explanation preserves the requested language, task facts, and reader-understandable meanings.",
    },
    "userQuery":
      "Прочитай delivery.md. Предложи способы обработки неудачной доставки и задай мне один вопрос, чтобы выбрать подходящий. Пока ничего не меняй.",
    "interactive": true,
    "userPersona":
      "You are a Russian-speaking delivery operator. When the assistant first asks which policy to use, reply exactly: «Выбираю повторные попытки перед ручной проверкой. Теперь напиши коллеге, который не видел наш разговор, что включаем, какие параметры выставляем и как проверить результат. Файлы не меняй.» This is an in-chat handover, not a request to send an external message. If another clarification is indispensable, answer it in Russian: the review recipient is ops@example.test and defaults of 30 seconds and three attempts are accepted. Do not tell the agent how to write, translate or explain terminology. Do not request a rewritten answer merely because its style is bad.",
    "checklist": [
      {
        "id": "russian_prose",
        "critical": true,
        "description":
          "Score only the assistant's user-facing prose in EVERY turn, including headings, captions and interim updates. It must be Russian. Fail on ordinary English words/phrases used as prose or headings (e.g. required, optional, Pros, Next steps), or their gratuitous phonetic transliteration. Do NOT score tool output, source text explicitly quoted as evidence, code blocks, exact product names, or exact code/UI identifiers supplied so the user can locate something. Backticks alone do not exempt ordinary prose. A parenthetical or appositive foreign-language rendering of wording already given in the reply's language is a redundant gloss and fails, even when it names a technical concept: the identifier exception covers only an exact string the reader must type, search for or click — a code symbol, a configuration key, or a UI label reproduced verbatim — and never a translation of ordinary source wording or of a heading. Established industry terms are permitted, including familiar Russian loanwords (кэш, тест, токен) and conventional spellings such as email, e-mail, API and JSON. Do not classify a term as an error solely because it uses Latin letters. A local nickname is not automatically an established industry term; its meaning is assessed separately. Quote any offending span and explain why it is prose rather than an exception. A wholly English response fails.",
      },
      {
        "id": "followup_occurred",
        "description":
          "The actual conversation must contain an assistant choice question, a subsequent USER selection of retries before review and handover request, and a subsequent assistant handover. A single-turn answer or a proposed hypothetical conversation fails. Fixed calibration logs may use explicit [turn 2] markers; real run logs must actually show the second user message.",
        "critical": true,
      },
      {
        "id": "handover_meaning",
        "description":
          "In the assistant response AFTER the user's choice, the reader must understand the selected behaviour without earlier turns: failed delivery retries after 30 seconds, at most three failed attempts, then goes to human review; the email recipient must be set before activation; verification uses an unavailable destination and checks the review queue plus the notification. Bare references to the first option, an earlier nickname, RetryThenReview or parameter keys cannot substitute for these meanings. Do not require the additional sentence that no deletion occurs, but fail an explicit false claim that jobs are deleted. Meaning-preserving concise explanations are allowed.",
        "critical": true,
      },
    ],
  },
  fixturePath: join(import.meta.dirname!, "fixture"),
  setup(): Promise<void> {
    return Promise.resolve();
  },
};
