---
date: 2026-09-01
status: done
implements:
  - FR-DESC-QUALITY
tags: [skills, context-budget, check-skills]
related_tasks:
  - 2026/06/rewrite-skill-descriptions.md
---
# Cap skill description length so the skill listing fits the IDE budget [ANC:task:2026-09-skill-description-length-cap]

## Goal

Put a hard per-entry ceiling on `description` length so no single skill listing entry is truncated by the IDE, and so the total listing cannot keep growing one long description at a time.

This does NOT by itself keep a multi-pack listing inside the IDE's total budget — `core` + `engineering` stays above 2k est. tokens even with every entry at the cap. The per-pack budget gate is a separate, unbuilt step recorded under Follow-ups.

## Overview

### Context

An IDE shows the model one line per installed skill — name plus `description` — on every turn. Claude Code budgets that listing at roughly 1 % of the context window (about 2k tokens on a 200k window); past the budget, entries are truncated and description-based routing degrades.

Measured on 2026-09-01 over `framework/*/{skills,commands}/*/SKILL.md` (estimate: characters / 4):

- 63 entries in total, about 3.7k est. tokens when every pack is installed.
- `core` alone: 20 entries, about 1.26k est. tokens. `engineering`: 15 entries, about 1.05k. `core` + `engineering` already exceed the 2k budget.
- Mean description length about 290 characters; the longest (`delegate-to-ide`, `review`, `plan`) are 380–384 characters.

The agentskills.io limit (1024 characters) is far above the point where the listing overflows, so the spec does not protect the budget.

This repository already records a per-entry number for Claude Code: `documents/ides-difference.md` line 177 — "Skill listing budget: 1% of context window, 250 char/skill cap", footnoted to the official skills documentation (`[^11]`) and to CLI experiments (`[^33]`). That line was not surfaced when the cap value was first proposed; `plan-critic` found it on 2026-09-09 and it decided the number.

Re-measured 2026-09-09 with the same method: 53 entries (43 skills + 10 commands), 14 807 characters ≈ 3 702 est. tokens. Per pack: `core` 22 entries ≈ 1 406 est. tokens, `engineering` 15 ≈ 981, `devtools` 6 ≈ 446, `beta` 3 ≈ 267, `memex` 3 ≈ 251, `typescript` 2 ≈ 153, `deno` 2 ≈ 146. The 2026-09-01 count of 63 entries does not reproduce; 53 is what the tree holds today.

### Current State

`scripts/check-skills.ts` validates descriptions under criterion `FR-DESC-QUALITY` (wording quality) but has no length cap. `scripts/check-trigger-coverage.ts` requires three trigger scenarios per skill, which is how description changes are verified behaviourally.

Four length limits on the same field already exist, and none of them protects the listing budget:

- `validateSkillFrontmatter` in `scripts/check-skills.ts` — 1024 characters, the agentskills.io spec limit.
- `validateProgressiveDisclosure` in `scripts/check-skills.ts` — `FRONTMATTER_MAX_TOKENS = 100` est. tokens over `name + description` (≈400 characters), criterion `FR-UNIVERSAL.DISCLOSURE`, also the spec limit. Nothing breaches it today: the maximum measured is 99 (`delegate-to-ide`), and 12 entries sit in the 90–99 band.
- `framework/devtools/skills/engineer-skill/scripts/validate_skill.ts` — its own 1024-character floor, the portable copy of the spec limit. `engineer-skill/SKILL.md` line 305 documents how the two numbers relate ("repo gate ~400 chars … stricter than the floor's 1024-char description limit"); a further number makes that sentence wrong.
- `framework/devtools/skills/engineer-skill/SKILL.md` line 312 — an authoring rubric item, not a gate: "Within budget — name+description ≲ 75 tokens (~300 chars) for headroom?". It is advisory, unenforced, and measured over `name + description` rather than over the description alone.

The decision recorded 2026-09-09 (user): the new cap is an independent limit with its own rationale (the IDE listing budget), NOT a tightening of `FRONTMATTER_MAX_TOKENS`, so the spec limit and the budget limit can move apart without one silently redefining the other.

