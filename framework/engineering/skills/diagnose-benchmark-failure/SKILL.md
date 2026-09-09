---
name: diagnose-benchmark-failure
description: Use when a flowai benchmark fails and you need the cause from run artifacts before editing. Reads judge-evidence.md, the raw agent transcript, the sandbox SKILL.md, and scenario mod.ts; classifies the failure against a known taxonomy; produces an evidence-grounded report (no fixes). Do NOT trigger for passing benchmarks or generic skill iteration.
argument-hint: scenario-id (e.g. plan-interactive)
effort: medium
---

# Diagnose Benchmark Failure

## Why this skill exists

When a benchmark fails, the natural reflex is to edit the SKILL.md and re-run.
That is guessing. The run artifacts (`judge-evidence.md`, the raw agent
transcript, sandbox SKILL.md, the scenario `mod.ts`) contain the actual chain
of cause and effect: what the agent saw, what it did, what it emitted, what the
judge measured. This skill enforces an evidence-first diagnosis so each
iteration moves on facts, not hopes.

## Rules

<rules>
1. **Evidence before hypothesis**: you MUST read `judge-evidence.md`, the raw
   agent transcript (the `.jsonl` the sandboxed CLI wrote for itself), the
   sandbox `SKILL.md`, and the scenario `mod.ts` BEFORE you state any cause or
   propose any fix. If you propose a cause without quoting from these files,
   the diagnosis is invalid.
2. **No fixes**: this skill produces a *report*. It MUST NOT edit any
   `SKILL.md`, `mod.ts`, or other source file. Edits happen in the next
   step, owned by whoever called this skill.
3. **Quote, don't paraphrase**: every claim in the report must cite a quoted
   line (or line-range) from one of the four evidence sources, plus the
   file path. A transcript citation is a quoted `.jsonl` line or a tool-call
   count produced by the command in step 3.
4. **Fail closed**: if any required artifact is missing (no run dir, no
   `judge-evidence.md`, no transcript under `bench-home/`), STOP and report
   the gap — for the transcript, name both paths you searched; do not proceed
   with partial data.
