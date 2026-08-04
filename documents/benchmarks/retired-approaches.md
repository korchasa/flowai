# Retired benchmark approaches

Every measurement design this project tried and dropped, with what it bought,
what it cost, and the observation that ended it. Kept so a future session does
not re-derive a dead end. The live design is FR-BENCH-SWE (+ `.POOL2`, `.IDE`,
`.SYMMETRY`, `.CELLS`) in the SRS; the live pool is
`scripts/benchmark/pools/codex-terra-medium.json`.

Ordered oldest first. "Retired" = no longer run; some artefacts stay as
provenance, noted per entry.

---

## 1. Published-submission proxy pool (pre-2026-07-05)

**Description.** Pool selected from a third-party SWE-bench leaderboard
submission: `tools_claude-4-sonnet FAILED ∩ tools_claude-4-opus SOLVED`. The
published submission stood in for our own baseline, so no baseline had to be
measured.

- **Pros:** zero measurement cost; instant pool; labels look authoritative.
- **Cons:** the labels describe a different agent (SWE-agent-style loop), not
  ours; no per-instance evidence we could inspect.
- **Retired because:** model capability is **scaffold-dependent**. Our own
  single-turn Claude Code + Sonnet solved 8 of 20 instances labelled
  "sonnet-fails", so the label did not predict our arm at all. Replaced by a
  baseline measured on our own scaffold.

## 2. `sonnet-fails ∩ opus-fails` pool

**Description.** Interim pool of instances nobody solved, on the theory that
the hardest tasks show the largest process effect.

- **Pros:** trivially selectable; no ceiling probe needed.
- **Cons:** none of the instances had a demonstrated solution path.
- **Retired because:** zero headroom by construction — both arms score near 0,
  and the A/B floors out in 0–2 noise. A pool needs both a floor (baseline does
  not already solve it) and a ceiling (someone does).

## 3. Measured-headroom pool on SWE-bench Verified (`pool.json`, 2026-07-05 … 07-11)

**Description.** First honest design. Measure our OWN scaffold (pure Claude Code
+ Sonnet, single autonomous turn, 3 reps) over 53 candidates; keep instances
where Sonnet is not already reliable (0–1 of 3) AND someone solves them (Sonnet
≥1 rep or our Opus). Froze at 13 keepers, later 12. Data of record:
`measured_baseline.json`, `measured_headroom.json`, `candidates.json`,
`sonnet_baseline.json`.

- **Pros:** every keeper carries per-instance measured evidence; the keep-rule
  is mechanical and testable; 3 reps turn resolution into a frequency instead of
  a coin flip; the same-harness A/B isolates flowai rather than the scaffold.
- **Cons:** expensive (53 instances × 3 Sonnet reps + tiered Opus); Python-only;
  arm64-buildable subset; "flaky 1/3" keepers carry variance by construction.
