---
date: 2026-09-19
status: to do
implements:
  - FR-MAINT-LANG
tags: [maintenance, language]
related_tasks:
  - self-contained-questions
  - plan-variant-property-labels
---

# Maintenance category 17: files that push borrowed names and English labels into chat

## Goal

The user reads the agent's chat replies in Russian. Over the week of 2026-09-15..19 the user asked twelve times, across seven projects, to rewrite a reply "простыми словами" or named "lang drift" in it. Every rewrite did the same thing: it replaced a name taken from a file, a screen or an instruction with a description of what the thing does, and it dropped English labels the instructions themselves prescribed. The files that seed those names and labels live in the project, and `maintenance` already reads them (bucket W4). The goal is that `maintenance` reports such files as findings, so the seeds are removed before they reach a reply, instead of the user correcting each reply by hand.

## Overview

### Context

Measured on 2026-09-19 over the local Claude Code transcripts, 14 days, about 1700 sessions, about 8900 Russian assistant replies longer than 300 characters:

- The literal English tag `(recommended)` appeared in 1201 replies, against `(рекомендую)` in 1362. The tag came verbatim from a rule in `CLAUDE.md`: `tag the recommended one "(recommended)"`. The comparison rule named the four option parts as `**Pros**, **Cons**, **Risks**, **Best for**`; one session of 2026-09-18 wrote those labels in English inside a Russian reply, and the user named it language drift. Both rules are now fixed in the user's `CLAUDE.md` (labels in the language of the reply); the project-level seeds are what this task is about.
- In the twelve criticized replies the share of Latin-script words per 100 words fell after the rewrite from 24-34 to 5-12 in five cases (23.8→7.6, 23.9→6.9, 34.0→11.7, 26.3→5.4, 13.3→7.6) while the reply length barely changed (median 2704 → 2046 characters, 16 of 58 rewrites longer than the original over eight weeks). The names that went away came from three places: the screen («Topic Specific», «Team Scoped»), the code (`evidence-команда`, `Affected Surface`, `severity warning`) and the agent's own earlier coinage in the session (a nickname it gave a component two replies earlier).
- One private project's `AGENTS.md` actively pushed names over meaning: it carried «Do not invent terms. Use the terms that already exist in this project or in the industry» with no scope, so the rule applied to chat too. Narrowed to documents and code on 2026-09-19.
- Context size (135k-350k tokens at the moment of the complaint, same as the background) and the number of tool calls before the reply (2 to 75) showed no relation to the complaints. The replies were written in the agent's ordinary register; the seeds are in the files.

The project's own experiment `flowai-experiments/chat-leakage-from-project-lang` (May 2026, Sonnet 4.6 and Haiku) already names the mechanisms by which file language leaks into a Russian answer: `term-transfer` (project terms carried into the answer untranslated), `label-transfer` (English plan labels copied instead of translated), `mixed-code-switch` (a file that mixes Russian and English inside one passage), plus `file-instruction`, `middle-only-signal` and `marker-readback`. The first three are file properties a scan can find; this task turns them into maintenance checks. Results in `results/` are raw runs without a written conclusion, so thresholds below come from the transcript measurement, not from the experiment.

The reader rule («The reader did not see this session») was added on 2026-09-19 to `framework/core/assets/AGENTS.template.md`, to the user's `CLAUDE.md` and to the `AGENTS.md` of two private projects. A project whose `AGENTS.md` predates it lacks the rule; that absence is one of the findings below.

### Current State

- `framework/core/skills/maintenance/SKILL.md` runs 16 categories in 5 read-only buckets; the executable check detail lives only in the 5 `maintenance-scan-*` agents. Bucket W4 (`framework/core/agents/maintenance-scan-docs.md`) owns Cat 5 Consistency (docs vs code — terminology synonyms and claim drift), Cat 7 Instruction Coherence (contradictions, ambiguity, redundancy, scope conflicts across instruction files) and Cat 9 Documentation Health (cross-links, FR status, SRS↔SDS, index drift). None of the 16 looks at the language of a file or at names a file would push into chat.
- The `<context>` block of `SKILL.md` lists 17 categories with its own numbering (`6. Language: Inconsistent terminology`, `8. Instruction Coherence`, `9. Tooling Relevance`, `10. Documentation Health`, …, `17. Public-Surface Quality`), while the category index in Step 2, the severity rubric and the verification checklist number 16 (`7 Instruction Coherence`, `9 Documentation Health`, `16 Public-Surface Quality`). Two registries of the same list have drifted; no test asserts they agree.
- Severity anchors: `references/severity-rubric.md` has one `### Cat N — Name {#anchor}` section per category; the parent must cite an anchor for every surviving finding or drop a tier.
- Skill-local scripts ship with the skill: `framework/core/skills/tasks-overview/scripts/tasks_overview.py` reaches `dist/claude-plugins/plugins/flowai/skills/tasks-overview/scripts/` through `scripts/build-plugins.ts`, with its unit test beside it. The `maintenance` skill has no `scripts/` directory yet.
- Workers are spawned with "only the project root and a one-line ask"; they run read-only `Bash`. A worker has no way to locate the skill's directory on its own.
- Acceptance tests per category live in `framework/core/skills/maintenance/acceptance-tests/<name>/` as `mod.ts` plus a `fixture/`; `doc-health` is the model for a category test with a planted defect and a checklist.
- Requirements: `FR-MAINT`, `FR-MAINT-SCAN`, `FR-MAINT-SEVERITY`, `FR-DOC-LINT` in `documents/requirements.md`; `FR-DOC-LINT` is the model for a category FR ("slot 9 — preserved across later category additions").

