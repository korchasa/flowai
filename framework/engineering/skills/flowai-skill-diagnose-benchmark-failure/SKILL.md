---
name: flowai-skill-diagnose-benchmark-failure
description: Use when a flowai benchmark fails and you need the cause from run artifacts before editing. Reads judge-evidence.md, the sandbox SKILL.md, and scenario mod.ts; classifies the failure against a known taxonomy; produces an evidence-grounded report (no fixes). Do NOT trigger for passing benchmarks or generic skill iteration.
argument-hint: scenario-id (e.g. flowai-skill-plan-interactive)
effort: medium
---

# Diagnose Benchmark Failure

## Why this skill exists

When a benchmark fails, the natural reflex is to edit the SKILL.md and re-run.
That is guessing. The run artifacts (`judge-evidence.md`, sandbox SKILL.md, the
scenario `mod.ts`) contain the actual chain of cause and effect: what the agent
saw, what it emitted, what the judge measured. This skill enforces an
evidence-first diagnosis so each iteration moves on facts, not hopes.

## Rules

<rules>
1. **Evidence before hypothesis**: you MUST read `judge-evidence.md`, the sandbox
   `SKILL.md`, and the scenario `mod.ts` BEFORE you state any cause or propose
   any fix. If you propose a cause without quoting from these files, the
   diagnosis is invalid.
2. **No fixes**: this skill produces a *report*. It MUST NOT edit any
   `SKILL.md`, `mod.ts`, or other source file. Edits happen in the next
   step, owned by whoever called this skill.
3. **Quote, don't paraphrase**: every claim in the report must cite a quoted
   line (or line-range) from one of the three evidence sources, plus the
   file path.
4. **Fail closed**: if any required artifact is missing (no run dir, no
   `judge-evidence.md`), STOP and report the gap; do not proceed with partial
   data.
</rules>

## Inputs

- A scenario ID (e.g. `flowai-skill-plan-interactive`). Inferred from the user
  prompt or from the most recent failure in the bench output.

## Step-by-step

<step_by_step>

1. **Locate the run dir**
   - Default path: `benchmarks/runs/latest/<scenario-id>/run-1/`.
   - If `latest` is missing, list `benchmarks/runs/` and pick the most
     recently modified directory containing `<scenario-id>`.
   - Required files inside: `judge-evidence.md`, `sandbox/`. If either is
     missing → fail closed (rule 4).

2. **Read `judge-evidence.md` end to end**
   - Identify the three sections: `<user_query>`, `<agent_logs>`, `<file_diffs>`.
   - From `<agent_logs>`, extract the **last assistant turn** that the user
     would have seen. This is the agent's actual emitted output.
   - From `<user_query>`, copy the verbatim query the agent received.
   - Note any tool calls the agent made (`## Tool: <name>`) — especially
     `Skill`, `Read`, `Bash`, `TodoWrite`. The presence/absence of specific
     tool calls is itself evidence.

3. **Read the scenario `mod.ts`**
   - Path: `framework/<pack>/{skills,commands,agents}/<primitive>/benchmarks/<scenario>/mod.ts`.
     Find via `find framework -path "*/benchmarks/<scenario>/mod.ts"`.
   - Extract: `userQuery`, `userPersona`, `checklist[]` (with `id`,
     `description`, `critical`).
   - Also extract: `interactive`, any `setup()` body, `agentsTemplateVars`.

4. **Read the sandbox `SKILL.md` — BOTH copies, side by side**

   There are two different `SKILL.md` files for the same primitive, in two
   different locations. You MUST read both and compare them. Confusing them
   leads to the wrong classification.

   - **(a) The failing-agent's view** (inside the run dir):
     `<run-dir>/sandbox/.claude/skills/<primitive>/SKILL.md`
     (Cursor sandbox uses `.cursor/skills/`; OpenCode uses `.opencode/skills/`.)
     This is the static snapshot the failing agent read. Read this first.

   - **(b) The current framework source**:
     `framework/<pack>/{skills,commands}/<primitive>/SKILL.md`
     This is the live source on disk now — it may differ from (a).

   Do NOT read `.claude/skills/<primitive>/SKILL.md` at the project root and
   call that "the sandbox copy" — it is the current source, identical (or
   nearly so) to (b), and tells you nothing about what the failing agent saw.

   After reading both, diff (a) vs (b):
   - Identical → the failure cannot be a stale-skill issue; eliminate
     STALE-SKILL-IN-SANDBOX from candidates.
   - Significantly different → potential STALE-SKILL-IN-SANDBOX; verify by
     correlating the diff with the failure mode.

   The classification depends on what (a) said vs. what the agent actually
   emitted in `<agent_logs>` — not on what (b) currently says.

5. **Re-derive the verdict**
   - The judge verdict (which checklist items failed and why) is in the
     bench stdout, not in `judge-evidence.md`. If you don't have it, re-run
     the scenario with `--no-cache` and capture stdout. Otherwise, check
     each `checklist[].description` against the agent's last turn from
     step 2 and judge yourself before continuing — this catches LLM-judge
     calibration drift.

6. **Match symptoms to the failure-mode taxonomy** (next section). Pick the
   most likely mode based on the quoted evidence. If two modes fit equally,
   list both; do not collapse them.

7. **Write the diagnostic report** (template below). Every claim cites a
   quoted line from step 2/3/4.

</step_by_step>

## Failure-mode taxonomy