- **Retired because:** **training-data contamination.** SWE-bench Verified's
  newest task is 2023-08, well inside every candidate model's training window,
  so a solve cannot be separated from recall. Replaced by SWE-rebench with a
  vintage rule (`created_at` strictly after the pinned model's training cutoff).

**Result it produced (flowai3, 2026-07-11, the only flowai A/B ever run on
Claude/Sonnet):** baseline 11/39 resolved-reps → flowai 16/39; excluding one
infra-noise instance, 10/36 → 16/36 with one real regression. Failure clusters:
plan 7, implement 3, review interceptions **0**. That last number — self-review
never intercepting its own patch — is the finding worth carrying forward; it has
reappeared in every campaign since.

## 4. Single-turn baseline with a "never stop to ask" line

**Description.** The baseline arm got one autonomous turn and an instruction not
to stop for questions, while the flowai arm had a human emulator answering
across turns.

- **Pros:** cheap; matches how a bare agent is usually benchmarked.
- **Cons:** asymmetric human availability — the two arms were not the same
  experiment.
- **Retired because:** superseded 2026-07-22 by FR-BENCH-SWE.SYMMETRY: the same
  emulator now answers both arms and `maxSteps` is equal. Any measured gap that
  came from "one arm could ask and the other could not" was harness, not flowai.

## 5. Rubber-stamp human emulator

**Description.** The emulated human replied to every plan with an unconditional
"Go ahead with your recommended variant".

- **Pros:** deterministic; removes a stochastic turn from the measurement.
- **Cons:** authorizes any plan, including a narrowed or wrong one.
- **Retired because:** it made **every plan-quality effect invisible** — a bad
  plan and a good plan received identical approval (loop4 STOP-ANALYSIS,
  2026-07-04). Replaced by an LLM emulator that reads only the issue and the
  engineer's latest message, authorizes exactly one variant, and challenges
  evidence-free conclusions. Cost accepted: the gate turn became stochastic, and
  every report must say so.

## 6. Stock princeton swebench harness for SWE-rebench rows

**Description.** Grade pool2 with the official `swebench.harness.run_evaluation`
already used for SWE-bench Verified.

- **Pros:** one grading path for both pools; the harness is the field standard.
- **Cons:** none, where it works.
- **Retired because:** it has no per-repo specs for SWE-rebench's repositories
  and cannot grade them at all. Grading moved to SWE-rebench's own swebench fork
  (Release 4.0.3 base, reads `install_config` per row) pinned in `.venv-rebench`,
  with prebuilt amd64 images under Rosetta. Grading is still never
  reimplemented in TypeScript.

## 7. Opus ceiling probe on pool2

**Description.** For every instance our Sonnet failed 0/3, run one Opus pass to
decide whether a ceiling exists.

- **Pros:** the cheapest possible ceiling test; ~75% fewer Opus runs than a full
  sweep.
- **Cons:** single-rep, therefore itself stochastic.
- **Retired because:** it returned **0 of 26**. Opus produced a real patch for
  every Sonnet-0/3 instance and none passed F2P; all 26 finished within the turn
  budget, so the scaffold was not the bottleneck. A probe that never fires
  carries no information — the finding is that on fresh SWE-rebench tasks the
  scaffold is bimodal (Sonnet solves reliably, or nobody solves), which is also
  why pool2 froze at 8 keepers instead of the intended 20.

## 8. Claude/Sonnet as the subject IDE on pool2

**Description.** Continue the A/B on Claude Code, the IDE the harness was built
around.

- **Pros:** the harness's best-tested path; agent-side cost counters
  (FR-BENCH-SWE.COST) and the web-access audit (FR-BENCH-SWE.WEBAUDIT) both work,
  since they read Claude transcripts.
- **Cons:** a positive result cannot be distinguished from "flowai helps Claude
  specifically"; the 8-keeper band was too thin for a three-rep campaign.
- **Retired because:** measuring a second IDE was worth more than a fourth
  Claude campaign (FR-BENCH-SWE.IDE). The Claude baseline over 67 instances ×
  3 reps stays as the cell `claude-baseline-none-sonnet-high` — it is the
  evidence the pool2 freeze was derived from, and must not be re-run.
  Known consequence: codex campaigns run over a **Sonnet-selected** pool, so
  they are mechanism finders, never a recalibrated pool. Every codex report says
  so.

## 9. codex/sol-high as the subject arm

**Description.** Run the bare arm on the strongest available codex model.

- **Pros:** establishes the model ceiling on the codex side; on
  `pygraphistry-1277` it produced the only clean solve any arm has managed,
  by narrowing the admission gate instead of widening it.
- **Cons:** slow and expensive per session; the campaign was never completed
  (17 instances, 2 reps, 5 rows still pending).
- **Retired because:** repurposed from subject to **ceiling**. The subject arm
  moved to `terra` at medium effort, where a three-rep campaign is affordable
  and the headroom band is wide enough to see a flowai effect. The partial sol
  data survives as `codex-baseline-none-gpt-5-6-sol-high` and is read as a
  ceiling reference, not as a comparison arm.

## 10. Pre-cell run layout

**Description.** Results lived as merged `*.jsonl` + `*.graded.jsonl` files
inside a per-campaign run directory, with the campaign's identity carried by the
directory name.

- **Pros:** direct output of the driver; nothing to maintain.
- **Cons:** identity lived in a filename, so two campaigns differing in model,
  effort, session budget, or prompt wording could silently blend into one
  number; a re-run overwrote history instead of extending it.
- **Retired because:** superseded by FR-BENCH-SWE.CELLS — one append-only
  `tasks.jsonl` per cell, keyed on `(ide, arm + framework fingerprint, model,
  effort, session budget, prompt hash)`, last-row-wins per `(rep, instance)`.
  `cells_import.ts` is the one-way migration path and refuses to import rows
  whose key components disagree. The blend it was built to prevent had already
  happened once and had to be unpicked by hand (2026-08-02).

## 11. 20-minute session budget and the unbounded review turn

**Description.** One 20-minute cap covered plan → implement → review, and the
review turn invited the engineer to "fix any gaps you find".

- **Pros:** symmetric on paper — the same number for both arms.
- **Cons:** asymmetric in effect, and the review turn had no scope bound.
- **Retired because:** the baseline hit the cap in 0 of 198 sessions while
  flowai — three phases under one budget — hit it in 11 of 45; and review edited
  code in 91% of sessions, turning a passing diff into a failing one twice.
  SWE-bench grades against a hidden P2P suite, so an unasked change can only
  lose. Budget raised to 40 minutes (`SESSION_BUDGET_MS`) and the review turn
  bounded — **in the harness only**, not in `framework/atoms/review.md`: in real
  work extra fixes are seen by a human and CI before they ship (user decision
  2026-08-01). Full record:
  `documents/tasks/2026/08/bench-session-budget-review-scope.md`.