5. **The transcript beats the judge's rendering**: `judge-evidence.md` is the
   judge's summary of the session; the `.jsonl` is the ground truth. Where the
   two disagree, the transcript wins. A claim the failing agent made about its
   own environment ("no subagent tool here", "parallel execution is
   unavailable", "the file does not exist") is a hypothesis to test against
   the tool-call histogram, never a finding: a tool the transcript shows
   invoked was available, whatever the agent said afterwards. "Cannot" and
   "did not" are different failures with different fixes.
</rules>

## Inputs

- A scenario ID (e.g. `plan-interactive`). Inferred from the user
  prompt or from the most recent failure in the bench output.

## Step-by-step

<step_by_step>

1. **Locate the run dir**
   - Default path: `acceptance-tests/runs/latest/<scenario-id>/run-1/`.
   - If `latest` is missing, list `acceptance-tests/runs/` and pick the most
     recently modified directory containing `<scenario-id>`.
   - Required inside: `judge-evidence.md`, `sandbox/`, `bench-home/`. If any
     is missing → fail closed (rule 4).

2. **Read `judge-evidence.md` end to end**
   - Identify the three sections: `<user_query>`, `<agent_logs>`, `<file_diffs>`.
   - From `<agent_logs>`, extract the **last assistant turn** that the user
     would have seen. This is the agent's actual emitted output.
   - From `<user_query>`, copy the verbatim query the agent received.
   - Note any tool calls the rendering shows (`## Tool: <name>`) — especially
     `Skill`, `Read`, `Bash`, `TodoWrite`. Treat this list as provisional:
     the rendering can omit calls, and step 3 replaces it with the count from
     the transcript.

3. **Read the raw agent transcript**
   - It sits under `<run-dir>/bench-home/`, in the layout of the IDE the run
     used:
     - codex: `bench-home/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-<ts>-<uuid>.jsonl`
       (the judge's own rollouts sit apart under `bench-home/.codex-judge/`;
       do not read those).
     - claude: `bench-home/.claude/projects/<slug>/<uuid>.jsonl`.
     Find it via `find <run-dir>/bench-home -name '*.jsonl' -not -path '*judge*'`.
     Missing on both paths → fail closed (rule 4), naming both paths.
   - Print the tool-call histogram BEFORE forming any hypothesis:
     - codex: `jq -r 'select(.type=="response_item") | .payload | select(.type=="function_call" or .type=="custom_tool_call") | .name' <file> | sort | uniq -c | sort -rn`
       (arguments are in `.payload.arguments` / `.payload.input`; the agent's
       own text is in `response_item` lines of type `message` with role
       `assistant`, its reasoning in lines of type `reasoning`).
     - claude: `jq -r 'select(.message.content|type=="array") | .message.content[] | select(.type=="tool_use") | .name' <file> | sort | uniq -c | sort -rn`
       (the agent's own text and thinking are `assistant` lines whose content
       blocks are of type `text` / `thinking`).
   - Copy the histogram into the report verbatim. Then locate the decisive
     call — the invocation, or the absence of one, that the failing checklist
     item is about — and quote the agent's own text or reasoning around it:
     that is where the agent explains its choice to itself, and that is what
     the judge's rendering never shows.
   - Cross-check every capability claim in `<agent_logs>` against the
     histogram (rule 5). Record each as "claimed X; transcript shows Y".

4. **Read the scenario `mod.ts`**
   - Path: `framework/<pack>/{skills,commands,agents}/<primitive>/acceptance-tests/<scenario>/mod.ts`.
     Find via `find framework -path "*/acceptance-tests/<scenario>/mod.ts"`.
   - Extract: `userQuery`, `userPersona`, `checklist[]` (with `id`,
     `description`, `critical`).
   - Also extract: `interactive`, any `setup()` body, `agentsTemplateVars`.

5. **Read the sandbox `SKILL.md` — BOTH copies, side by side**

   There are two different `SKILL.md` files for the same primitive, in two
   different locations. You MUST read both and compare them. Confusing them
   leads to the wrong classification.

   - **(a) The failing-agent's view** (inside the run dir):
     `<run-dir>/sandbox/.claude/skills/<primitive>/SKILL.md`
     (codex sandbox uses `.codex/skills/`; Cursor `.cursor/skills/`; OpenCode
     `.opencode/skills/`.)
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

6. **Re-derive the verdict**
   - The judge verdict (which checklist items failed and why) is in the
     bench stdout, not in `judge-evidence.md`. If you don't have it, re-run
     the scenario with `--no-cache` and capture stdout. Otherwise, check
     each `checklist[].description` against the agent's last turn from
     step 2 and judge yourself before continuing — this catches LLM-judge
     calibration drift.

7. **Match symptoms to the failure-mode taxonomy** (next section). Pick the
   most likely mode based on the quoted evidence. If two modes fit equally,
   list both; do not collapse them.

8. **Decide whether an interview is the next evidence step**
   - The transcript shows what the agent DID; only the agent can say which
     words it justified the act with, and those are the words a fix would
     edit. So when the fix-direction you are about to propose is a change to
     the primitive's wording (a sentence to add, tighten, or remove in
     `SKILL.md` / the agent file), the report MUST name resuming the failed
     session and asking it why as the next evidence step, before any edit —
     and give the command for the run's IDE:
     - codex: `cd "$(readlink <run-dir>/sandbox)" && CODEX_HOME="$(readlink <run-dir>/bench-home)/.codex" codex exec resume <uuid> "<question>"`
       (`<uuid>` is the tail of the rollout filename; open the question with
       "Do not invoke any skill; answer from memory").
     - claude: `cd "$(readlink <run-dir>/sandbox)" && HOME="$(readlink <run-dir>/bench-home)" claude -p --resume <uuid> "<question>"`
       (`<uuid>` is the `.jsonl` filename without its extension; source the
       project's `.env` first).
     `readlink` is for the runner's symlinked run dirs; on a plain directory
     use the path itself. The sandbox outlives the run, so the session can be
     resumed in place.
   - Draft the question neutrally: describe the situation without accusing;
     ask what made the chosen path better than the alternative, which phrase
     in the rule left room for it, and what the rule would have had to say.
     Say it is to be asked of EVERY failed run of the scenario — agreement
     across runs is what separates a defect in the text from one agent's
     rationalisation.
   - When the fix-direction is not a wording change (a runner defect, a stale
     sandbox, a missing pack), say so and skip the interview.

9. **Write the diagnostic report** (template below). Every claim cites a
   quoted line from step 2/3/4/5.

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
    `scripts/acceptance-tests/lib/cache.ts` cache-key inputs vs. what changed.

- **SKILL-NOT-MOUNTED**
  - Symptom: `Agent finished with exit code 0` but `0 agent steps`, or judge
    reports "Unknown skill" / agent never invokes the skill.
  - Cause: bench infrastructure didn't copy the primitive into the sandbox
    `.claude/skills/<name>/` (most common: missing pack in `Copying packs`
    line; check `scenario.skill` matches an existing primitive).
  - Fix-direction: fix the bench runner / scenario `skill:` field, NOT the
    SKILL.md.

- **COMPOSITE-DELEGATION-BYPASS**
  - Symptom: composite skill (e.g. `review-and-commit`) was invoked,
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

- **CAPABILITY-CLAIMED-UNAVAILABLE**
  - Symptom: the agent's own prose in `<agent_logs>` says a tool or capability
    was missing ("no subagent tool", "parallel execution unavailable") and the
    work was done another way; the transcript histogram shows that tool
    invoked (or installed under the sandbox) in the same session.
  - Cause: the agent abandoned the approach — a worker's partial output looked
    slower to reconcile than redoing it, or the first call returned something
    awkward — and explained the retreat as an environment limit, licensed by a
    clause in the primitive such as "if X is unavailable, proceed with Y".
  - Fix-direction: interview the failed runs first (step 8); then close the
    clause that licensed the fallback so "unavailable" means "the tool is not
    in the tool list", not "the first attempt was inconvenient". Do NOT fix
    the harness: the capability was there.

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
- raw transcript — <path>; tool-call histogram:
  <paste the histogram verbatim>
- sandbox SKILL.md — <path>, <bytes>
- scenario mod.ts — <path>

## Judge's rendering vs transcript
- <each capability or "I did X" claim from <agent_logs>: "claimed …; transcript shows …" with the decisive line quoted> (<transcript path>:<line>)

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
- Why this code: <one-sentence reason citing two of the four evidence sources, the transcript among them when a capability claim is involved>
- Alternatives ruled out: <code(s) considered + the evidence that rules them out>

## Proposed next iteration
- <one-sentence fix-direction action, drawn from the taxonomy fix-direction column>
- Files to edit: <paths>
- Interview: <"required — wording change" + the resume command with this run's uuid + the question, to be asked of every failed run | "not needed — <reason>">
- Anti-actions (do NOT try): <bullets, each with the prior failure that disqualified it if applicable>

## Confidence
- <High|Medium|Low> — <one-sentence reason>
```
