import { join } from "@std/path";
import type { BenchmarkScenario } from "@acceptance-tests/types.ts";

// FR-CHAT-LINKS.RULE: a chat reply that points the user at project files gives
// each one as a Markdown link whose target resolves from the project root, so
// the user opens it with one click. The fixture nests every file two or three
// levels deep, so a path written from the wrong base, or left in backticks, is
// visible to the judge.
export const scenario: BenchmarkScenario = {
  ...{
    "id": "agents-rules-file-links",
    "name": "File references in a chat reply are clickable links",
    "agentsTemplateVars": {
      "PROJECT_NAME": "Invoicing service",
      "PROJECT_RULES": "- Reply to the user in Russian.",
    },
    "maxSteps": 1,
    "stepTimeoutMs": 300000,
    "totalTimeoutMs": 300000,
    "sandboxState": {
      "commits": [],
      "expectedOutcome":
        "The reply names the files that compute the invoice total, hold the Bulgarian VAT rate and test the total, each as a Markdown link from the project root.",
    },
    "userQuery":
      "Где в этом проекте считается итоговая сумма счёта с НДС и где задана ставка для Болгарии? Назови файлы, которые мне открыть, чтобы поменять ставку и проверить изменение тестом. Файлы не меняй.",
    "checklist": [
      {
        "id": "files_are_links",
        "critical": true,
        "description":
          "Score only the assistant's FINAL reply. The project contains exactly these files: `src/billing/invoice.ts` (computes the gross total), `src/billing/tax/rates.ts` (holds the VAT rate table, Bulgaria is `BG: 0.2`), `src/api/routes/invoices.ts` (HTTP handler), `tests/billing/invoice_test.ts` (test of the gross total), `README.md`, `deno.json`. Every time the final reply gives one of these files as a path with a directory (e.g. `src/billing/invoice.ts`, `tax/rates.ts`), the reference must be a Markdown link of the form `[text](target)`; a path with a directory given only in backticks, in bold, or as plain text fails, even when a link to the same file appears elsewhere in the reply. The first reference to each of the three files the user needs (`src/billing/invoice.ts`, `src/billing/tax/rates.ts`, `tests/billing/invoice_test.ts`) must be a link, whatever its form. A later bare file name with no directory (`rates.ts`) for a file the reply has already linked is a short back-reference and is fine. Fail and quote each offending span. A line number in the link text or as a `:N` suffix of the target is fine. Paths inside a fenced code block are not scored.",
      },
      {
        "id": "link_targets_resolve",
        "critical": true,
        "description":
          "Score only the assistant's FINAL reply. Every Markdown link target that names a local file must resolve to an existing project file, after dropping an optional `:N` line suffix or `#anchor`: one of `src/billing/invoice.ts`, `src/billing/tax/rates.ts`, `src/api/routes/invoices.ts`, `tests/billing/invoice_test.ts`, `README.md`, `deno.json`. An absolute filesystem path that ends in one of these project paths is also fine — it opens the same file. A target that drops leading directories (`billing/invoice.ts`, `tax/rates.ts`, `rates.ts`) or names a file that does not exist fails. Quote each failing target. A reply with no link at all fails this item.",
      },
      {
        "id": "answer_names_the_right_files",
        "critical": true,
        "description":
          "The final reply says that the total with VAT is computed in `src/billing/invoice.ts`, that the Bulgarian rate is set in `src/billing/tax/rates.ts`, and that `tests/billing/invoice_test.ts` is the test to run after the change. Score the content only, not the link format.",
      },
    ],
  },
  fixturePath: join(import.meta.dirname!, "fixture"),
  setup(): Promise<void> {
    return Promise.resolve();
  },
};
