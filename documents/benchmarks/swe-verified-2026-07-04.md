# SWE-bench Verified A/B — flowai arm with the LLM-judged gate (2026-07-04)

Supersedes `swe-verified-2026-07-02-noisefloor.md` as the latest observation.
Purpose: **mechanism observation** of the H2 judged gate (`scripts/benchmark/gate.ts`,
commit `e59d9291`), NOT an aggregate-count judgment (per the corrected loop semantics:
the benchmark is an error-finding method; fixes are judged by mechanism).

## Pipeline delta vs noise-floor reps

- Atoms unchanged since loop1 (`8123e72a` whitespace-only unwrap).
- Harness change only: the scripted gate turn ("Go ahead with your recommended
  variant") is replaced by an LLM judge that reads ONLY the issue + the plan output,
  authorizes one variant, names missed/narrowed outcomes, and challenges
  evidence-free no-work claims. Judge model = arm model; temp cwd outside `$HOME`;
  no gold data reaches the judge. The gate is stochastic (LLM turn).
- Baseline arm not re-run (unchanged harness on that side).

## Verdicts (run-id `judgegate`, 12-instance pool, single rep)

- Resolved 1/12: `django-14792` (a known coin — also flips in noise-floor reps).
- Unresolved 10: `11820` (F2P 1/2), `12325`, `13195` (F2P 4/5), `16256` (F2P 6/9),
  `16667` (F2P 1/2), `pylint-4551` (F2P 0/10), `sphinx-7462` (F2P 1/2),
  `sphinx-7748` (F2P 0/2), `sympy-16597`, `sympy-20428`.
- `django-13513`: empty patch (agent concluded no-work AFTER the judge demanded and
  received evidence — see below).
- Trajectory (same atoms): 0 / 2 / 1 (noise-floor reps) → 1 (this run). Inside the
  measured ±2 noise floor; no aggregate claim is made.

## Mechanism observations

The judge produced a substantive verdict on all 12 instances — zero rubber stamps,
zero judge failures. Representative behaviors (quotes from `[turn 2]` transcripts):

1. **Coverage broadening fired** (the behavior H2 was built for):
   - `11820`: demanded descending `-pk`, multi-level paths, and E015 preservation —
     implement wrote all 4 tests + the fix. Prior reps: INCOMPLETE_FIX; now F2P 1/2
     (remaining gap = `else: _cls=None` traversal reset, a code-surface fact).
   - `4551` (narrowing anchor): judge picked the BROADER variant 2 over the
     recommended narrow one and asked for a rendered-diagram case (`a : str`).
   - `7748`: judge named BOTH mixins (`DocstringSignatureMixin` and
     `DocstringStripSignatureMixin`) and 3+ signature cases.
   - `20428`: demanded regression tests for both reported broken paths AND
     explicitly bounded scope (deferred semantics issue stays deferred).
2. **No-work challenge fired** (`13513`): judge rejected the bare "nothing to do",
   enumerated the 3 required behaviors, demanded code-at-HEAD evidence and 3-case
   test coverage. The agent re-verified and still concluded no-work; the patch
   stays empty. The stale-issue outcome is unrecoverable from the issue text —
   confirmed boundary, but the claim is now evidence-gated instead of silent.
3. **Judge reach boundary — code surface**: the judge sees only the issue text, so
   surface-enumeration failures survive: `4551` writer-layer never touched
   (F2P 0/10, all in `unittest_pyreverse_writer.py`), `7462` sister duplicate
   `pycode/ast.py` missed (F2P failure is `test_pycode_ast.py`), `11820` traversal
   reset missed. These need in-repo enumeration (plan/implement/review side), not
   a smarter gate.
4. **Judge reach boundary — arbitrary gold behavior** (`16667`): the judge steered
   to "handle OverflowError the same as ValueError" (pseudo-ISO join). The gold
   patch instead returns the literal `"0-0-0"` on overflow, and the hidden F2P
   asserts exactly that: `'9223372036854775808-12-1' != '0-0-0'`. The judge's
   advice is defensible engineering yet moves AWAY from gold — where gold encodes
   an arbitrary choice not derivable from the issue, no honest gate can recover it.

## Correction to prior reports (Rule 5)

Loop1/noise-floor root-cause tables classified `16667` as INCOMPLETE_FIX with a
"wrong literal `'0-0-0'` absent from the issue" — implying the agent invented it.
This run's grading shows gold ITSELF returns `'0-0-0'`; the literal was never the
error. The prior failure site must be re-examined if `16667` is analyzed again;
the "invented literal" claim is withdrawn.

## Contamination finding (confirmed live)

The bench agent narrates in Russian inside the sandbox ("Начинаю с RED-фазы…") —
the developer's personal `~/AGENTS.md` rule reaches every bench session because
ancestor-directory memory files load regardless of the isolated `HOME`. The judge
is protected (temp cwd outside `$HOME`); the agent sandbox is not. Recorded as a
follow-up in `documents/tasks/2026/07/bench-judge-gate.md`: move run sandboxes
outside `$HOME`.

## Caveats

- Single rep; the gate itself is now stochastic — instance-level flips include
  judge-verdict variance on top of agent variance. Coins (`14792`, `13195`)
  excluded from any efficacy reading.
- Same-harness A/B except the gate; Python-only hard pool (all baseline failures);
  emulated (now judged) human gate; test hunks stripped before grading (`a3ef4161`).
- The judge quotes above were selected for mechanism illustration; full transcripts
  under `scripts/benchmark/runs/2026-07-04-judgegate/` (gitignored, local).

## Decision log summary

- H2 (judged gate) shipped after loop4 STOP-ANALYSIS killed three plan-atom designs
  (V-A, V-A2, V-B) at critic gates; user selected direction A.
- H1 (independent-extraction subagent in the plan atom) TERMINATED at critic round 2:
  twice-repeated BLOCKING classes (correlated same-model extraction; self-attested
  enforcement) = hard blocker per Rule 7; decisive structural point — the shipped H2
  judge already provides the independent second reading at the gate.
- This run: mechanism validation of H2. Result: the gate works as designed (coverage
  broadening, no-work challenge, scope bounding), and the surviving failure tail is
  dominated by code-surface enumeration and gold-arbitrary behaviors that sit outside
  any gate's reach. Next lever, if pursued: surface enumeration during plan/implement
  (in-repo evidence), not further gate work.