A consequence to record honestly rather than hide: at a 250-character description cap the longest possible `name + description` is about 280 characters ≈ 70 est. tokens, so `FRONTMATTER_MAX_TOKENS = 100` can no longer be reached by any conforming skill. It stops being a live gate and becomes a documented spec ceiling that the stricter budget cap always trips first. It is kept — the spec limit is still the correct thing to state — but the SRS and the module header must say that it is unreachable while the budget cap stands, so a later reader does not treat a green `FR-UNIVERSAL.DISCLOSURE` as evidence of anything.

Of the 36 descriptions over 250 characters, four are build artefacts — `core/skills/plan` (384), `core/skills/review` (383) and `core/skills/implement` (306) render from `framework/atoms/`, and `core/commands/ship-task` (258) renders from `framework/composites/ship-task.md`. Their `SKILL.md` is gitignored and must never be hand-edited; the shortening goes into the source and the file is regenerated.

### Constraints

- A cap must not break trigger accuracy: shortening a description is a skill change and goes through the Acceptance-Test TDD flow (`trigger-pos-1` / `trigger-adj-1` / `trigger-false-1` per skill).
- Commands (`framework/*/commands/`) count toward the listing too, even though they are exempt from trigger coverage.
- The cap value is a decision above the class/method line: propose it with the measured distribution, do not pick it silently. Decided 2026-09-09 (user): **250 characters**, matching the per-skill cap this repo already records for Claude Code in `documents/ides-difference.md` line 177. 36 of 53 entries are over it today.
- The existing `validateDescriptionWhenTrigger` runs only for `kind === "skill"`. The length cap must also cover `commands/`, so the new check needs its own gating condition rather than reusing that one.
- A framework-only check that is not registered in the coupling/wiring test in `scripts/check-skills_test.ts` stays dormant in production — this already happened once, with the `isFrameworkSkillsDir` relative-path guard (fixed by the related task `2026/06/rewrite-skill-descriptions.md`).
- The full trigger sweep (105 runs for the 35 shortened skills; the shortened `ship-task` is a command and carries no trigger scenarios) is the CHECK phase and is handed to the user per the project's Acceptance-Test TDD rules; it is not run inside this task.
- Decided 2026-09-09 (user): this task stops after the local commit. No push, no release. Pushing a `feat:` commit to `main` cuts a `framework-v<version>` release, and the shortened descriptions must not reach users before the trigger sweep has run.

### Affected Surface

Report returned by `surface-scout` on 2026-09-09, verbatim:

```
## Surface

- `scripts/lib/skill-limits.ts` — already defines `FRONTMATTER_MAX_TOKENS = 100` (~400 chars), a cap on the COMBINED `name + description` catalog metadata, enforced today. A new independent per-description length cap risks a second, differently-scoped limit on the same field. — evidence: `/Users/korchasa/www/flowai/flowai/scripts/lib/skill-limits.ts` lines 1-38.
- `scripts/check-skills.ts` `validateProgressiveDisclosure` — already fails `deno task check` when `catalogTokens &gt;= FRONTMATTER_MAX_TOKENS` (name+description ~400 chars), under criterion `FR-UNIVERSAL.DISCLOSURE`. The new cap must not silently duplicate or contradict this gate. — evidence: `/Users/korchasa/www/flowai/flowai/scripts/check-skills.ts` lines 264-300.
- `scripts/check-skills.ts` `validateDescriptionWhenTrigger` / `validateSkill` — the natural insertion point for the new length check under `FR-DESC-QUALITY`, called only when `isFrameworkSkillsDir(skillsDir)` is true. Currently the WHEN-trigger check is skill-only (`kind === "skill"`); the length cap task wants both skills AND commands covered, so the gating condition needs to change, not just add a new function. — evidence: lines 591-601.
- `framework/devtools/skills/engineer-skill/scripts/validate_skill.ts` — a THIRD, already-existing description length cap: 1024 characters, the portable agentskills.io floor, independent of `check-skills.ts`. Its own SKILL.md (line 305) documents the dual-cap relationship ("repo gate ~400 chars … stricter than the floor's 1024-char description limit"). Adding a fourth number without reconciling all three creates confusion about which cap actually binds. — evidence: `/Users/korchasa/www/flowai/flowai/framework/devtools/skills/engineer-skill/scripts/validate_skill.ts` lines 165-169, and `SKILL.md` line 305.
- `documents/requirements.md` `FR-DESC-QUALITY` section (lines 736-745) — already exists and is marked `[x]` (WHEN-trigger gate). The task's DoD asks to add length-cap language to the SAME FR id rather than create a new one; the existing Desc/Allowlist/Acceptance prose must be amended without breaking the WHEN-trigger acceptance evidence that is already `[x]`. — evidence: lines 736-745.
- `documents/requirements.md` `FR-UNIVERSAL.DISCLOSURE` section (lines 1389-1393) — the SRS place that already documents the ~400-char/100-token catalog cap. A length-cap change to `FR-DESC-QUALITY` overlaps this FR's subject matter; both sections may need cross-referencing or reconciling. — evidence: lines 1389-1393.
- `documents/design.md` §3 Components, lines 380-381 — this is where FR-DESC-QUALITY is actually documented today, NOT §5 as the task's DoD literally states ("SDS §5 lists the validation rule"). `documents/design.md`'s actual §5 is "Future Extensions" (line 758); there is no "§5 Logic/validation rules" section in this file, contradicting both the task text and the general Documentation Map rule in project `CLAUDE.md`. This is a contradiction that should be raised, not silently resolved. — evidence: `documents/design.md` lines 3-9, 380-381, 758.
- `documents/index.md` line 28 — the one-line FR-DESC-QUALITY index entry ("skills/ description must carry a WHEN-trigger phrase") needs updating if the FR's scope is widened to a length cap. — evidence: line 28.
- `framework/atoms/*.md` and `framework/composites/*.md` sources for the generated `SKILL.md` targets — 6 atoms (`plan`, `review`, `commit`, `implement`, `push`, `reflect-gate`) and 4 composites (`review-and-commit`, `review-commit-push`, `ship`, `ship-task`) are build artifacts (`framework/composites.yaml`). Their rendered `SKILL.md` descriptions are among the longest measured (commit 168, push 224, review-and-commit 181, review-commit-push 243, ship-task 258, ship 172, plan 384, review 383, implement 306). Any description over the new cap must be shortened in the atom/composite SOURCE, then regenerated via `deno run -A scripts/generate-skill-composites.ts --write`, never hand-edited in the gitignored `SKILL.md`. — evidence: `/Users/korchasa/www/flowai/flowai/framework/composites.yaml`, `framework/atoms/plan.md` line 3 (384 chars), `framework/atoms/commit.md` line 3.
- Every standalone `framework/*/skills/*/SKILL.md` and `framework/*/commands/*/SKILL.md` description — 44 measured, several already exceed 300 characters (`plan` 384, `review` 383, `delegate-to-ide` 380, `investigate` 352, `save` 364, `engineer-hook` 360, `reflect` 336, `engineer-ai-ide-plugin` 336, `write-gods-tasks` 356, `epic` 326, `select-llm-model` 325, `write-prd` 325, `setup-agent-code-style-strict` 327, `cli` 329, `ask` 322, `audit` 320, `diagnose-benchmark-failure` 349, `engineer-prompts-for-instant` 343, `engineer-prompts-for-reasoning` 334). Any of these is a shortening candidate depending on the chosen cap. — evidence: python scan output above, all 44 files under `framework/*/{skills,commands}/*/SKILL.md`.
- `framework/*/skills/*/acceptance-tests/trigger-{pos,adj,false}-1/mod.ts` — 41 skills carry these trigger scenarios (listed above); the DoD explicitly requires re-running the 3 trigger scenarios for EVERY shortened skill to confirm the shorter description keeps routing behavior unchanged. This is a wide benchmark surface, not a unit-test-only change. — evidence: `find framework -path '*acceptance-tests/trigger-pos-1*'` listing 41 skill directories.
- `scripts/check-skills_test.ts` — needs the new `description length cap` test case (named explicitly in the task's DoD) plus updates to the two existing "coupling"/"end-to-end wiring" regression tests (documented in `design.md` line 381) that assert every framework-only check fires — the new check must be added to that wiring test or it stays silently dormant like the historical `isFrameworkSkillsDir` bug. — evidence: `scripts/check-skills_test.ts`, `documents/design.md` line 381.
- `scripts/lib/skill-limits.ts` header comment — states "Consumers (keep this list current when adding new ones)" listing `check-skills.ts`, `generate-skill-composites.ts`, `check-skills_test.ts`. A new `DESCRIPTION_MAX_CHARS`-type constant belongs here per the module's own convention, and the consumer list must be updated if `generate-skill-composites.ts` needs to know about it (e.g., to warn when a rendered composite's description would exceed the cap). — evidence: lines 1-16.
- `scripts/generate-skill-composites.ts` — currently validates only `SKILL_MAX_LINES`/`ATOM_MAX_LINES` for composite output (line 601-603); does not check description length on the rendered composite. If a composite's atom-sourced description could regress over the cap after a future atom edit, this generator is a candidate for a parallel check (or explicit exemption decision), mirroring the `SKILL_MAX_LINES` composite-exemption precedent already in place for FR-UNIVERSAL.DISCLOSURE. — evidence: lines 558-603.
- `documents/tasks/2026/06/rewrite-skill-descriptions.md` — direct precedent task (status: done) that already rewrote weak descriptions across the same 44 primitives, including atom/composite sources for `commit`, `push`, `ship`, `ship-task`. It records prior decisions (e.g. "review-and-commit is already clean") that the new length-cap sweep will re-touch; its "Second enforcement surface" section already put the `validate_skill.ts` mirror under `FR-DESC-QUALITY` "multi-surface acceptance" umbrella, so that file is explicitly in scope for consistency even though the new task's DoD does not mention it. — evidence: full file, especially lines 1-40.
- `scripts/check-fr-coverage_test.ts` — named directly as evidence in the task DoD for FR item 3; needs to be confirmed it actually exercises `FR-DESC-QUALITY`'s acceptance-reference presence (current grep found no direct `FR-DESC-QUALITY` string in that test file — it is a generic coverage-parser test, not FR-specific). — evidence: grep of `scripts/check-fr-coverage_test.ts` for `FR-DESC-QUALITY` returned nothing.
- `README.md` §Packs (lines 244-360+) — per the project's Documentation Map, any SKILL.md description change routes here for review. README uses independently-written short blurbs (not verbatim descriptions), so likely unaffected, but should be diffed against any semantic change from shortening (e.g., if a shortened description drops a capability mentioned in the README blurb). — evidence: README.md lines 249-333, none contain verbatim `description:` text.
- `documents/tasks/2026/09/skill-description-length-cap.md` itself — the task's own DoD item 3 evidence line references `grep -n "length" documents/requirements.md | grep -i desc`, which is a weak grep (matches unrelated "length" occurrences near "desc*" words); worth confirming it actually targets the FR-DESC-QUALITY section and not a false positive elsewhere in the 1389-line SRS.

## Queries used

- `ls`, `find framework -maxdepth 3 -type d \( -name skills -o -name commands \)`
- `grep -rn "FR-DESC-QUALITY"` (excluding `acceptance-tests/runs/`)
- `grep -n "validateDescription\|description" scripts/check-skills.ts`
- `grep -n "description" scripts/resource-types.ts`
- `cat scripts/lib/skill-limits.ts`
- python scan of all `framework/*/{skills,commands}/*/SKILL.md` description lengths
- `cat framework/composites.yaml`
- `grep -n "description" framework/atoms/plan.md framework/atoms/commit.md`
- `find framework -path '*acceptance-tests/trigger-pos-1*' -name mod.ts`
- `grep -n "discoverSkillsDirs" scripts/*.ts`
- `find framework/devtools/skills/engineer-skill -type f | grep -i validate`
- `grep -n "FR-DESC-QUALITY\|desc-quality" scripts/check-fr-coverage.ts scripts/check-fr-coverage_test.ts documents/index.md`
- `grep -n "engineer-skill|validate_skill" documents/design.md`
- `grep -n "^## [0-9]" documents/design.md`
- `grep -n "character|char\b|length" framework/devtools/skills/engineer-skill/SKILL.md framework/devtools/skills/engineer-skill/scripts/validate_skill.ts`
- `grep -n "FR-UNIVERSAL.DISCLOSURE" -A 12 documents/requirements.md`
- `cat documents/tasks/2026/06/rewrite-skill-descriptions.md`
- `grep -n "README" README.md` (Packs section read directly)

## Not examined (budget)

- Did not open every one of the 41 `trigger-{pos,adj,false}-1/mod.ts` files individually to check which ones assert on exact description substrings (a shortened description could break a scenario that checks for a specific trigger phrase still present in the text, beyond the WHEN-trigger allowlist).
- Did not check `scripts/check-pack-refs.ts` in full for any description-related leakage checks.
- Did not check whether `.claude/skills/` dev-only copies (out of `check-skills.ts` scope per `discoverSkillsDirs("framework")`) are separately validated by another script that also reads descriptions.
- Did not inspect `framework/atoms/*.md` and `framework/composites/*.md` beyond `plan.md` and `commit.md` for their current description lengths (only inferred via the rendered SKILL.md lengths, which should match but were not independently confirmed for all 10 generated targets).
- Did not run `deno task check` or `scripts/check-skills_test.ts` to get a live baseline pass/fail state before this change.

## Could not rule out

- Whether the intended new cap is meant to REPLACE or coexist with `FRONTMATTER_MAX_TOKENS` (~400 chars combined name+description) — the task's "Measure" step proposes candidate caps (200/250/300) without referencing the existing token cap, suggesting the task author may not be aware of it. This should be surfaced to the user before implementation, since it changes whether this is a net-new gate or a tightening/replacement of an existing one.
- Whether `commands/` descriptions are meant to go through the same allowlist-based `FR-DESC-QUALITY` mechanism or a parallel one, given the current WHEN-trigger check explicitly exempts `commands/` but the length-cap DoD explicitly includes them ("every shipped skill and command").
```

Disposition per surface item (union of the scout's list and the planner's own enumeration):

- `scripts/lib/skill-limits.ts` — covered-by Solution step 1 (new `DESCRIPTION_MAX_CHARS = 250` beside the existing limits, with its own rationale block and the consumer list refreshed).
- `scripts/check-skills.ts` `validateProgressiveDisclosure` / `FRONTMATTER_MAX_TOKENS` — covered-by Solution step 1 and step 6. The code is not edited, but the check becomes unreachable: at a 250-character description cap the maximum `name + description` is ≈70 est. tokens against a 100-token limit. The constant stays as the stated spec ceiling; the module header and the SRS record that the budget cap always trips first, so nobody reads a green `FR-UNIVERSAL.DISCLOSURE` as a live signal.
- `scripts/check-skills.ts` `validateDescriptionWhenTrigger` / `validateSkill` — covered-by Solution step 3 (new `validateDescriptionLength` called for both kinds from the framework-only branch; the WHEN-trigger gate keeps its skill-only condition).
- `framework/devtools/skills/engineer-skill/scripts/validate_skill.ts` + its `SKILL.md` line 305 — covered-by Solution step 6 (the dual-cap sentence becomes a triple-cap sentence; the bundled validator keeps its 1024-character portable floor and gains no new number).
- `documents/requirements.md` `FR-DESC-QUALITY` (lines 736–745) — covered-by Solution step 6 and DoD item 3.
- `documents/requirements.md` `FR-UNIVERSAL.DISCLOSURE` (lines 1389–1393) — covered-by Solution step 6 (cross-reference naming the two limits and their different reasons).
- `documents/design.md` §3.4.3 (lines 380–381) — covered-by Solution step 6. The scout's contradiction about "SDS §5" was raised with the user on 2026-09-09 and resolved by them: the rule goes to §3.4.3, and DoD item 3 is corrected to say so.
- `documents/index.md` line 28 — covered-by Solution step 6.
- `framework/atoms/{plan,review,implement}.md` and `framework/composites/ship-task.md` — covered-by Solution step 5 (source edit plus regeneration). The other atoms and the other three composites measure at or under 250 and need no edit (commit 168, push 224, review-and-commit 181, review-commit-push 243, ship 172).
- Standalone `framework/*/skills/*/SKILL.md` descriptions over 250 — covered-by Solution step 5, 32 files.
- `framework/*/commands/*/SKILL.md` descriptions — covered-by Solution step 5. Exactly one command is over the 250 cap — `ship-task` at 258 — and it is a generated composite, so the edit goes into `framework/composites/ship-task.md`. The gate applies to all commands regardless, so a future command cannot exceed it.
- `framework/*/skills/*/acceptance-tests/trigger-*` — deferred — human choice. 35 shortened skills invalidate 105 cached scenarios. Per the project's Acceptance-Test TDD rules the full sweep is the CHECK phase and is handed to the user; recorded under Follow-ups. Nothing ships before it runs: the user decided on 2026-09-09 that this task ends at the local commit, with no push and no release.
- `scripts/check-skills_test.ts` — covered-by Solution steps 2 and 4 (the new boundary case plus registration in the coupling/wiring test).
- `scripts/generate-skill-composites.ts` — not affected — its canon validator checks line counts, and the rendered description is copied from the atom source that step 5 shortens; `deno task check` regenerates and then re-validates through `check-skills.ts`, so a regressed atom description fails there. No parallel check is added.
- `documents/tasks/2026/06/rewrite-skill-descriptions.md` — not affected — a completed record, read as context, not edited.
- `scripts/check-fr-coverage_test.ts` — covered-by DoD item 4: the scout is right that this file holds no `FR-DESC-QUALITY` string, so the evidence line is replaced with a command that actually proves the SRS text.
- `documents/ides-difference.md` line 177 — not affected — a read-only IDE-capability reference (project `CLAUDE.md`: "update only when IDE capabilities change"). It is the SOURCE of the 250 figure, cited from the SRS rather than edited.
- `documents/requirements.md` `FR-DESC-QUALITY` `**Scope:**` line and its "Commands … are EXEMPT" sentence — covered-by Solution step 6. Both become false once the length cap covers commands, so the FR must state which of its two rules is skill-only (the WHEN-trigger phrase) and which covers both kinds (the length cap).
- `README.md` §Packs — not affected — the blurbs there are written independently and hold no verbatim `description:` text (scout checked lines 249–333); step 5 only shortens, it does not remove capabilities, and step 7 re-checks by diff.
- `.claude/skills/` and `.agents/skills/` dev-only copies — not affected — `discoverSkillsDirs` scopes the framework-only checks to `framework/`, and these copies are not shipped to users, so the listing budget does not apply to them.

## Definition of Done

- [x] FR-DESC-QUALITY: `check-skills.ts` fails on a `description` longer than 250 characters and reports the offending skill, its length and the cap.
  - Test: `scripts/check-skills_test.ts::FR-DESC-QUALITY: description over DESCRIPTION_MAX_CHARS is an error`
  - Evidence: `deno test -A scripts/check-skills_test.ts`
- [x] FR-DESC-QUALITY: the cap covers commands as well as skills, unlike the WHEN-trigger gate.
  - Test: `scripts/check-skills_test.ts::FR-DESC-QUALITY: the length cap covers commands too`
  - Evidence: `deno test -A scripts/check-skills_test.ts`
- [x] FR-DESC-QUALITY: the new check is registered in the coupling/wiring regression test, and that test fails when the check is removed from `validateSkill` — it distinguishes the length error by its message, not by the criterion string, which both description checks share.
  - Test: `scripts/check-skills_test.ts` end-to-end wiring test
  - Evidence: `deno test -A scripts/check-skills_test.ts`. Removal probe run 2026-09-09 — deleting the `validateDescriptionLength` call from `validateSkill` turned the file red on exactly `regression: validateAllSkills fires every framework-only check end-to-end` (70 passed | 1 failed); the call was restored from a pre-probe copy and the file went green again (71 passed | 0 failed)
- [x] FR-DESC-QUALITY: every shipped skill and command is at or under 250 characters; the four generated targets are shortened in their atom/composite source, not in the rendered `SKILL.md`.
  - Test: the gate itself — `deno task check` skill-validation step
  - Evidence: `deno task check` green, and the scan `python3 -c` over `framework/*/{skills,commands}/*/SKILL.md` reports no entry over 250
- [x] FR-DESC-QUALITY: SRS `FR-DESC-QUALITY` states the cap, cites `documents/ides-difference.md` for the number, corrects its own `**Scope:**` and command-exemption wording, and cross-references `FR-UNIVERSAL.DISCLOSURE`; that FR records that it is now unreachable; SDS §3.4.3 lists the validation rule; `documents/index.md` reflects the widened scope.
  - Test: `deno task check` doc gates (`check-traceability.ts`, `check-salp.ts`, `check-srs-evidence.ts`)
  - Evidence: `grep -n "250 characters" documents/requirements.md documents/design.md` returns a hit in each file, and `grep -n "EXEMPT\|Scope:" documents/requirements.md | sed -n '/desc/Ip'` shows no stale skills-only claim in the FR
- [x] FR-DESC-QUALITY: `engineer-skill` no longer describes a two-cap world — its `SKILL.md` names the limits and which one binds first, and its authoring rubric item matches the enforced cap.
  - Test: manual — korchasa
  - Evidence: `grep -n "250" framework/devtools/skills/engineer-skill/SKILL.md` returns both the two-cap blockquote and the rubric checklist item
- [x] FR-DESC-QUALITY: each shortened skill keeps its three trigger scenarios green.
  - Test: `Benchmark: <skill>-trigger-pos-1`, `<skill>-trigger-adj-1`, `<skill>-trigger-false-1` for each of the 35 shortened skills
  - Evidence: full sweep `deno task acceptance-tests -f trigger-` run 2026-09-09 on the user's authorisation — 129 scenarios, 125 passed, 2 served from cache, 2 failed (`cli-trigger-adj-1`, `write-gods-tasks-trigger-adj-1`). Both were adjacent-request scenarios that the shortening had made over-trigger: `write-gods-tasks` had lost the phrase that sends variant-weighing to the planning skill, and `cli` had kept the broad "any Deno command" wording with only a short exclusion tail. Both descriptions were rewritten inside the 250-character cap and the six scenarios of the two skills re-run — all green (`cli-trigger-{pos,adj,false}-1`, `write-gods-tasks-trigger-{pos,adj,false}-1`), then `deno task check` green (795 passed | 0 failed, 187 passed | 0 failed, exit 0)

## Solution

Selected variant (user, 2026-09-09): a separate `validateDescriptionLength` validator under `FR-DESC-QUALITY`, cap 250 characters, rule documented in SDS §3.4.3. `FRONTMATTER_MAX_TOKENS` keeps its value and its code — the spec limit and the budget limit are two different reasons — but it becomes unreachable, and that is written down rather than glossed over.

1. **Constant.** Add `DESCRIPTION_MAX_CHARS = 250` to `scripts/lib/skill-limits.ts` with a rationale paragraph in the module header: the listing budget, the `documents/ides-difference.md` line the number comes from, and the note that this cap trips before `FRONTMATTER_MAX_TOKENS` can ever fire. Refresh the "Consumers" list in the same header.
2. **RED.** Add to `scripts/check-skills_test.ts`:
   - a description of 251 characters → one error, criterion `FR-DESC-QUALITY`, message naming the length and the cap;
   - a description of exactly 250 characters → no error (boundary);
   - the same over-cap description with `kind: "command"` → one error, proving commands are covered.
   Run the file and watch the three cases fail.
3. **GREEN.** Add `validateDescriptionLength(dirName, kind, frontmatter)` to `scripts/check-skills.ts`. It applies to both kinds — unlike `validateDescriptionWhenTrigger`, which stays skill-only because routing by description is a skills-only concern while the listing budget is not. Message shape: name the skill, its description length and the cap. Wire it into `validateSkill` inside the existing framework-only branch, beside the WHEN-trigger call.
4. **Wiring.** Register the new check in the end-to-end regression test in `scripts/check-skills_test.ts`. It must assert on the length message text, NOT on `criteria.has("FR-DESC-QUALITY")`: both description checks emit that same criterion, so a criterion-level assertion stays green with `validateDescriptionLength` deleted — exactly the dormant-check failure the `isFrameworkSkillsDir` bug produced once. Prove it by deleting the call, running the file, and confirming the wiring test goes red.
5. **Shorten the 36 over-cap descriptions.**
   - 32 hand-written `SKILL.md` files, edited in place.
   - 4 generated targets — `core/skills/plan` (384), `core/skills/review` (383), `core/skills/implement` (306) in `framework/atoms/{plan,review,implement}.md`, and `core/commands/ship-task` (258) in `framework/composites/ship-task.md` — then `deno run -A scripts/generate-skill-composites.ts --write`.
   Each shortened description keeps a WHEN-trigger phrase from `WHEN_TRIGGER_PHRASES` (otherwise the existing gate fails) and keeps every distinct trigger topic it names — cutting is for redundancy and enumeration tails, not for capabilities.
6. **Documents.**
   - SRS `FR-DESC-QUALITY`: add the cap and its rationale, cite `documents/ides-difference.md` for the 250 figure, split the `**Scope:**` line and the "Commands … are EXEMPT" sentence so each states which of the two rules it describes, and extend `**Acceptance:**` with the new tests.
   - SRS `FR-UNIVERSAL.DISCLOSURE`: one sentence pointing back, stating that the budget cap is stricter and that this limit can no longer fire on its own.
   - SDS §3.4.3: extend the `FR-DESC-QUALITY` paragraph with the length rule.
   - `documents/index.md`: widen the one-line `FR-DESC-QUALITY` summary beyond "WHEN-trigger phrase".
   - `framework/devtools/skills/engineer-skill/SKILL.md`: line 305's two-cap blockquote gains the enforced 250-character cap and says it binds first; line 312's rubric item moves from "≲ 75 tokens (~300 chars)" to the enforced number. `validate_skill.ts` itself keeps its 1024-character portable floor and gains no repo-specific number.
7. **Verify.** `deno task check` green; the measuring scan reports no entry over 250; `README.md` §Packs diffed against the shortened descriptions for a capability that disappeared.
8. **Stop at the commit.** Commit locally and stop. No push and no release this session (user decision, 2026-09-09) — the trigger sweep runs first.

## Follow-ups

- The trigger sweep ran on 2026-09-09 after the user authorised it; the two regressions it found are recorded in the last DoD item. Nothing is pushed or released — the user's decision for this session, so the shortened descriptions reach no user until a later push.
- A per-pack listing budget gate (variant C, considered and not chosen on 2026-09-09) stays unbuilt, and the per-entry cap does not substitute for it. Measured after the cap: `core` + `engineering` still comes to ≈2 191 est. tokens against a ≈2 000-token budget, and all packs together to ≈3 250. If truncation is observed in practice, that gate is the next step.
- `FRONTMATTER_MAX_TOKENS = 100` is left in place but can no longer fire (max ≈70 est. tokens under the new cap). Either retire it or re-derive it the next time the budget cap moves.
- The 2026-09-01 entry count of 63 in the Context section does not reproduce (53 today). Not investigated; the current numbers are re-measured and labelled.
