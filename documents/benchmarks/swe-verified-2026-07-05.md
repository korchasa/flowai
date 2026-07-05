# SWE-bench Verified A/B — loop5: surface-scout + plan-critic (2026-07-05)

Supersedes `swe-verified-2026-07-04.md` as the latest observation. Purpose:
mechanism observation of the loop5 plan-atom change (`surface-scout` +
`plan-critic` shipped agents, commits `6193f398`/`29bde577`) on the full
12-instance pool. Per the loop's corrected semantics the aggregate count is
context, never the verdict.

## Pipeline delta vs the judgegate run (2026-07-04)

- `plan` atom: Step 2 dispatches the pre-declared read-only `surface-scout`
  agent with the VERBATIM issue text; Step 3 persists its raw output verbatim +
  plain-bullet dispositions in `### Affected Surface`; Step 6 dispatches
  `plan-critic` (fresh context, recomputes the diff) on multi-variant plans;
  visible degradation lines when subagents are missing. 3 critic-gate rounds,
  hard stop, user-approved minimal fix — full audit in
  `scripts/benchmark/runs/2026-07-04-loop5/_decision-log.md`.
- Harness: judged gate unchanged; agent sandboxes now live OUTSIDE `$HOME`
  (`sandbox_root.ts`, contamination fix) — **confirmed live**: the bench agent
  narrates in English (previous runs inherited the developer's personal
  Russian-language rule via ancestor memory files).
- Acceptance evidence for the change itself: 4 new/extended scenarios RED on
  the old atom → GREEN on the new one; full plan sweep 25/25; `deno task check`
  18/18.

## Verdicts (run-id `loop5`, single rep)

Resolved 0/12 (`13513` empty patch — stale-issue class, judge-challenged and
evidence-gated as designed). Trajectory on identical pools: 0 / 2 / 1 (noise
floor) → 1 (judgegate) → 0 (loop5). All values inside the measured ±2 noise
floor; the known coins (`14792`, `13195`) flipped again. No aggregate claim.

F2P highlights: `16256` 6/9, `13195` 2/5, `11820`/`16667`/`7462` 1/2,
`4551` 0/10 (all failures in writer-level dot-file tests), `7748` 0/2.

## Mechanism observations

1. **The scout mechanism works end-to-end where it fires.** Dispatched in 7 of
   12 instances; trace shows `subagent_type: "surface-scout"` with the verbatim
   `--- ISSUE ---` block and no fix-site leak; task files carry `### Affected
   Surface` with the verbatim scout block and dispositions.
2. **The blind spot became a recorded decision.** sphinx-7462: the scout FOUND
   the sister `sphinx/pycode/ast.py`; the planner inspected it and recorded
   `not affected — uses join() pattern, handles empty gracefully` (true for the
   reported crash). pylint-4551: the scout FOUND the rendering layer
   (`diagrams.py get_attrs`, DOT/VCG writers); the planner recorded it as
   pass-through. In both cases the previously-invisible parallel surface is now
   an explicit, evidence-cited decision in the committed plan — the exact
   artifact a human reviewer (or the gate judge) can veto.
3. **New, narrower failure shape: wrong dependency judgment, not blindness.**
   4551 still patches `inspector.py` only and still scores F2P 0/10 — but the
   miss moved from "never looked at the writer layer" to "looked, recorded
   'pass-through', judged wrong" (the hidden tests require rendering-layer
   changes). Fixing a wrong recorded judgment is review/human-gate territory,
   not enumeration.
4. **Behavioral skip persists at ~40%.** 5 of 12 instances (`16597`, `13195`,
   `16256`, `14792`, `7748`) never dispatched the scout despite definite
   outcome sets — the same context-pressure class that motivated the structural
   step. The structural step raised the firing rate from 0% to 58%, not to
   100%. `7748` (both-mixins anchor) was among the skips.
5. **Gold-arbitrary boundary re-confirmed** (16667 class): for 7462 the gold
   demands a rendering behavior in the sister file that the issue text never
   states; an honest "not affected by the reported defect" disposition cannot
   recover it.
6. Patch hygiene: 4551's diff carries a stray generated `classes.dot` — bench
   noise worth a future lint (test-run artifact left in the tree).

## Loop termination

Per the improve-primitive loop's own rule (b): the resolved count failed to
improve for 2 consecutive iterations (judgegate 1 → loop5 0, both inside the
0–2 noise floor). The loop STOPS here and hands back to the human. What the
loop delivered despite the flat count: an honest measuring device (judged gate,
clean sandboxes, test-hunk stripping), two shipped agents converting silent
omissions into auditable artifacts, and three precisely-named residual failure
classes — behavioral skip (~40%), wrong dependency judgment at a found surface,
and gold-arbitrary hidden requirements (unrecoverable by design).

## Caveats

- Single rep; stochastic judged gate; coins excluded from efficacy readings.
- Trained-on-test declared: the loop5 change was derived from 4551/7462/11820;
  its acceptance scenarios are green by construction — the bench evidence above
  is the first unseen-ish sample and shows mechanism, not resolution, movement.
- Python-only hard pool; emulated (LLM-judged) human gate; same-harness A/B.

## Correction (2026-07-05, supersedes the "stale issue" classification)

Prior reports (07-04 and above) classified `django-13513` as "stale issue —
required outcome unrecoverable from the issue text; no-work is correct". A
re-check against the dataset shows this is only half true:

- TRUE: the quoted symptom is already fixed at the base commit —
  `explicit_or_implicit_cause` handles `__suppress_context__`, and all three
  behaviors the issue names pass (its `test_suppressed_context` is not in
  FAIL_TO_PASS).
- FALSE: "nothing to do". The hidden F2P
  (`test_innermost_exception_without_traceback`) fails at base, as SWE-bench
  guarantees: the SAME function family carries an adjacent residual defect —
  frame collection loses/misattributes frames when an exception in the chain
  has no own traceback. The gold patch restructures the chain walk
  (`get_exception_traceback_frames` generator) to fix it.

Reclassification: NOT "unrecoverable by design" but a **fix-completeness
audit miss**: when the named defect turns out to be already fixed at HEAD, that
is a signal the report was written against an older version — the correct
discipline is to audit the landed fix's completeness on adjacent variants of
the issue's scenario (the gate judge pushed in this direction; the agent
verified only the three stated behaviors and stopped). Candidate failure-class
for a future loop; recorded here so the "gold-arbitrary" boundary class is not
over-claimed.