A symptom-to-cause map. Use the *symptom* column to match what you observed in
`judge-evidence.md`; the *cause* column gives the most likely root cause; the
*fix-direction* column points the next iteration at a real lever, not a
guess. **Do not invent new modes** unless the evidence rules out every one
listed.

- **MD-PRIOR-BULLETS** (markdown-prior-wins-over-instruction)
  - Symptom: SKILL.md says options must be numbered (`1.`, `2.`, …); agent
    emits bulleted dashes (`- **X** —`) for option lists with rich
    descriptions.
  - Cause: model's training prior on bulleted-options-with-descriptions
    overrides plain-prose MUST instructions in SKILL.md context.
  - Fix-direction: scope the SRS clause down to what is enforceable through
    SKILL.md alone, OR add a runtime mechanism (helper script the agent
    invokes, post-process hook). Adding more imperative prose has been
    empirically rejected for this mode.

- **HEADING-INSTEAD-OF-ITEM**
  - Symptom: SKILL.md says the question must be a numbered list item; agent
    emits `### Variant A`, `### Variant B`, or `**1. Title**` (bold heading).
  - Cause: instruction was read but not internalised at format time;
    agent reverts to its default for "labelled chunks of related content".
  - Fix-direction: add an explicit anti-pattern example in SKILL.md showing
    `### Variant A` is wrong; demonstrate the correct shape with the EXACT
    surface form expected.

- **STALE-SKILL-IN-SANDBOX**
  - Symptom: agent's behaviour matches an older version of SKILL.md; the
    sandbox copy diffs against the source.
  - Cause: bench cache hit on a scenario whose primitive was edited after
    the cached run. Or `--no-cache` was forgotten on a quick re-run.
  - Fix-direction: re-run with `--no-cache`. If the issue persists, check
    `scripts/benchmarks/lib/cache.ts` cache-key inputs vs. what changed.

- **SKILL-NOT-MOUNTED**
  - Symptom: `Agent finished with exit code 0` but `0 agent steps`, or judge
    reports "Unknown skill" / agent never invokes the skill.
  - Cause: bench infrastructure didn't copy the primitive into the sandbox
    `.claude/skills/<name>/` (most common: missing pack in `Copying packs`
    line; check `scenario.skill` matches an existing primitive).
  - Fix-direction: fix the bench runner / scenario `skill:` field, NOT the
    SKILL.md.

- **COMPOSITE-DELEGATION-BYPASS**
  - Symptom: composite skill (e.g. `flowai-review-and-commit`) was invoked,
    but `<agent_logs>` shows an early `## Tool: Skill { skill: "<source-skill>" }`
    re-entering one of the inlined sources, bypassing the composite's gate.
  - Cause: the composite's frontmatter description names the source skills,
    or the body lacks a "no-delegation" rule. See [framework CLAUDE.md
    "Composite Skill Authoring"](../../CLAUDE.md).
  - Fix-direction: rename the description (no source-skill names), add the
    no-delegation rule, harden the verdict gate.

- **PERSONA-MISMATCH**
  - Symptom: agent asks one question; the simulated user persona answers
    something the agent did not ask. The trace shows `[USER INPUT] <reply>`
    that doesn't fit.
  - Cause: persona scripted for an older skill version, or for a different
    question structure.
  - Fix-direction: align the persona with the current SKILL.md flow — but
    ONLY after confirming the skill itself is correct. Persona changes that
    smuggle in the right answer ("test-fitting") are forbidden.

- **TEST-FITTING-PERSONA**
  - Symptom: persona contains the literal target output (e.g. dictates the
    exact format). The benchmark passes only because the persona scripts the
    answer.
  - Cause: scenario author worked backwards from a green run.
  - Fix-direction: rewrite the persona to be neutral. The scenario's
    benchmark value is now suspect — review the checklist items too.

- **CROSS-PACK-REFERENCE-MISSING**
  - Symptom: SKILL.md text references another skill by name, but that skill
    is not in the sandbox. Agent reads the reference, can't act on it.
  - Cause: the source skill is in a different pack and the scenario doesn't
    copy that pack (look at the `Copying packs:` line in bench stdout).
  - Fix-direction: drop the cross-pack reference, OR add the pack to the
    scenario's copied packs (rare; usually drop the reference).

## Output template

Produce exactly this structure. Every bullet ends with a `(<file>:<line-range>)`
citation.

```
# Diagnostic Report: <scenario-id>

## Run inspected
- Run dir: <path>
- Verdict line: "<paste>"
- Failed checklist items (id + critical?): <list>

## Evidence collected (paths)
- judge-evidence.md — <bytes>, <line count>
- sandbox SKILL.md — <path>, <bytes>
- scenario mod.ts — <path>

## Agent's last assistant turn (verbatim, ≤30 lines)
```
<paste>
```
(judge-evidence.md:<L1>-<L2>)

## What the SKILL.md actually said about this point (verbatim, ≤15 lines)
```
<paste>
```
(<sandbox path>:<L1>-<L2>)

## Diff sandbox SKILL.md vs source SKILL.md
- <"identical" or summary of significant diffs with line refs>

## Failure-mode classification
- Primary: <TAXONOMY-CODE>
- Why this code: <one-sentence reason citing two of the three evidence sources>
- Alternatives ruled out: <code(s) considered + the evidence that rules them out>

## Proposed next iteration
- <one-sentence fix-direction action, drawn from the taxonomy fix-direction column>
- Files to edit: <paths>
- Anti-actions (do NOT try): <bullets, each with the prior failure that disqualified it if applicable>

## Confidence
- <High|Medium|Low> — <one-sentence reason>
```