### Constraints

- The new category is a file scan, not a style check: it reports files that seed names and labels, it does not judge the readability of prose. The readability floor for docs (merged 2026-09-18) stays a writing rule, not a maintenance finding.
- Deterministic parts (mixed-script paragraphs, undefined project terms) run in a Deno script with unit tests; only the parts that need to read a rule's meaning (a rule that prescribes literal reply text in another language, a rule that rewards names over meaning without scope, an output template that fixes prose fragments) stay LLM checks in the worker.
- Identifiers, code spans, fenced blocks, link targets, product names and established industry terms are never findings. A mixed-script paragraph is counted only on words outside those spans.
- No silent skip: when the script is missing or fails, the worker reports Cat 17 as NOT SCANNED for its deterministic part, the same way the parent reports a failed bucket (`FR-MAINT-SCAN`).
- The worker stays read-only; the script writes nothing and exits 2 on a missing root or an unreadable file.
- Every registry that lists categories is updated in one change and a test asserts they agree (project rule "Paired Registries").
- Category slot 17 is preserved across later additions, like slot 9 for Documentation Health.
- Chat language is not configured anywhere: the script flags the minority script inside a paragraph whatever the majority is, and the worker takes the reply language from the project's instruction files when one is declared.

## Definition of Done

- [ ] FR-MAINT-LANG: `maintenance-scan-docs.md` carries Cat 17 «Language Hygiene» with five checks (literal reply text in another language prescribed by a rule; a name-over-meaning rule without scope; mixed-script paragraphs; project terms without a definition; an output template that fixes prose fragments) and reports them under the English token `Language Hygiene`.
  - Test: `Benchmark: maintenance-language-hygiene`
  - Evidence: `grep -c "Language Hygiene" framework/core/agents/maintenance-scan-docs.md` prints at least 3
- [ ] FR-MAINT-LANG: the deterministic checks run from `framework/core/skills/maintenance/scripts/language_hygiene.ts`; it prints one finding per line as `<check> | <file:line> | <problem>`, exits 0 with or without findings, exits 2 on a missing root or an unreadable file.
  - Test: `framework/core/skills/maintenance/scripts/language_hygiene_test.ts::mixed paragraph is flagged`, `::identifiers and code spans are not counted`, `::undefined term appearing three times is flagged`, `::defined term is not flagged`, `::missing root exits 2`
  - Evidence: `deno test -A framework/core/skills/maintenance/scripts/language_hygiene_test.ts` ends with `0 failed`
- [ ] FR-MAINT-LANG: the script ships inside the built plugin and the worker is told where it is.
  - Test: `scripts/build-plugins_test.ts::skill scripts directory is copied` (existing behaviour, re-run)
  - Evidence: `deno run -A scripts/build-plugins.ts && test -f dist/claude-plugins/plugins/flowai/skills/maintenance/scripts/language_hygiene.ts` and `grep -c "language_hygiene.ts" framework/core/skills/maintenance/SKILL.md` prints at least 1
- [ ] FR-MAINT-LANG: every category registry lists 17 categories with the same names and numbers, and a unit test asserts it.
  - Test: `scripts/check-maintenance-registry_test.ts::context block, category index, rubric anchors, verification checklist and worker descriptions agree`
  - Evidence: `deno test -A scripts/check-maintenance-registry_test.ts` ends with `0 failed`; `grep -c "16 categor" framework/core/skills/maintenance/SKILL.md` prints 0
- [ ] FR-MAINT-SEVERITY: `references/severity-rubric.md` has a `### Cat 17 — Language Hygiene {#cat-17-language-hygiene}` section with one tier per check.
  - Test: `scripts/check-maintenance-registry_test.ts` (anchor presence is part of the registry assertion)
  - Evidence: `grep -c "cat-17-language-hygiene" framework/core/skills/maintenance/references/severity-rubric.md` prints 1
- [ ] FR-MAINT-LANG: the acceptance scenario `maintenance-language-hygiene` plants four defects in a fixture (a `CLAUDE.md` rule that prescribes an English tag for a Russian reply, an `AGENTS.md` without the reader rule and with an unscoped "do not invent terms" rule, a Russian `documents/design.md` paragraph with five English words outside code spans, a backticked term used four times and defined nowhere) and its checklist fails when any of the four is missing from the summary under the `Language Hygiene` header.
  - Test: `Benchmark: maintenance-language-hygiene`
  - Evidence: `deno task acceptance-tests -f maintenance-language-hygiene` reports 0 errors
- [ ] FR-MAINT-LANG: `documents/requirements.md` carries the FR block (checks, scope, acceptance scenario, unit test) and `documents/index.md` its row; `FR-MAINT-SCAN` text says 17 categories.
  - Test: `scripts/check-fr-coverage.ts` (existing)
  - Evidence: `grep -c "FR-MAINT-LANG" documents/requirements.md documents/index.md` prints at least 1 for each file
- [ ] Project stays green.
  - Test: `deno task check`
  - Evidence: `deno task check` ends with `0 failed` on every summary line

## Solution

Variant chosen by the user on 2026-09-19: a new category 17 in bucket W4, with the measurable checks in a skill-local Deno script and the rule-reading checks in the worker. The two alternatives weighed were sub-checks inside Cat 5 and Cat 7 without a script (findings would carry another category's label and the Latin-share number would vary between runs) and a standalone `deno task` without touching the skill (would miss the three checks that need to read a rule's meaning and would not reach the maintenance summary).

1. **Green baseline.** Run `deno test -A scripts/check-agents-template_test.ts scripts/build-plugins_test.ts` and `deno task acceptance-tests -f maintenance-detects-doc-health-issues`; record the result before any edit.

2. **Script (RED → GREEN).** Write `framework/core/skills/maintenance/scripts/language_hygiene_test.ts` first, then `language_hygiene.ts`:
   - Input: project root (positional). Prose roots: `README.md`, `AGENTS.md`, `CLAUDE.md`, `documents/**/*.md`, `docs/**/*.md`, `.claude/**/*.md`, `.codex/**/*.md`, `.cursor/**/*.md`; skip `node_modules`, `.git`, `dist`, `acceptance-tests/runs`, and any `fixture/` directory.
   - Strip fenced blocks, inline code, link targets and HTML tags; split into paragraphs; classify each word by script (Cyrillic / Latin / other). Skip words that look like identifiers (contain `_`, `.`, `/`, `-` inside, or a digit) and words in an allow-list of product names read from the file's own backticked tokens.
   - `mixed-paragraph`: minority script ≥ 20% of counted words and ≥ 3 words. Report `file:line` of the paragraph start and the minority words.
   - `undefined-term`: a backticked or CapitalizedCamel/ALLCAPS token (≥ 4 characters, not an identifier by the rule above) that appears in ≥ 3 prose files or ≥ 5 times overall and has no definition line — a line where the token is followed by ` — `, `: `, ` is `, ` means `, ` — это`, ` означает`, or sits in a section whose heading contains `Glossary`, `Terms`, `Термины`, `Словарь`.
   - Output: one line per finding, `<check> | <file:line> | <problem>`; nothing else on stdout. Exit 0 always when the scan ran; exit 2 with the path on stderr when the root is missing or a file cannot be read. No configuration file, no thresholds on the command line in this version.
   - Tests use small in-memory fixtures written to a temp dir: a Russian paragraph with five English words (flagged), the same paragraph with the words in backticks (not flagged), an English paragraph with one Russian word (not flagged: below 3 words), a term used four times with no definition (flagged), the same term with a `Glossary` section (not flagged), a missing root (exit 2).

3. **Worker.** Edit `framework/core/agents/maintenance-scan-docs.md`: frontmatter description → `Cats 5, 7, 9, 17`; add `### Cat 17 — Language Hygiene` to "Check detail" with the five checks. The two deterministic checks say: run `deno run --allow-read <script path> <project root>` where the script path is the one the parent passed in its ask; if no path was passed or the command fails, emit the line `Language Hygiene | (not scanned) | script <path> unavailable: <error>` and continue with the three LLM checks. The three LLM checks:
   - **Prescribed literal in another language**: read the project's instruction files; when a file declares a reply language (`reply in Russian`, `отвечай по-русски`, or the user-level rule is quoted), flag every rule in the same or another instruction file that tells the agent to write a literal string (a tag, a label, a header, a sentinel) in a different language — `"(recommended)"`, `**Pros**`, `Model check:` are the known shapes. Fix: state the literal in the reply language or say "in the language of the reply".
   - **Name-over-meaning rule without scope**: flag rules of the shape "do not invent terms", "use existing terms", "be precise — use the exact identifier" that do not limit themselves to documents and code, and instruction files that lack the reader rule (`The reader did not see this session`) when the project's `AGENTS.md` derives from the flowai template. Fix: scope the rule to documents and code; add the reader rule.
   - **Output template with prose fragments**: for every skill, command and agent in the project whose output is read by a person, flag templates that fix prose fragments (not section headers) in a language other than the reply language — e.g. `Say: "All checks passed"`. Fix: keep the header literal, let the prose follow the reply language.
   - Bucket-scoped constraint and output format updated to include Cat 17.

4. **Skill.** Edit `framework/core/skills/maintenance/SKILL.md`: rewrite the `<context>` list to the 17 names and numbers of the category index (this also fixes the existing drift); add `17 Language Hygiene` to the W4 line of the index; `16` → `17` in Step 1 and Step 2; the W4 spawn ask carries the script path resolved from this skill's directory (`<this skill's directory>/scripts/language_hygiene.ts`, the same wording `tasks-overview` uses); add the verification line `[ ] Checked Language Hygiene (FR-MAINT-LANG) — findings grouped under the dedicated \`Language Hygiene\` header; deterministic part reported as not scanned when the script was unavailable`; extend `Cats 10-16` to `Cats 10-17` where the range means "all architectural categories" — or leave it and name 17 separately, whichever keeps the sentence true.

5. **Rubric.** Add `### Cat 17 — Language Hygiene {#cat-17-language-hygiene}` to `references/severity-rubric.md`: rule prescribing a literal in another language for a reply → `[High]` (it seeds every question the agent asks); unscoped name-over-meaning rule or missing reader rule → `[Medium]`; output template with foreign prose fragments → `[Medium]`; mixed-script paragraph → `[Low]`; undefined project term → `[Low]`, `[Medium]` when the term appears in an instruction file. Update the calibration example only if it enumerates categories.

6. **Registry test.** Write `scripts/check-maintenance-registry_test.ts`: parse the `<context>` list, the category index lines, the `### Cat N — Name` headings of the rubric, the verification checklist and the `Cats …` list in each of the 5 worker descriptions; assert the same set of `(number, name)` pairs and that every worker's categories are a partition of the set. Run it; it must fail on the current tree (the drift) and pass after step 4 — that is the RED of this step.

7. **Acceptance test.** Create `framework/core/skills/maintenance/acceptance-tests/language-hygiene/mod.ts` modelled on `doc-health/mod.ts` (id `maintenance-language-hygiene`, persona answers "done", the same English-report preamble in the query) and a `fixture/` with the four planted defects from the DoD. Checklist items, all critical: dedicated `Language Hygiene` header; the `(recommended)` rule flagged; the unscoped term rule or the missing reader rule flagged; the mixed paragraph flagged with the file name; the undefined term flagged; each finding carries `(Fix: …)`; no file changed during the scan. Register the scenario wherever `doc-health` is registered (grep `maintenance-detects-doc-health-issues` across `acceptance-tests/` and `documents/`).

8. **Requirements and index.** Add `FR-MAINT-LANG: Language Hygiene Category in Maintenance` to `documents/requirements.md` after `FR-DOC-LINT`, same shape (checks, scope "slot 17 — preserved across later category additions", acceptance scenario, unit test, status `[ ]`); add the row to `documents/index.md`; update `FR-MAINT-SCAN` and any SDS paragraph that says 16 categories (grep `16 categor` and `maintenance-scan-docs` across `documents/`).

9. **Build and check.** `deno run -A scripts/build-plugins.ts`, confirm the script landed in `dist/`; `deno task check`; `deno task acceptance-tests -f maintenance-language-hygiene` and `-f maintenance-detects-doc-health-issues` (the W4 worker changed, so the neighbouring scenario must still pass). Record the verdicts in this file's DoD evidence.

10. **Out of scope, recorded here so it is not lost.** Chat-transcript scanning (the measurement that produced this task) stays a manual procedure; `reflect-by-history` is the place for it if it is ever automated. The user's `CLAUDE.md` files are outside the project and were fixed by hand on 2026-09-19.
