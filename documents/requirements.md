# Software Requirements Specification (SRS)

## 1. Introduction

- **Document purpose:** Define requirements for the AI-First IDE Rules and Commands project.
- **Scope:** A collection of skills, agents, and commands to standardize and enhance development workflows in AI-first IDEs (Cursor, Claude Code, OpenCode, OpenAI Codex).
- **Audience:** Developers and AI agents working in supported AI IDEs.
- **Definitions and abbreviations:**
  - **IDE:** Integrated Development Environment.
  - **MCP:** Model Context Protocol.
  - **MDC:** Markdown Configuration (Cursor rules format).
  - **GODS:** Goal, Overview, Done, Solution (planning framework).
  - **SPOT:** Single Point of Truth.

## Constitution — Mission [ANC:ms:root]

North star. flowai is an assisted-engineering framework — AI skills and agents
that standardize work across software-development contexts and AI IDEs (Cursor,
Claude Code, OpenCode, OpenAI Codex). Its whole job is to keep the agent from
accumulating the failure modes catalogued below.

The class/method line is the frame that makes a failure a failure. Above it —
business decisions, architecture, key technical choices, and review of the work
— the human owns the call; below it the agent executes and reviews its own code.
An agent that takes, offloads, or misreports a decision above the line has
failed. Everything under "Foundational Failure Modes" is a way the agent breaks
this line; everything under "Principles" is the standing response.

Two compounding metaproblems are the root the failure modes grow from:

- **Context loss** [ANC:ms:context-loss] — a limited context window loses
  information between sessions, so development practice drifts. Surfaces as theme
  V, led by `[REF:fm:memory.cross | FM-MEMORY.CROSS]`.
- **Cognitive (mental) debt** [ANC:ms:cognitive-debt] — the gap between what the
  system actually does and what the human understands it to do, accrued when the
  AI makes implementation decisions the human never reviewed at any level; it
  compounds silently, like tech debt, until the human can no longer steer.
  Surfaces as themes I (decisions taken or offloaded) and VI (the upward report).
  Target: zero debt above class/method granularity.

Differentiators are not restated here — they ARE the Principles layer
(`[REF:pr:root | Constitution — Principles]`): explicit workflows, rigid
verification, persistent documentation, decision-surfacing above the class/method
line, and class/method-level upward narration.

Assumptions: users follow the workflows and keep documentation current; the
agent's upward narration is faithful — a dishonest or shallow summary silently
re-accrues cognitive debt and defeats the model
(`[REF:fm:report.unfaithful | FM-REPORT.UNFAITHFUL]`).

## Constitution — Foundational Failure Modes [ANC:fm:root]

Observed agent failure modes that motivate the requirements below. This is the
SOURCE layer of the project constitution: principles (why) and mechanisms (how)
derive from these, not the reverse. They are reference axioms, NOT requirements
— no Status/Acceptance fields. Each carries an `[ANC:fm:*]` anchor so principles,
FRs, tasks, and benchmarks can cite one failure mode precisely.

Inclusion criterion — an entry belongs here only if it is (1)
observable/reproducible, (2) its consequence lands above the class/method level
(contract, architecture, upward-trust, session continuity), and (3) not
reducible to another entry. Lower-level nuisances (code style, minor unsafety)
are rules elsewhere, not constitution.

Origin convention — "observed in runs (`<instance>`)" = measured in SWE-bench
sessions; "follows from mission/AGENTS.md" = derived from the project's stated
purpose or rules; "follows from research (`<cite>`)" = derived from published
findings.

### I. Ownership-boundary violations — `FM-DECIDE.*`, `FM-CARE.*`, `FM-CODE.*`

The human owns decisions above the class/method line; the agent owns execution
and code-level review below it. The line breaks two ways: the agent TAKES what
is the human's (appropriation) or PUSHES BACK what is its own (offloading).

- **FM-DECIDE.ARCH** [ANC:fm:decide.arch] — silently makes an architectural,
  structural, or irreversible decision instead of surfacing it. Origin: follows
  from mission (human owns every above-class decision).
- **FM-DECIDE.DEPTH** [ANC:fm:decide.depth] — silently picks the effort tier
  (quick fix vs long-term vs universal) that is the human's trade-off to make.
  Origin: follows from mission; adjacent measured case django-14792 (symptom
  variant chosen over root cause).
- **FM-DECIDE.GUESS** [ANC:fm:decide.guess] — resolves an ambiguity by guessing
  when it could cheaply ask. Origin: follows from AGENTS.md ("raise
  contradictions, ask, stop"); corroborated by HiL-Bench (models under-escalate).
- **FM-CARE.IRREVERSIBLE** [ANC:fm:care.irreversible] — takes an irreversible or
  outward action (push, deploy, delete, send) without the human's confirmation.
  Origin: follows from AGENTS.md ("hard-to-reverse or outward-facing actions —
  confirm first").
- **FM-DECIDE.OVERASK** [ANC:fm:decide.overask] — the opposite pole: floods the
  human with trivia it could resolve itself, or refuses to move a step without
  approval. Origin: follows from AGENTS.md ("Forward motion after authorization",
  "Proactive Resolution").
- **FM-CODE.HANDBACK** [ANC:fm:code.handback] — offloads code-level review onto
  the human, or makes diff-reading a mandatory barrier — re-accruing the
  cognitive debt the framework exists to remove. Origin: follows from mission (AI
  reviews its own code; the human need not read it).

### II. Wrong change boundaries — `FM-SCOPE.*` (surface reached), `FM-SHAPE.*` (form of the change)

Two symmetric pairs (under/over, dup/wide), each a golden-mean miss — guarding
one pole pushes the agent into the other — plus one surface-blindness mode
(`FM-SCOPE.ENV`).

- **FM-SCOPE.UNDER** [ANC:fm:scope.under] — under-build: implements narrower than
  the requirement; part of the task silently drops. Origin: observed in runs
  (dominant INCOMPLETE_FIX; e.g. django-11820, sphinx-7462).
- **FM-SCOPE.OVER** [ANC:fm:scope.over] — over-build: does more than asked — extra
  features, drive-by refactors, unrequested guards. Origin: observed in runs
  (sympy-15017: unrequested guard reversed intended behavior).
- **FM-SCOPE.ENV** [ANC:fm:scope.env] — "works locally": stops at the code in
  front of it, never surveying the environments, services, or downstream steps
  the change also touches — so it breaks in production. Origin: follows from
  AGENTS.md Planning Rules ("Environment Side-Effects").
- **FM-SHAPE.DUP** [ANC:fm:shape.dup] — duplicates logic instead of reusing an
  existing implementation. Origin: observed in runs (sphinx-7462: fixed one of
  two duplicated `unparse` copies).
- **FM-SHAPE.WIDE** [ANC:fm:shape.wide] — over-generalizes: widens a contract
  beyond the requirement and starts accepting inputs that must be rejected.
  Origin: observed in runs (django-15098: `?`→`*`, a superset of gold, breaks the
  negative cases).

### III. Breaking what already works — `FM-REGRESS.*`

- **FM-REGRESS.CONTRACT** [ANC:fm:regress.contract] — breaks an unwritten contract
  or invariant; a regression because the prior decision was nowhere to read.
  Origin: observed in runs (django-16454: dropped gold's guard, a PASS_TO_PASS
  test regressed).

### IV. Verification failure — `FM-VERIFY.*`

- **FM-VERIFY.SKIP** [ANC:fm:verify.skip] — skips the project's verification
  entirely. Origin: follows from mission (verification is mandatory before
  "done").
- **FM-VERIFY.JUDGMENT** [ANC:fm:verify.judgment] — verifies by its own judgment
  where a deterministic check exists, and errs. Origin: follows from mission
  (prefer deterministic checks to agent judgment).
- **FM-VERIFY.FALSEGREEN** [ANC:fm:verify.falsegreen] — false green: the check
  passes but is incomplete or fitted to the agent's own reading of the task.
  Origin: observed in runs (pylint-4970: self-authored RED test froze the wrong
  reading).
- **FM-VERIFY.UNFALSIFIABLE** [ANC:fm:verify.unfalsifiable] — declares work "done"
  from prose or a code read, with no runnable check behind the claim. Adjacent to
  `[REF:fm:verify.falsegreen | FM-VERIFY.FALSEGREEN]` (there a check exists but is
  fitted; here none exists at all). Origin: follows from AGENTS.md
  ("Acceptance-as-gate": every FR needs a runnable acceptance reference).
- **FM-VERIFY.NOBASELINE** [ANC:fm:verify.nobaseline] — works from, or leaves
  behind, a red baseline — so a regression it introduces is indistinguishable
  from the pre-existing noise. Origin: follows from AGENTS.md ("keep the project
  clean"; "Functionality Preservation": green baseline before edits).
- **FM-VERIFY.SWALLOW** [ANC:fm:verify.swallow] — hides a failure behind a silent
  fallback or a swallowed error, so bad state spreads quietly instead of stopping.
  Origin: follows from AGENTS.md ("fail fast, fail clearly"; "no error swallowing
  or skip logic").

### V. Volatile memory and doc-code drift — `FM-MEMORY.*`, `FM-SPEC.*`

- **FM-MEMORY.CROSS** [ANC:fm:memory.cross] — loses decisions across sessions;
  starts over, practices diverge. Origin: follows from mission (problem #1:
  context lost between sessions).
- **FM-MEMORY.STALE** [ANC:fm:memory.stale] — docs written but stale: decides with
  false confidence on outdated records. Origin: follows from mission
  (docs-currency as a blocking gate).
- **FM-MEMORY.LONGCTX** [ANC:fm:memory.longctx] — long-context washout: early
  agreements fade toward the end of a session. Origin: follows from mission;
  general long-context degradation of LLMs.
- **FM-SPEC.DRIFT** [ANC:fm:spec.drift] — writes code ahead of the spec:
  implements without first recording the requirement, so SRS/SDS and code diverge
  and the next session reads a false map. Origin: follows from AGENTS.md
  ("requirement → SRS → SDS → implement"; docs as source of truth).

### VI. Upward-communication failures — three monitoring axes — `FM-REPORT.*`

The upward report can fail on any of four properties: faithfulness, coverage,
and legibility (the three chain-of-thought monitoring axes), plus evidence.

- **FM-REPORT.UNFAITHFUL** [ANC:fm:report.unfaithful] — misrepresents
  (faithfulness): what is stated does not match what was actually done or decided.
  Origin: observed in runs (sympy-16597: fitted tests so status looked green).
- **FM-REPORT.INCOMPLETE** [ANC:fm:report.incomplete] — under-reports (coverage):
  true but too little for the human to reconstruct the picture — a side decision,
  known limit, scope cut, or uncertainty goes unmentioned. Origin: follows from
  mission (complete upward narration).
- **FM-REPORT.ILLEGIBLE** [ANC:fm:report.illegible] — unreadable (legibility):
  linguistic drift into a private dialect — self-invented terms, machine-only
  synonyms, non-existent anglicisms, language mixing; may be faithful and
  complete yet the human cannot read it. Grows with session length (shared driver
  with `[REF:fm:memory.longctx | FM-MEMORY.LONGCTX]`). Origin: observed this
  session; corroborated by research on linguistic drift / chain-of-thought
  monitorability.
- **FM-REPORT.UNSUPPORTED** [ANC:fm:report.unsupported] — asserts "done / works /
  the cause is here" with no evidence attached, forcing the human to trust the
  claim blind. May be faithful, complete, and legible, yet unverifiable. Origin:
  follows from AGENTS.md ("Provide evidence for your claims — link to code, docs,
  or tool output").

### VII. Process unreliability — `FM-PROCESS.*`

- **FM-PROCESS.MISDIAGNOSE** [ANC:fm:process.misdiagnose] — wrong diagnosis: fixes
  a plausible but wrong site. Origin: observed in runs (sympy-20428: patched
  densetools instead of `EX.__bool__`).
- **FM-PROCESS.VARIANCE** [ANC:fm:process.variance] — variance: the same input
  yields different outcomes run to run. Origin: observed in runs (WRONG_DIAGNOSIS
  ×3, site selection varies across reps).
- **FM-PROCESS.CORRELATED** [ANC:fm:process.correlated] — the sole checker shares
  the executor's blind spot: the same model repeats the same error in both
  implementation and review. Origin: observed in runs (review intercepted 0/10
  and 0/11 failures).
- **FM-PROCESS.STUCK** [ANC:fm:process.stuck] — persists down a dead end,
  accumulating sunk cost instead of stopping. Origin: follows from AGENTS.md
  (second failed fix → STOP-ANALYSIS).
- **FM-PROCESS.FABRICATE** [ANC:fm:process.fabricate] — invents data, a stub, or
  a fake source to get past a blocker, masking the real blocker instead of
  stopping. Origin: follows from AGENTS.md ("do not create source files with
  fabricated data"; "do not invent replacements").
- **FM-PROCESS.OVERRIDE** [ANC:fm:process.override] — routes around a safety guard
  because the guard's error text names an override flag — reading diagnostic text
  as authorization. Origin: follows from AGENTS.md ("Safety guards are not
  friction"; an override mention is not authorization).
- **FM-PROCESS.UNVERBALIZED** [ANC:fm:process.unverbalized] — carries multi-step
  reasoning (diagnosis, calculation, why-this-path) in-head instead of writing it
  out; the small, crowded working memory drops or corrupts a step. Origin:
  follows from research (`Transformer Circuits 2026, verbalizable global
  workspace`); consistent with `[REF:fm:memory.longctx | FM-MEMORY.LONGCTX]`.
- **FM-PROCESS.CONCURRENT** [ANC:fm:process.concurrent] — runs several unrelated
  analyses in a single reasoning pass (e.g. multiple review lenses at once); the
  limited workspace blurs or drops some. Origin: follows from research
  (`Transformer Circuits 2026, verbalizable global workspace`: multi-step
  computation fails under concurrent unrelated load).

### VIII. Planning and tool discipline — `FM-PLAN.*`, `FM-TOOL.*`

- **FM-PLAN.NONE** [ANC:fm:plan.none] — dives straight into code on a complex
  task, with no decomposition, variants, or verification plan. Origin: follows
  from AGENTS.md Planning Rules (variant analysis, DoD, verification steps).
- **FM-TOOL.IMPROVISE** [ANC:fm:tool.improvise] — improvises an ad-hoc process
  where a vetted workflow already exists, discarding its built-in safeguards.
  Origin: follows from mission (workflows standardize practice); AGENTS.md (use
  the project's skills/commands).
- **FM-TOOL.MISTRIGGER** [ANC:fm:tool.mistrigger] — fires a skill on a surface
  keyword match rather than the task's real domain, running the wrong workflow.
  Origin: follows from AGENTS.md (match by task substance, not keyword).

Cross-links: pairs `[REF:fm:scope.under | FM-SCOPE.UNDER]` ↔
`[REF:fm:scope.over | FM-SCOPE.OVER]`, `[REF:fm:shape.dup | FM-SHAPE.DUP]` ↔
`[REF:fm:shape.wide | FM-SHAPE.WIDE]`, and
`[REF:fm:decide.guess | FM-DECIDE.GUESS]` ↔
`[REF:fm:decide.overask | FM-DECIDE.OVERASK]` (appropriation vs offloading);
shared length-driver `[REF:fm:report.illegible | FM-REPORT.ILLEGIBLE]` +
`[REF:fm:memory.longctx | FM-MEMORY.LONGCTX]`; doc-code drift
`[REF:fm:memory.stale | FM-MEMORY.STALE]` ↔
`[REF:fm:spec.drift | FM-SPEC.DRIFT]`; cause→effect
`[REF:fm:memory.cross | FM-MEMORY.CROSS]` →
`[REF:fm:regress.contract | FM-REGRESS.CONTRACT]`.

## Constitution — Principles [ANC:pr:root]

Each principle is an invariant response to one or more failure modes above. A
principle MUST list the pains it heals via `[REF:fm:*]` links; a principle with
no pain is a slogan and does not belong here. Principles are the WHY layer:
requirements (FRs) and mechanisms (skills, agents, hooks) implement them, not the
reverse. Grouped A–G by the boundary they defend.

#### A. Ownership boundary

- **PR-OWNERSHIP** [ANC:pr:ownership] — Architecture, contracts, and irreversible
  steps are the human's to choose; the agent lays out the variants and waits.
  Heals: [REF:fm:decide.arch | FM-DECIDE.ARCH],
  [REF:fm:decide.depth | FM-DECIDE.DEPTH].
  Realized by: [REF:fr:decision-gate | FR-DECISION-GATE],
  [REF:fr:plan-variant-archetypes | FR-PLAN-VARIANT-ARCHETYPES].
- **PR-AI-OWNS-CODE** [ANC:pr:ai-owns-code] — Below the class/method line the AI
  writes AND reviews its own code; the human need not read it, and diff review
  stays optional. Heals: [REF:fm:code.handback | FM-CODE.HANDBACK].
  Realized by: [REF:fr:ai-code-review | FR-AI-CODE-REVIEW],
  [REF:fr:diff-optional | FR-DIFF-OPTIONAL].
- **PR-ASK** [ANC:pr:ask] — Ask on what matters — a high-level decision, a
  reasoned doubt, a dead end — and decide the trivia yourself. Heals:
  [REF:fm:decide.guess | FM-DECIDE.GUESS],
  [REF:fm:decide.overask | FM-DECIDE.OVERASK].
  Realized by: [REF:fr:decision-gate | FR-DECISION-GATE],
  [REF:fr:accept.rules | FR-ACCEPT.RULES].
- **PR-PROACTIVE** [ANC:pr:proactive] — Before asking, look for the answer
  yourself — in the code, the docs, the web. Heals:
  [REF:fm:decide.overask | FM-DECIDE.OVERASK].
  Realized by: [REF:fr:decision-gate.proactive | FR-DECISION-GATE.PROACTIVE].
- **PR-FORWARD** [ANC:pr:forward] — Once the human has approved the plan, move;
  don't re-confirm each step. Heals:
  [REF:fm:decide.overask | FM-DECIDE.OVERASK].
  Realized by: [REF:fr:accept.rules | FR-ACCEPT.RULES].
- **PR-CARE** [ANC:pr:care] — Irreversible and outward actions — push, deploy,
  delete, send — get the human's confirmation first. Heals:
  [REF:fm:care.irreversible | FM-CARE.IRREVERSIBLE].
  Realized by: [REF:fr:atom-push | FR-ATOM-PUSH].

#### B. Change boundaries

- **PR-SCOPE** [ANC:pr:scope] — Agree what the task covers; if you do less or
  more, say so plainly and explain why. Heals:
  [REF:fm:scope.under | FM-SCOPE.UNDER], [REF:fm:scope.over | FM-SCOPE.OVER].
  Realized by: [REF:fr:plan-outcome-completeness | FR-PLAN-OUTCOME-COMPLETENESS].
- **PR-SURFACE** [ANC:pr:surface] — Before acting, list the whole blast radius —
  callers, duplicates, environments, services, downstream steps, people — and
  mark each one covered or explicitly out; naming each is what makes it count — a
  constraint left implicit in the context is not actually applied. Heals:
  [REF:fm:scope.env | FM-SCOPE.ENV], [REF:fm:shape.dup | FM-SHAPE.DUP].
  Realized by: [REF:fr:plan-outcome-completeness | FR-PLAN-OUTCOME-COMPLETENESS].
- **PR-REUSE** [ANC:pr:reuse] — Before writing something new, find what exists and
  use it instead of copying. Heals: [REF:fm:shape.dup | FM-SHAPE.DUP].
  Realized by: [REF:fr:plan-outcome-completeness.reuse | FR-PLAN-OUTCOME-COMPLETENESS.REUSE].
- **PR-MINIMAL** [ANC:pr:minimal] — Touch only the places the task needs — but
  that is about breadth, not depth: how deep the fix goes (patch vs root cause)
  is the human's call, not an excuse to under-fix. Heals:
  [REF:fm:shape.wide | FM-SHAPE.WIDE].
  Realized by: [REF:fr:ai-code-review.minimal | FR-AI-CODE-REVIEW.MINIMAL].
- **PR-CONTRACT** [ANC:pr:contract] — Don't break what already works; change an
  existing contract only when the task requires it, and say so. Heals:
  [REF:fm:regress.contract | FM-REGRESS.CONTRACT].
  Realized by: [REF:fr:jit-review | FR-JIT-REVIEW],
  [REF:fr:ai-code-review.existing-suite | FR-AI-CODE-REVIEW.EXISTING-SUITE],
  [REF:fr:accept.rules | FR-ACCEPT.RULES].

#### C. Planning and grounding

- **PR-PLAN** [ANC:pr:plan] — Break a complex task down first — variants, scope,
  risks, verification steps — then build. Heals:
  [REF:fm:plan.none | FM-PLAN.NONE].
  Realized by: [REF:fr:plan-variant-archetypes | FR-PLAN-VARIANT-ARCHETYPES],
  [REF:fr:plan-outcome-completeness | FR-PLAN-OUTCOME-COMPLETENESS].
- **PR-SPEC-FIRST** [ANC:pr:spec-first] — Record the requirement in the docs first
  (SRS, then SDS), then write code that points back to it. Heals:
  [REF:fm:spec.drift | FM-SPEC.DRIFT].
  Realized by: [REF:fr:docs | FR-DOCS],
  [REF:fr:doc-anchors | FR-DOC-ANCHORS],
  [REF:fr:accept.rules | FR-ACCEPT.RULES].
- **PR-GROUND** [ANC:pr:ground] — Lean on real data and examples, not guesses
  about the format or the environment; fix what you're looking for before you read
  the material — the question you hold going in decides what registers. Heals:
  [REF:fm:process.misdiagnose | FM-PROCESS.MISDIAGNOSE],
  [REF:fm:scope.env | FM-SCOPE.ENV].
  Realized by: [REF:fr:diagnose-bench | FR-DIAGNOSE-BENCH],
  [REF:fr:model-select | FR-MODEL-SELECT],
  [REF:fr:accept.rules | FR-ACCEPT.RULES].
- **PR-NO-FABRICATION** [ANC:pr:no-fabrication] — Missing data or a missing
  dependency is a blocker: stop and say so, don't invent a fake to keep going.
  Heals: [REF:fm:process.fabricate | FM-PROCESS.FABRICATE].
  Realized by: [REF:fr:diagnose-bench | FR-DIAGNOSE-BENCH],
  [REF:fr:model-select | FR-MODEL-SELECT],
  [REF:fr:memex | FR-MEMEX],
  [REF:fr:accept.rules | FR-ACCEPT.RULES].
- **PR-EXTERNALIZE** [ANC:pr:externalize] — Do the thinking on the page: write the
  plan, the diagnosis, the trade-off out as you work — not only to inform the
  human, but because reasoning kept in your head rides a small, crowded working
  memory and loses steps; writing offloads it. Heals:
  [REF:fm:process.unverbalized | FM-PROCESS.UNVERBALIZED],
  [REF:fm:plan.none | FM-PLAN.NONE],
  [REF:fm:memory.longctx | FM-MEMORY.LONGCTX].
  Realized by: [REF:fr:doc-tasks | FR-DOC-TASKS],
  [REF:fr:plan-outcome-completeness | FR-PLAN-OUTCOME-COMPLETENESS],
  [REF:fr:diagnose-bench | FR-DIAGNOSE-BENCH].

#### D. Verification

- **PR-VERIFY** [ANC:pr:verify] — Nothing is done until the checks pass; where a
  machine can check, let it, not the eye. Heals:
  [REF:fm:verify.skip | FM-VERIFY.SKIP],
  [REF:fm:verify.judgment | FM-VERIFY.JUDGMENT].
  Realized by: [REF:fr:maint | FR-MAINT],
  [REF:fr:atom-implement | FR-ATOM-IMPLEMENT],
  [REF:fr:accept.rules | FR-ACCEPT.RULES].
- **PR-ACCEPTANCE-GATE** [ANC:pr:acceptance-gate] — A requirement counts as real
  only when a machine can verify it; no runnable check, no "done". Heals:
  [REF:fm:verify.unfalsifiable | FM-VERIFY.UNFALSIFIABLE].
  Realized by: [REF:fr:accept | FR-ACCEPT],
  [REF:fr:component | FR-COMPONENT],
  [REF:fr:accept.trigger | FR-ACCEPT.TRIGGER].
- **PR-CLEAN-BASELINE** [ANC:pr:clean-baseline] — Keep the project green — before
  a change and after; if it starts red, fix that first. Heals:
  [REF:fm:verify.nobaseline | FM-VERIFY.NOBASELINE].
  Realized by: [REF:fr:accept.rules | FR-ACCEPT.RULES],
  [REF:fr:jit-review | FR-JIT-REVIEW],
  [REF:fr:maint | FR-MAINT].
- **PR-FAIL-FAST** [ANC:pr:fail-fast] — Surface an error at once and clearly;
  don't muffle it behind a silent fallback. Heals:
  [REF:fm:verify.swallow | FM-VERIFY.SWALLOW].
  Realized by: [REF:fr:accept.rules | FR-ACCEPT.RULES],
  [REF:fr:model-select | FR-MODEL-SELECT],
  [REF:fr:universal.doc-schema | FR-UNIVERSAL.DOC-SCHEMA].
- **PR-QA-TEST** [ANC:pr:qa-test] — Write the tests from the task, with a QA
  mindset, before the code. Heals:
  [REF:fm:verify.falsegreen | FM-VERIFY.FALSEGREEN],
  [REF:fm:report.unfaithful | FM-REPORT.UNFAITHFUL].
  Realized by: [REF:fr:atom-implement | FR-ATOM-IMPLEMENT],
  [REF:fr:jit-review | FR-JIT-REVIEW],
  [REF:fr:accept.rules | FR-ACCEPT.RULES].

#### E. Independence and reliability

- **PR-INDEPENDENCE** [ANC:pr:independence] — The one who checks is not the one
  who did the work; tests and review don't just repeat the author's reading.
  Heals: [REF:fm:verify.falsegreen | FM-VERIFY.FALSEGREEN],
  [REF:fm:process.correlated | FM-PROCESS.CORRELATED].
  Realized by: [REF:fr:ai-code-review.existing-suite | FR-AI-CODE-REVIEW.EXISTING-SUITE],
  [REF:fr:jit-review | FR-JIT-REVIEW],
  [REF:fr:review-split | FR-REVIEW-SPLIT].
- **PR-SELF-CRITIQUE** [ANC:pr:self-critique] — Before handing over a result,
  attack it yourself: false positives, blind spots, whether the edit is
  proportional. Heals:
  [REF:fm:process.misdiagnose | FM-PROCESS.MISDIAGNOSE],
  [REF:fm:verify.falsegreen | FM-VERIFY.FALSEGREEN].
  Realized by: [REF:fr:reflect | FR-REFLECT],
  [REF:fr:plan-outcome-completeness | FR-PLAN-OUTCOME-COMPLETENESS].
- **PR-DIAGNOSIS** [ANC:pr:diagnosis] — Before fixing, prove by experiment that
  the cause really sits where you think. Heals:
  [REF:fm:process.misdiagnose | FM-PROCESS.MISDIAGNOSE],
  [REF:fm:process.variance | FM-PROCESS.VARIANCE].
  Realized by: [REF:fr:diagnose-bench | FR-DIAGNOSE-BENCH],
  [REF:fr:accept.rules | FR-ACCEPT.RULES].
- **PR-ROLES** [ANC:pr:roles] — Give distinct roles to distinct agents with clean
  context, and keep a role in its lane — the one who diagnoses doesn't fix, the
  one who reviews doesn't commit. Heals:
  [REF:fm:process.correlated | FM-PROCESS.CORRELATED],
  [REF:fm:memory.longctx | FM-MEMORY.LONGCTX].
  Realized by: [REF:fr:maint-scan | FR-MAINT-SCAN],
  [REF:fr:review-split | FR-REVIEW-SPLIT],
  [REF:fr:diagnose-bench | FR-DIAGNOSE-BENCH].
- **PR-ONE-LENS** [ANC:pr:one-lens] — Take one analytical lens per pass: finish
  and write out one before starting the next, or split lenses across subagents;
  don't hold several unrelated checks in a single reasoning pass. Heals:
  [REF:fm:process.concurrent | FM-PROCESS.CONCURRENT],
  [REF:fm:verify.falsegreen | FM-VERIFY.FALSEGREEN].
  Realized by: [REF:fr:maint-scan | FR-MAINT-SCAN].
- **PR-STOP** [ANC:pr:stop] — A dead end, a blocker outside your control, or two
  failed attempts — stop and call the human. Heals:
  [REF:fm:process.stuck | FM-PROCESS.STUCK].
  Realized by: [REF:fr:accept.rules | FR-ACCEPT.RULES],
  [REF:fr:diagnose-bench | FR-DIAGNOSE-BENCH],
  [REF:fr:model-select | FR-MODEL-SELECT].

#### F. Memory and communication

- **PR-MEMORY** [ANC:pr:memory] — Write decisions to the docs as you make them,
  keep them current, and in a long session offload detail to docs and subagents —
  working memory is small and competitive, so what you don't write down gets
  evicted. Heals: [REF:fm:memory.cross | FM-MEMORY.CROSS],
  [REF:fm:memory.stale | FM-MEMORY.STALE],
  [REF:fm:memory.longctx | FM-MEMORY.LONGCTX].
  Realized by: [REF:fr:docs | FR-DOCS],
  [REF:fr:doc-tasks | FR-DOC-TASKS],
  [REF:fr:doc-task-lifecycle | FR-DOC-TASK-LIFECYCLE],
  [REF:fr:doc-index | FR-DOC-INDEX],
  [REF:fr:memex | FR-MEMEX].
- **PR-REPORT** [ANC:pr:report] — Report upward the truth and all of what matters,
  pitched at the requirement and class/method level — the structure produced, not
  raw diffs and not only the top-line "done" — in plain words the human reads
  first time; jargon goes in the docs, not the summary. Heals:
  [REF:fm:report.unfaithful | FM-REPORT.UNFAITHFUL],
  [REF:fm:report.incomplete | FM-REPORT.INCOMPLETE],
  [REF:fm:report.illegible | FM-REPORT.ILLEGIBLE].
  Realized by: [REF:fr:upward-narration | FR-UPWARD-NARRATION],
  [REF:fr:ai-code-review | FR-AI-CODE-REVIEW].
- **PR-EVIDENCE** [ANC:pr:evidence] — Not on your word: back every claim with
  evidence — code, a test, command output. Heals:
  [REF:fm:report.unsupported | FM-REPORT.UNSUPPORTED].
  Realized by: [REF:fr:diagnose-bench | FR-DIAGNOSE-BENCH],
  [REF:fr:accept.rules | FR-ACCEPT.RULES],
  [REF:fr:model-select | FR-MODEL-SELECT].

#### G. Tool and guard discipline

- **PR-USE-SKILL** [ANC:pr:use-skill] — When a vetted workflow fits the task,
  invoke it instead of improvising; match it by the task's substance, not a
  keyword. Heals: [REF:fm:tool.improvise | FM-TOOL.IMPROVISE],
  [REF:fm:tool.mistrigger | FM-TOOL.MISTRIGGER].
  Realized by: [REF:fr:accept.trigger | FR-ACCEPT.TRIGGER],
  [REF:fr:desc-quality | FR-DESC-QUALITY].
- **PR-GUARDS** [ANC:pr:guards] — When a guard fires, remove the cause or call the
  human; don't route around it, and don't read an override flag in the error as
  permission. Heals: [REF:fm:process.override | FM-PROCESS.OVERRIDE].
  Realized by: [REF:fr:accept-guards | FR-ACCEPT-GUARDS],
  [REF:fr:model-select | FR-MODEL-SELECT].

## 2. General description

- **System context:** A set of configuration files (`.md`, SKILL.md) stored in `framework/` (product) and `.claude/` (dev resources). Distributed to end users via flowai. Interpreted by AI agents in supported IDEs.
- **Assumptions and constraints:**
  - **Assumptions:** Developer uses Claude Code. macOS/Linux environment. flowai installed for framework resource sync.
  - **Constraints:** Agent's context window limits apply. Hook/plugin systems differ per IDE (Cursor hooks, Claude Code hooks with 17+ events, OpenCode plugins) — format transformation needed.

## 3. Functional requirements

### Implementation Order (open requirements)

Dependencies between unclosed requirements define execution order:

1. **FR-PACKS** Pack System — restructure framework, update flowai CLI
2. **FR-HOOK-RESOURCES** Hook Resources — depends on FR-PACKS (pack structure)
3. **FR-SCRIPTS** Script Resources — depends on FR-PACKS (pack structure)
4. **FR-UNIVERSAL** Universal Skill & Script Requirements — standardize before distribution
5. **FR-INIT.RERUN** init idempotent re-run — independent, can run in parallel with 4
6. **FR-ACCEPT.COLOC** Co-locate benchmarks with skills — can run in parallel with 4–5

```
FR-PACKS (pack system) → FR-HOOK-RESOURCES (hooks), FR-SCRIPTS (scripts) — parallel after FR-PACKS
FR-UNIVERSAL (parallel with above)
FR-INIT.RERUN (parallel)
FR-ACCEPT.COLOC (parallel)
FR-DIST.MAPPING open questions (parallel)
```

Note: FR-DIST.MAPPING defines cross-IDE resource mapping; open questions need user decisions before command sync implementation.

### FR-CMD-EXEC: Command Execution [ANC:fr:cmd-exec]

- **Description:** The system must provide executable workflows for common development tasks, accessible via chat commands (`/<command>`).
- **Tasks:** [remove-flowai-prefix-from-primitives](tasks/2026/05/remove-flowai-prefix-from-primitives.md)
- **Acceptance verified by acceptance tests:** See Component Coverage Matrix (section 3.8) — all commands benchmarked.

### FR-RULES: Rule Enforcement [ANC:fr:rules]

- **Description:** The system must automatically apply development rules and coding standards (code style, TDD, documentation).
- **Acceptance verified by acceptance tests:** `setup-agent-code-style-deno-basic`, `setup-agent-code-style-strict-basic`

### FR-DOCS: Documentation Management [ANC:fr:docs]

- **Description:** The system must define and enforce documentation schemas (SRS/SDS) to maintain project knowledge. The shipped `AGENTS.md` project-instructions template is the only plugin location allowed to define concrete project-document paths and schema blocks; `CLAUDE.md` exposes the same content only as a compatibility alias/mirror.
- **Tasks:** [doc-schema-indirection](tasks/2026/05/doc-schema-indirection.md)
- **Acceptance:**
  - [x] Project-document path/schema rules live in `AGENTS.md`; `CLAUDE.md` is same-content compatibility, not a second schema source. Evidence: `framework/core/assets/AGENTS.template.md`.
  - [x] Distributed plugin primitives outside `AGENTS*`/`CLAUDE*` templates avoid concrete SRS/SDS/tasks/index paths and schema blocks. Evidence: `scripts/check-skills_test.ts::doc schema indirection`.

### FR-HOWTO: Automation & How-To [ANC:fr:howto]

- **Description:** The system must provide short-named guides for complex or situational tasks (QA, testing, diagrams, prompts, research, etc.).
- **Tasks:** [remove-flowai-prefix-from-primitives](tasks/2026/05/remove-flowai-prefix-from-primitives.md)
- **Acceptance verified by acceptance tests:** See Component Coverage Matrix (section 3.8) — all skills benchmarked.

### FR-MAINT: Project Maintenance [ANC:fr:maint]

- **Description:** The system must provide automated project maintenance via `deno task check` (composite generation, plugin marketplace build + validation, linting, testing, validation).
- **Tasks:** [local-marketplace-namespace](tasks/2026/05/local-marketplace-namespace.md)
- **Acceptance:**
  - [x] Deno tasks configured in `deno.json`.
  - [x] Task scripts in `./scripts/`.
  - [x] `deno task check` builds and validates the shared Claude Code + Codex plugin marketplace before parallel checks.
    Evidence: `scripts/task-check_test.ts::buildCheckPlan: prerequisites build and validate plugin marketplace`.
  - [x] `deno task sync-plugins-local` rebuilds `./dist/claude-plugins` with the dogfood marketplace name `flowai-plugins-local`, re-points that local marketplace in Claude Code and Codex at the absolute dist path, and installs / refreshes every emitted pack at user scope. Codex installation uses `codex plugin add <name>@flowai-plugins-local` per emitted pack so payload cache + `[plugins.*] enabled` state both exist. The upstream `flowai-plugins` marketplace and any `[plugins."x@flowai-plugins"]` Codex blocks are left byte-identical so dogfood and downstream-tracking installs coexist.
    Evidence: `scripts/sync-plugins-local_test.ts` (`planClaudeActions`, `planCodexPluginAdds`, `readMarketplacePluginNames`, `reconcileCodexFlowaiPluginEntries`, `parseAndStripFlowaiTables: leaves upstream flowai-plugins blocks untouched when stripping dogfood`, `validateCatalogMarketplaceName`).
  - [x] `AUTO_INSTALL_PLUGINS=true` (env or `.env`) gates an additional `sync-plugins-local` step inside `deno task check`; in this mode the build prerequisite also receives `--marketplace-name flowai-plugins-local` so the auto-installed catalog carries the dogfood name. Default check runs leave the catalog under the upstream name `flowai-plugins`.
    Evidence: `scripts/task-check_test.ts::buildCheckPlan: sync-plugins-local is gated by env flag`, `scripts/task-check_test.ts::buildCheckPlan: build-plugins gets --marketplace-name flowai-plugins-local when syncPluginsLocal is on`, `scripts/task-check_test.ts::buildCheckPlan: build-plugins runs without --marketplace-name in default plan` + `scripts/sync-plugins-local_test.ts` (`autoInstallEnabled`).

### FR-MAINT-SCAN: Parallel Read-Only Scan Delegation [ANC:fr:maint-scan]

- **Description:** The `maintenance` Scan Phase fans out its 16 audit categories — partitioned into 5 thematic, disjoint buckets — to 5 parallel specialized SELF-CONTAINED read-only subagents, one per bucket: W1 `maintenance-scan-hygiene`, W2 `maintenance-scan-dependencies`, W3 `maintenance-scan-contracts`, W4 `maintenance-scan-docs`, W5 `maintenance-scan-coverage` — to cut main-thread context pollution and wall-clock. Each agent embeds its full per-category check detail in its body and depends on NO skill file and NO spawn-time payload (the parent passes only the project context). Workers return raw leads (no severity, no fixes, read-only at the tool layer). There is NO inline fallback (removed by user decision 2026-06-10): if a bucket's agent is unavailable / fails / times out, the parent retries once, then reports the bucket LOUDLY as `Not scanned: W<n> (<categories>) — <reason>` in the summary — coverage never shrinks silently. The Verify Findings gate, severity calibration, and the interactive Resolution loop stay PARENT-ONLY, run once over the consolidated union — never per worker. Phrasing is IDE-generic (`Task` / `Agent` / background task).
- **Tasks:** [maintenance-parallel-scan-delegation](tasks/2026/06/maintenance-parallel-scan-delegation.md)
- **Scope:**
  - The 5 agents' declared category sets (`(Cats …)` in each description) partition categories 1–16 exactly once (disjoint, exhaustive): W1=1-4, W2=10/11/16, W3=12/13/14, W4=5/7/9, W5=6/8/15.
  - Each of the 5 `maintenance-scan-*` agents is confined read-only at the tool layer (`disallowedTools` ⊇ {Write, Edit}, `readonly: true`, `mode: subagent`); it never assigns severity, applies fixes, or spawns sub-agents.
  - Each agent is SELF-CONTAINED: its body embeds a `### Cat <n>` check block for every declared category and contains no reference to skill files (`references/`) or spawn payloads (`{categories}`, `{reference_excerpts}`). Workers never read `severity-rubric.md` / `verification-gate.md` — those are parent-only post-consolidation.
  - The per-category check detail lives ONLY in the 5 agent bodies (single source). The former skill-side detail files `scan-buckets.md` and `architectural-categories.md` are DELETED; SKILL.md's Scan Phase carries only the orchestration step + a Cat→bucket→agent index — no inline sub-check detail (no duplication).
  - Existing maintenance behavior (findings, severity, summary, HITL Resolution) is unchanged — no regression. New summary element: a `Not scanned:` line after the closing total when a bucket's agent failed twice.
- **Acceptance (deterministic gate):** `deno test -A scripts/maintenance_scan_buckets_test.ts` — partition across agent descriptions (1–16 exactly once, disjoint) + per-agent read-only confinement + self-containment (embedded `### Cat <n>` blocks, zero skill-file/payload references) + removal of the legacy template and both detail files + SKILL.md decoupling. An LLM agent benchmark was rejected: the harness lets the model substitute a generic `Explore` subagent for the named agent, so a green verdict would not depend on the agent definition.
  Evidence: `scripts/maintenance_scan_buckets_test.ts`.
- **Acceptance verified by acceptance tests:** `maintenance-basic`, `maintenance-surfaces-severity-tags`, `maintenance-severity-calibration-no-inflation` (parity — no behavioral regression; deferred full sweep).
- **Status:** [ ]

### FR-MAINT-SEVERITY: Severity Scoring for Maintenance Findings [ANC:fr:maint-severity]

- **Description:** The `maintenance` skill must grade every finding it surfaces with one of four severity tiers (`Critical | High | Medium | Low`) calibrated by a per-category rubric. The Resolution Phase summary carries the tag inline (`- [N] [Severity] <site>: <problem>. (Fix: <fix>)`), the closing counter reports per-severity totals alongside per-category totals, and the "how to proceed" prompt accepts severity tokens (`critical`, `high`, `medium`, `low`) including plus-separated compounds (`critical+high`) as a filter on the resolution loop. The rubric lives in `framework/core/skills/maintenance/references/severity-rubric.md` and enforces an anti-inflation tie-breaker rule ("when in doubt, pick the lower tier"); the Verify Findings gate (SKILL.md Step 17.5) quotes the rubric anchor that justifies the chosen tier.
- **Tasks:** [maintenance-severity-scoring](tasks/2026/06/maintenance-severity-scoring.md)
- **Scope:**
  - Every finding line (except `[verified false]` drops from the gate) carries exactly one severity tag immediately after the bracketed number and before the site path.
  - Per-severity counters appear in the closing total line.
  - Reply tokens `critical`, `high`, `medium`, `low` and plus-separated compounds (`critical+high`, `high+medium`, …) are accepted case-insensitively in the "how to proceed" prompt and filter the per-finding loop to matching findings only.
  - Severity tags stay literal English even when the surrounding report is in another language (same reasoning as the existing `Documentation Health` label rule).
  - Critical share of any single sweep must stay within 35 % of total findings under the rubric.
- **Acceptance verified by acceptance tests:** `maintenance-surfaces-severity-tags`, `maintenance-severity-filter-critical-high`, `maintenance-severity-calibration-no-inflation`.
- **Status:** [x]

### FR-ONBOARD: Developer Onboarding & Workflow Clarity [ANC:fr:onboard]

- **Description:** The project's `README.md` must provide clear, actionable instructions for developers on when and how to use the available tools.
- **Use case scenario:** A new developer joins the project and reads the `README.md` to understand the workflow for starting the project, implementing a task, and performing periodic maintenance.
- **Acceptance criteria:**
  - [x] Instructions for project initialization and environment verification.
  - [x] Step-by-step workflow for task implementation (Plan -> Execute -> Verify -> Commit).
  - [x] Schedule for periodic maintenance (Health Check, Docs Audit, Agent Updates).
  - [x] Guidance for specific cases (Investigate, Answer, Engineer).

### FR-ACCEPT: Benchmarking [ANC:fr:accept]

- **Description:** Evidence-based acceptance testing system to evaluate agent skill execution quality. `deno task acceptance-tests`.
- **Key capabilities:** Isolated sandbox execution over the ACP transport (`AcpAgent`), LLM-based Judge, evidence collection, interactive flows (`UserEmulator`), cost/token tracking, HTML tracing, parallel execution protection.
- **Architecture:** Co-located scenarios (`framework/<pack>/skills/<skill>/acceptance-tests/` and `framework/<pack>/commands/<command>/acceptance-tests/`), pack-level scenarios (`framework/<pack>/acceptance-tests/`), pack-scoped sandbox, Claude CLI judge (`cliChatCompletion`), mandatory `agentsTemplateVars` (compile-time enforced).
- **Implementation:** `scripts/acceptance-tests/lib/` (runner, judge, `acp/` transport, user_emulator, trace, types, utils).

### FR-ACCEPT-ISOLATION: Sandbox Isolation From User-Level Skills [ANC:fr:accept-isolation]

- **Desc:** `deno task acceptance-tests` MUST judge the sandbox `SKILL.md` (the one written into `<sandbox>/.claude/skills/<name>/`), not the developer's user-level installation at `~/.claude/skills/<name>/`. Without this, framework-source `SKILL.md` edits never reach the model: Claude Code's Skill tool resolves user-level over project-level on collision, so any DIFF skill silently delivers stale text and the Acceptance Test TDD RED→GREEN cycle produces no observable change.
- **Tasks:** [migrate-acceptance-to-acp](tasks/2026/06/migrate-acceptance-to-acp.md)
- **Scenario:** A contributor edits `framework/<pack>/skills/<name>/SKILL.md` and runs `deno task acceptance-tests -f <name>`. The model must load the edited body, not whatever the user happened to install via `flowai sync` weeks ago. Constraint: the acceptance-tests runner MUST NOT modify, move, symlink, or delete `~/.claude/skills/`.
- **Mechanism (Claude only, ACP transport):** `prepareAcpClaudeHome(<sandbox>)` (`scripts/acceptance-tests/lib/acp/auth.ts`, the single owner since the direct `ClaudeAdapter` was retired) builds an isolated `$HOME = <workDir>/bench-home/` (sibling of the sandbox; deliberately outside the sandbox cwd so `git status` does not see it as untracked) containing an empty `.claude/skills/` (so user-level resolution finds nothing) plus targeted symlinks back to the real `$HOME` for OAuth/Keychain auth (`Library/Keychains`) and the versioned launcher binary (`.local/share/claude`). `.credentials.json` is intentionally NOT mirrored — letting Keychain win avoids stale-refresh-token 400s. The Claude profile wires this via `prepareWorkspace`; Cursor, Codex, and OpenCode profiles leave it unset (no analogous Skill tool resolution path exists).
- **Mechanism (client-side filesystem, all IDEs):** ACP lets the agent delegate reads and writes to the client (`fs/read_text_file`, `fs/write_text_file`). The spec calls those paths absolute, but `claude-code-acp` forwards the model's `file_path` verbatim, so a relative one arrives as-is and `Deno.{read,write}TextFile` resolves it against the RUNNER's cwd — this repository. `AcpClient` therefore anchors every client-fs path to the session cwd (`resolveSessionPath`) and confines writes to the sandbox subtree (`confineWritePath`), failing loudly on an escape. Observed 2026-08-13: a `plan-writes-task-new-frontmatter` sandbox wrote `documents/tasks/2026/08/add-healthz-endpoint.md` into the real tree, other runs read and rewrote the real `.github/workflows/ci.yml`, `documents/index.md` and two `scripts/check-*.ts` (stripping SALP anchors), and a write over the real `documents/requirements.md` was attempted and missed by luck.
- **Mechanism (cross-run visibility, all IDEs):** the sandbox lives in an EXTERNAL root (`externalSandboxRoot` / `linkIntoRunDir`, `scripts/benchmark/sandbox_root.ts`, shared with the SWE-bench arm), not under `acceptance-tests/runs/<ts>/<scenario>/run-N/`; the run dir keeps `sandbox` / `bench-home` symlinks so post-run analysis paths are unchanged. Under the run dir every concurrent run shares a grandparent, and one `ls ..` reaches the neighbours. Observed 2026-08-15: a `reflect` run hunting for its own session history walked up from its bench-home, read run-1's and run-2's transcripts and git logs, and reported their outcome among its findings as a recurring pattern of the session under test. `scripts/benchmark/sandbox_root.ts` is in `whitelistedCrossPackageFiles` so the cache key tracks it.
- **Acceptance:**
  - [x] The run-dir `sandbox` is a symlink resolving OUTSIDE the run dir, so a concurrent run is not reachable by walking up.
    Evidence: `scripts/acceptance-tests/lib/runner_test.ts::Runner - Fixture Copying`.
  - [x] Bench-home `.claude/skills/` is created empty AND `~/.claude/skills/` snapshot is byte-identical before/after (sandbox skills win, user-level untouched).
    Evidence: `scripts/acceptance-tests/lib/acp/auth_test.ts::sandbox skills win and user-level skills dir untouched`.
  - [x] Auth-related symlinks track host: present iff source path exists on host (`Library/Keychains`, `.local/share/claude`).
    Evidence: `scripts/acceptance-tests/lib/acp/auth_test.ts::auth-related symlinks track host: present iff source exists`.
  - [x] `.credentials.json` is never mirrored into `<workDir>/bench-home/.claude/`.
    Evidence: `scripts/acceptance-tests/lib/acp/auth_test.ts::never mirrors .credentials.json into bench-home`.
  - [x] Cache key invalidates on any change inside `scripts/acceptance-tests/lib/` (incl. `acp/` + `adapters/`), so old cached verdicts cannot mask the fix on first post-merge run.
    Evidence: `scripts/acceptance-tests/lib/cache_test.ts::isolation-key-change: cache key tracks adapter directory contents`.
  - [x] `AgentAdapter.prepareWorkspace` is optional in the data-only profile; runner only invokes it when the profile sets it (Cursor/Codex/OpenCode pass through unchanged).
    Evidence: `scripts/acceptance-tests/lib/runner.ts` (`adapter.prepareWorkspace ? ... : {}`); `scripts/acceptance-tests/lib/adapters/types.ts` (declared optional).
  - [x] A relative client-fs path is anchored to the session sandbox, never to the runner's cwd.
    Evidence: `scripts/acceptance-tests/lib/acp/client_test.ts::resolveSessionPath anchors a relative client-fs path to the sandbox, not the runner cwd`.
  - [x] A client-fs write resolving outside the sandbox fails loudly instead of touching the developer's tree.
    Evidence: `scripts/acceptance-tests/lib/acp/client_test.ts::confineWritePath rejects a write that escapes the sandbox`.
- **Non-acceptance (explicit trade-offs):**
  - macOS-first: the symlink set targets macOS auth (Keychain). On Linux/CI without `~/Library/Keychains`, those symlinks are skipped — auth then relies on whatever Linux mechanism the developer has set up. CI workflows that already export `ANTHROPIC_API_KEY` are unaffected.
  - First post-merge run pays ~120 fresh executions: the cache key changes (adapter source touched), invalidating the prior `[CACHED]` verdicts.
  - **Container-based isolation is incompatible with subscription auth.** The reason this scheme works silently is a chain that exists ONLY on the macOS host: (1) the Claude Pro/Max OAuth token lives in macOS Keychain, not on disk; (2) the keychain item carries an ACL granting "Always Allow" to the `claude` binary by code-signing identity; (3) the bench reuses the SAME signed binary with `HOME=<bench-home>` whose `Library/Keychains` symlinks back to the host DB → kernel matches code signature → token released without prompts. None of these hold inside a Linux container: no Keychain Services API, the Linux `claude` binary expects `~/.claude/.credentials.json` (file not present on macOS hosts), and extracting the token to a file requires a one-time interactive Keychain approval of the `security` CLI. A previous Docker isolation attempt (commit `ce1d4c1`, removed in `9e30ab7`) was abandoned for this reason — there is no path to subscription-auth inside a container without a manual approval step. Resource isolation is therefore handled in userspace on the host instead — see FR-ACCEPT-GUARDS.
- **Open (follow-up):**
  - [ ] `~/.local/share/claude/versions/<v>/` PID-lock contention under parallel scenarios is a pre-existing concern — not introduced by isolation, but worth a separate fix.

### FR-ACCEPT-GUARDS: Resource Guards For Spawned Agents [ANC:fr:accept-guards]

- **Desc:** `AcpAgent` MUST defend the host against two failure modes observed on 2026-05-09 that escalated to multi-reboot system hangs: (1) **fork-loop** — a benchmarked skill recursively spawns subprocesses (incident at 02:43: a `configure-deno-commands` scenario produced a `deno test -A` chain that grew to ~720 descendants in 90 s); (2) **bloat-OOM** — a single agent process leaks/holds memory until the kernel VM compressor saturates (incident at 07:50: `compressor_size = 7.18 GiB`, `compression_ratio = 14`, kernel found "no eligible processes" to jetsam, `SystemUIServer` froze in TCC checks, host hung until forced reboot at 08:53). Container-based isolation is unavailable (see FR-ACCEPT-ISOLATION trade-offs), so guards run in userspace on the host.
- **Scenario:** A bench scenario triggers either (a) a runaway shell command that forks recursively or (b) a long-context turn that pushes the agent's V8 heap past available RAM. The guard MUST kill the agent's entire process tree (root PID + all descendants) and proceed to the judge with an `exit_code_zero` failure verdict, instead of letting the kernel hang the host. A pre-flight check MUST refuse to spawn the next agent when the host is already under enough pressure that the next spawn risks the same compressor-shortage state.
- **Mechanism (`scripts/acceptance-tests/lib/process_watchdog.ts` + `system_health.ts` + `setpgrp_exec.py`):**
  - **Process-group isolation**: every spawn is wrapped in `python3 setpgrp_exec.py <agent> <args>`. The wrapper calls `os.setsid()` then `os.execvp()`, making the agent the leader of a new process group whose PGID equals the agent's PID. All descendants inherit the PGID — even after re-parenting to PID 1 when an intermediate parent dies. Required because the prior PPID-walk approach killed only direct descendants; orphaned grandchildren kept forking and ultimately required a host reboot on 2026-05-09 12:12.
  - **Fork-loop guard**: poll `pgrep -g <pgid>` for group members (orphans included). When `members.length - 1 > BENCH_MAX_DESCENDANTS` (default 5) for `BENCH_WATCHDOG_CONFIRM` (default 2) consecutive samples → `/bin/kill -TERM -- -<pgid>`, wait `graceMs` (default 1500, cancellable via AbortController), `/bin/kill -KILL -- -<pgid>`. Trip cause = `"fork-loop"`.
  - **RSS-bloat guard**: same poll loop, additionally read `ps -o pid=,rss=` for the group, sum bytes. When sum > `BENCH_MAX_RSS_GB` × 1 GiB (default 6 GiB) for `BENCH_WATCHDOG_CONFIRM` consecutive samples → same group-kill sequence. Trip cause = `"rss-bloat"`. Required because `setrlimit RLIMIT_AS / RLIMIT_DATA` is useless against V8-based agents on macOS — V8 over-reserves virtual address space (~485 GiB VSZ at 95 MiB RSS observed for `claude`), so any `-v` cap small enough to constrain RSS will also clip the V8 reservation and crash the binary at startup; `RLIMIT_RSS` exists in shell but the kernel does not enforce it on macOS or Linux.
  - **Pre-flight system-health gate**: before each `cmd.spawn()` the agent calls `assertHealthy()`. Reads `vm_stat` + `sysctl vm.swapusage` + `sysctl vm.loadavg` + `sysctl hw.ncpu`. Throws `SystemUnhealthyError` when either: (a) **effective memory headroom** = `availableRAM + freeSwap × BENCH_SWAP_DISCOUNT` (default 0.3) falls below `BENCH_MIN_HEADROOM_MB` (default 2048) MB; or (b) 1-min load avg per CPU > `BENCH_MAX_LOAD_PER_CPU` (default 4). The combined-headroom metric replaces the earlier independent-threshold scheme (`BENCH_MIN_FREE_PCT` + `BENCH_MAX_SWAP_PCT`) which over-aborted when one axis was tight but the other had ample slack. Caught in `start()`, surfaced as exit code 75 (`EX_TEMPFAIL`). Linux returns a neutral snapshot and never trips. **No env-var escape hatch**: thresholds may be tuned, but the gate cannot be disabled — to bypass, free resources or hand off to a healthier host.
- **Acceptance:**
  - [x] Fork-loop trip kills entire process group, INCLUDING orphans that re-parented to PID 1 after their immediate parent died.
    Evidence: `deno test -A scripts/acceptance-tests/lib/process_watchdog_test.ts --filter "trips on fork-loop"`.
  - [x] RSS-bloat trip kills the entire process group when group RSS exceeds the threshold.
    Evidence: `deno test -A scripts/acceptance-tests/lib/process_watchdog_test.ts --filter "rss-bloat"`.
  - [ ] Pre-flight health snapshot is logged in every run's `judge-evidence.md` (`[health] available … MB (…%), compressor … MB, swap …/… MB (…%), load1 … on … CPU (…/CPU)`).
    Evidence: `grep -h '\[health\]' acceptance-tests/runs/latest/*/run-*/judge-evidence.md`.
  - [x] When `assertHealthy` throws, `AcpAgent.run` catches `SystemUnhealthyError`, logs `[health] aborting spawn: ...`, and surfaces exit code 75 without spawning.
    Evidence: `deno test -A scripts/acceptance-tests/lib/system_health_test.ts` (covers threshold-trip path).
  - [ ] Watchdog publishes the `trip` object BEFORE killing (so consumers reading `watchdog.trip()` after `child.status` resolves on SIGTERM see the verdict, not `null`).
    Evidence: `process_watchdog.ts:tripNow` sets `trip` before awaiting `killTree`.
- **Non-acceptance (explicit trade-offs):**
  - Userspace, not kernel-enforced. Sub-`intervalMs` (default 2000) reaction window: a fork bomb that produces 1000+ children in < 4 s can still cause a brief CPU spike before the second confirm sample fires. Acceptable because the host stays alive and the watchdog catches the next sample.
  - Per-agent guards do not cap the AGGREGATE across N parallel agents. If `task-bench.ts` ever spawns concurrent scenarios, each agent's 6 GiB cap multiplies → an N-agent run can consume `N × 6` GiB before any individual trip. Not addressed in this FR; if/when concurrency lands, add an aggregate accumulator in the runner orchestrator.
  - `assertHealthy` is macOS-only (Linux returns neutral). Linux/CI runs rely on the kernel's own OOM-killer.
  - Setting `BENCH_MAX_RSS_GB` too low (< ~1.5 GiB for `claude`) will trip during normal long-context turns. Default 6 GiB is calibrated against observed peaks; lower with care.
- **Deferred (not blocking — root cause fixed in `configure-deno-commands` SKILL.md rules 13–14, which prevents the agent from generating the fork-bomb pattern at source; userspace guards remain as defense-in-depth):**
  - Aggregate RSS accumulator across all live `AcpAgent` instances. Activate only when `task-bench.ts` adds concurrent scenario execution; current runner is sequential.
  - End-to-end re-validation on a low-memory host with the original fork-loop scenario re-introduced. Verified indirectly on 2026-05-09: re-ran `configure-deno-commands-trigger-pos-{1,2,3}` (the `-2`/`-3` scenarios were later consolidated into `-1` on 2026-05-10), `-basic`, `setup-ai-ide-devcontainer-{deno-claude,feature-discovery}` after the SKILL.md fix — six previously-dangerous scenarios passed without tripping the watchdog and without measurable swap pressure.

### FR-ACCEPT-CACHE: Acceptance Test Result Cache [ANC:fr:accept-cache]

- **Desc:** Commit per-scenario acceptance test verdicts to the repo; re-run only when a cache-key input changes. Makes `deno task acceptance-tests` an incremental operation.
- **Scenario:** Contributor runs `deno task acceptance-tests`; unchanged scenarios hit the cache and return instantly with zero LLM calls. A touched primitive or fixture forces re-execution. `--cache-check` is a CI gate that fails when the cache is stale.
- **Acceptance:**
  - [x] Cache files live under `acceptance-tests/cache/<pack>/<scenario-id>/<ide>.json`, LOCAL and gitignored since 2026-08-04. They were tracked until then, on the theory that a fresh clone would inherit verdicts; measured on 307 committed entries, `acceptance-tests --cache-check` returned 0 hits and 313 misses. The key hashes the whole runner (`scripts/acceptance-tests/lib/**`) plus the IDE `--version`, so one harness commit (`202a7bb3`, 2026-07-28) invalidated every entry recorded up to 2026-07-05 at once. The cache keeps its purpose — incremental re-runs between edits on one machine — but it cannot survive the trip through git, so committing it bought 458 KB of permanently stale files. Consequence, stated: a fresh clone starts cold, and `check-fr-coverage.ts` finds no verdicts until the sweep runs locally.
  - [x] Cache hit: no agent/judge CLI is invoked; `runScenario` is skipped entirely.
  - [x] Cache key covers: scenario `mod.ts` + `fixture/`, primitive directory (excluding `benchmarks/`), `framework/<pack>/pack.yaml`, `framework/core/assets/AGENTS.template.md`, `scripts/acceptance-tests/lib/**`, `scripts/task-bench.ts`, `cli/src/transform.ts`, `cli/src/sync.ts`, `scripts/utils.ts`, full `acceptance-tests/config.json`, CLI args (`ide`, `agentModel`, `runs`), and best-effort `<cli> --version`.
  - [x] Flags `--no-cache`, `--refresh-cache`, `--cache-check`, `--cache-with-runs` parsed in `scripts/task-bench.ts` and documented in `--help`. First three are mutually exclusive (enforced at arg-parse time).
  - [x] Failed runs never write cache (prevents freezing broken scenarios at green).
  - [x] Skipped scenarios (`scenario.skip` set) bypass cache entirely.
  - [x] Judge `reason` strings are truncated to 200 characters with a trailing `…` marker.
  - [x] IDE CLI version probe fails open: timeout / missing binary / non-zero exit all yield `""` without crashing.
  - [x] Cache-key algorithm documented in `scripts/acceptance-tests/lib/cache.ts` module docstring.
  - [x] Drift guard: `cache_test.ts` parses `scripts/acceptance-tests/lib/**` imports and asserts every escaping import is whitelisted in `cache.ts`.
- **Non-acceptance (explicit trade-offs):**
  - RED-phase cost: the first failing scenario re-runs on every invocation until GREEN (no `--cache-failures` flag). Use `--no-cache` during tight RED/GREEN iteration if needed.
  - Judge drift invisibility: the LLM judge is non-deterministic; cache stores the first green verdict and does not re-validate it. Use `--no-cache` or a scheduled full sweep as a sanity probe.
  - Cold-start cost: first run on a fresh clone is a full sweep; a maintainer commits the warmed `acceptance-tests/cache/` once.
- **Open (follow-up):**
  - [ ] CI step `deno task acceptance-tests --cache-check` that fails a PR when a primitive was touched without refreshing the cache.

### FR-ACCEPT.RULES: AGENTS.md Rules Benchmarks [ANC:fr:accept.rules]

- **Description:** Pack-level acceptance tests (`framework/core/acceptance-tests/agents-rules-*/`) that verify agents follow AGENTS.md template rules on a real project fixture (ai-skel-ts). Template stored at `framework/core/assets/AGENTS.template.md`.
- **Acceptance verified by acceptance tests:**
  - [x] `agents-rules-tdd-cycle` — TDD RED→GREEN→REFACTOR→CHECK
  - [x] `agents-rules-fail-fast` — no stubs, fix source not test, stop on missing config
  - [x] `agents-rules-stop-analysis` — 5-WHY, STOP on unfixable problem
  - [x] `agents-rules-contradictions` — contradiction detection, ask and stop
  - [x] `agents-rules-functionality-preservation` — run tests before/after refactoring
  - [x] `agents-rules-evidence-claims` — read code before fixing, cite evidence
  - [x] `agents-rules-traceability-placement` — code evidence in code (`// FR-<ID>`), not in SRS; non-code evidence in SRS
  - [x] `agents-rules-forward-motion` — once user authorizes a multi-step plan, agent executes without re-confirming each step
- **Open (not yet implemented):**
  - [ ] `agents-rules-variant-analysis` — propose variants with pros/cons before coding
  - [ ] `agents-rules-proactive-resolution` — find answers in codebase, don't ask user
  - [ ] `agents-rules-no-silent-fallbacks` — don't add defaults/fallbacks without asking
  - [ ] `agents-rules-run-all-tests` — run full test suite, not just changed files

### FR-ACCEPT.TRIGGER: Skill Description-Matching Verification [ANC:fr:accept.trigger]

- **Desc:** Every skill in `framework/<pack>/skills/` MUST have 3 trigger scenarios verifying description-matching correctness: 1 positive (skill should activate), 1 adjacent-negative (a different skill is the right match), 1 false-use-negative (query is in the skill's domain but the wrong intent for it). Catches regressions where a description rewrite makes the skill invisible to the model (false negative) or over-triggered (false positive).
- **Tasks:** [remove-flowai-prefix-from-primitives](tasks/2026/05/remove-flowai-prefix-from-primitives.md), [rewrite-skill-descriptions](tasks/2026/06/rewrite-skill-descriptions.md)
- **Scope:** Only `framework/<pack>/skills/`. Commands (`framework/<pack>/commands/`) carry `disable-model-invocation: true` (injected at sync) and are triggered by explicit `/name` — out of scope.
- **Shape:** Regular `AcceptanceTestScenario` with one `userQuery` and one critical checklist item (`skill_invoked` / `skill_not_invoked`) scored DETERMINISTICALLY from the captured tool-call trace — NOT by the LLM judge. The judge is skipped entirely for a trigger scenario (its only item is deterministic).
- **Layout:** Sibling folders inside the skill's existing `acceptance-tests/`:
  - `trigger-pos-1/mod.ts` — query the skill SHOULD activate on
  - `trigger-adj-1/mod.ts` — query an ADJACENT skill is correct for; this skill should stand down
  - `trigger-false-1/mod.ts` — query in this skill's domain but wrong intent (e.g., asking *about* the skill, not asking *to do* the skill's job)
- **Naming:** Scenario `id` follows `<skill-id>-trigger-<pos|adj|false>-1`; directory name matches the scenario id's tail (`trigger-<type>-1`). The trailing `-1` is preserved for backward compatibility with existing scenario ids and trace tooling, but only `n=1` is permitted.
- **Checklist contract (deterministic):**
  - Positives: id `skill_invoked`, critical: true — `detectSkillInvocation` (`scripts/acceptance-tests/lib/skill_invocation.ts`) confirms the captured trace contains an explicit Skill-tool call naming the target skill. A bare `SKILL.md` read does NOT count (Explore subagents read skill files while mapping a project — a false positive on `skill_not_invoked`).
  - Negatives (adjacent + false): id `skill_not_invoked`, critical: true — `detectSkillInvocation` confirms NO such tool call / `SKILL.md` read for the target skill.
  - Tool calls are captured by `AcpClient` (`tool_call` / `tool_call_update` notifications) and exposed via `AcpAgent.getToolCalls()`; `runner.ts::judgeAndScore` injects the verdict and removes these ids from the judge checklist (`DETERMINISTIC_SKILL_CHECK_IDS`).
- **Host built-in collision:** the sandbox cannot be rid of a skill the IDE itself ships (Claude Code's built-in `code-review` competes with framework `review` and is absent from both `<sandbox>/.claude` and `bench-home`). A scenario MAY declare `equivalentSkills: [<name>]`; `detectSkillInvocation` then accepts any declared name and the verdict string names the alternatives, so a pass earned by a built-in stays visible as such. Declare it ONLY for a genuine host built-in — it weakens the assertion to "a skill of this kind ran" and must never be used to quiet a routing defect in our own description. Used by `review-trigger-adj-1` (`["code-review"]`, after a 5-run series split 4/5 on that collision).
- **Cross-pack adjacency:** the runner mounts `core` + the scenario's pack; an adjacent-negative scenario whose correct neighbour lives in a third pack sets `extraPacks: [<pack>]` so that skill is installed and the agent can defer to it (else it is forced to over-trigger). Used by `setup-ai-ide-devcontainer-trigger-adj-1` and `engineer-ai-ide-plugin-trigger-adj-1`.
- **Enforcement:** `scripts/check-trigger-coverage.ts` fails `deno task check` on missing/misnamed scenarios. Stray `trigger-{pos,adj,false}-{2,3,...}` directories are reported as misnamed (the previous 3+3+3 layout was reduced to 1+1+1 on 2026-05-10; see `documents/tasks/2026/05/trigger-n1-retry.md`).
- **Cost note:** Full sweep adds N×3 scenarios to `deno task bench` (was N×9). The result cache (FR-ACCEPT-CACHE) absorbs unchanged scenarios; refreshes are scoped to skill-description edits.
- **Retry:** Agent-level retry on result is intentionally NOT performed — re-running a "skill not invoked" scenario until it passes would mask real description regressions. With deterministic scoring the only residual variance is the agent's own invocation choice (no judge noise). Suspected agent variance is investigated by manual re-run (`deno task acceptance-tests -f <scenario-id>`); if empirical flake rate at N=1 proves > 5% per scenario, add a scenario-level `retryOnFail` field as a separate FR.
- **Acceptance verified by acceptance tests:** every `framework/*/skills/*/acceptance-tests/trigger-{pos,adj,false}-1/mod.ts` (verified by `scripts/check-trigger-coverage.ts`).
- **Acceptance:** `deno test scripts/check-trigger-coverage_test.ts` passes; `find framework -type d -path '*/skills/*/acceptance-tests/trigger-*' | wc -l` equals (skill count) × 3; `deno test -A scripts/acceptance-tests/lib/skill_invocation_test.ts` covers the `equivalentSkills` acceptance path (`detectSkillInvocation: a declared equivalent satisfies the check` and the three cases bounding it).
- **Status:** [x]

### FR-DESC-QUALITY: Skill Description WHEN-Trigger Gate [ANC:fr:desc-quality]

- **Desc:** Every agent-invocable `framework/<pack>/skills/<name>/SKILL.md` `description` MUST carry a WHAT (what the skill does) AND a WHEN-trigger phrase (when to invoke it) — the description is the only signal the model classifier uses to discover the skill. A deterministic gate (`scripts/check-skills.ts`) fails `deno task check` when a `skills/` description lacks a recognized WHEN-trigger phrase. Commands (`framework/<pack>/commands/`) are user-invoked via explicit `/name` (no model auto-discovery) and are EXEMPT.
- **Tasks:** [rewrite-skill-descriptions](tasks/2026/06/rewrite-skill-descriptions.md)
- **Scope:** `framework/*/skills/*` only. Composites/atoms reach `skills/` as rendered build artefacts — they are gated on the rendered output; fixes go to the atom/composite source, never the gitignored SKILL.md.
- **Allowlist:** case-insensitive substrings — `use when`, `use this`, `use for`, `use to`, `use after`, `use proactively`, `use on`, `triggers on`, `used when`, `should be used when`, `when the user`, `when you need` (single source of truth: `WHEN_TRIGGER_PHRASES` in `scripts/check-skills.ts`).
- **Quality-proxy caveat:** the gate checks WHEN-phrase *presence*, NOT description *quality*. Description quality (specificity, third person, no "How to X"/"Helps with X" lazy forms) stays reviewer-judged and is additionally enforced product-side by engineer-skill (its bundled `validate_skill.ts` deterministic floor + the SKILL.md Phase 4 self-review rubric).
- **Acceptance:** `deno test scripts/check-skills_test.ts` passes (incl. the WHEN-trigger cases) AND `deno test framework/devtools/skills/engineer-skill/scripts/skill_scripts_test.ts` passes (engineer-skill validator floor) AND `deno task acceptance-tests -f engineer-skill-basic` green (Phase 4 behavioral gate — manual — korchasa; PASSED 2026-06-27).
- **Status:** [x]

### FR-ACCEPT.OPENCODE: OpenCode Adapter for Acceptance Test Runner [ANC:fr:accept.opencode]

- **Desc (original requirement — SUPERSEDED, retained for history):** The runner was to ship a hand-written `OpencodeAdapter` implementing the full per-IDE `AgentAdapter` interface (buildArgs/parseOutput/setupMocks/…) for the `opencode` CLI, restoring 4-IDE parity (Cursor, Claude Code, OpenCode, Codex). This bespoke-adapter approach was abandoned: FR-ACCEPT.ACP replaces all four per-IDE adapter classes with a single ACP client + data-only registry, so OpenCode parity is now achieved by the `ACP_AGENTS.opencode` registry row (`opencode acp`), not a class.
- **Tasks:** [opencode-acceptance-adapter](tasks/2026/06/opencode-acceptance-adapter.md)
- **Scope:** Runner-side only. Plugin distribution to OpenCode (skill / agent emit, frontmatter transform) is covered by FR-DIST.* + `cli-internals.ts`.
- **Acceptance:** SUPERSEDED — see Status.
- **Status:** [x] SUPERSEDED by FR-ACCEPT.ACP (2026-06-21). OpenCode is reached through the ACP transport via a data-only registry row (`ACP_AGENTS.opencode`), not a hand-written `OpencodeAdapter`. The bespoke-adapter approach was abandoned with the direct-CLI deletion; no `opencode.ts` is shipped. Per-IDE green-gate for OpenCode tracked under FR-ACCEPT.ACP.

### FR-ACCEPT.ACP: ACP Transport for Acceptance Test Runner [ANC:fr:accept.acp]

- **Desc:** The acceptance-test runner replaces its per-IDE direct-CLI control layer (`SpawnedAgent` + four hand-written `AgentAdapter` classes, each re-parsing an IDE-specific `stream-json` dialect and mocking via IDE-specific hooks) with a single Agent Client Protocol (ACP — JSON-RPC 2.0 over stdio) client (`AcpClient`/`AcpAgent`) plus a data-only agent registry (`ACP_AGENTS`). Drivers: shrink the runner codebase, standardize on ACP, cut per-IDE adapter cost, onboard new IDEs faster. Agents reach ACP natively (Cursor, OpenCode), via a wrapper (`claude-code-acp` over the Claude Agent SDK), or an ACP server (Codex). Tool mocking is IDE-agnostic via PATH-shadowing (`mock_bin.ts`); FR-ACCEPT-GUARDS (setpgrp + watchdog) and FR-ACCEPT-ISOLATION (bench-home) are preserved. The direct-CLI adapters, `SpawnedAgent`, and the `stream-json` parse/format path are deleted — ACP is the only transport.
- **Tasks:** [migrate-acceptance-to-acp](tasks/2026/06/migrate-acceptance-to-acp.md)
- **Scope:** Runner-side only. Absorbs FR-ACCEPT.OPENCODE (OpenCode via ACP). Does NOT change plugin distribution (FR-DIST.*) or the parity-gate semantics — only the transport by which the bench drives an IDE agent.
- **Acceptance verified by acceptance tests:** `draw-mermaid-diagrams-sequence` (no-mock skill-load, green over ACP), `select-llm-model-fails-fast-no-fetch` (curl/wget mocked via PATH-shadow, green over ACP).
- **Acceptance (code):** `deno test -A scripts/acceptance-tests/lib/acp/` (client prompt-turn, auto-allow, error-mapping, mock_bin, auth-isolation), `scripts/acceptance-tests/lib/process_watchdog_test.ts::kills ACP wrapper child tree`, `scripts/acceptance-tests/lib/cache_test.ts::acp transport participates in cache key`; full `deno task check` green with no `stream-json` path remaining.
- **Acceptance — a dispatch's result reaches the trace even when the library refuses the frame:** `scripts/acceptance-tests/lib/acp/client_test.ts::a dispatch's return value survives a closing notification the schema refuses` (drives the real stub agent's `[[DISPATCH]]` shape: answer in `rawOutput` as a bare string, refused with `-32602`), plus `client_test.ts::flattenRawOutput reads content blocks handed over at the top level`.
- **Status:** [x] Claude proven green over ACP (transport + mocks + skill-load, subscription auth). Cursor/Codex/OpenCode carry registry launch specs (`cursor-agent --acp`, `codex acp`, `opencode acp`) exercised when those CLIs are installed/authed.

### FR-EXP: Experiments Subsystem (RELOCATED) [ANC:fr:exp]

- **Status:** Relocated to [`flowai-experiments`](https://github.com/korchasa/flowai-experiments) on 2026-04-11 (provenance SHA `f311142`). Requirement retained here as a stub so historical traceability links keep resolving.
- **Description:** Parameterized empirical studies of AI agent platforms (model × IDE × memory layout × workload). Distinct from regression acceptance tests (which stay in this repo). Results are committed numeric evidence, not pass/fail tests.
- **Rationale for split:** Experiments had zero runtime overlap with the framework product, inflated the `flow` clone with ever-growing committed results, and required live Claude CLI + macOS keychain auth that this repo's CI cannot provide.
- **Scope in `flow`:** This repo no longer contains experiment code, the `deno task experiment` entry point, or the `writeMemoryFile` / `getCleanroomEnv` / `MemoryScope` adapter extensions. The `AgentAdapter` contract returns to acceptance-test-only responsibilities.

### FR-EXP.MEMORY-LENGTH: AGENTS.md/CLAUDE.md Max Length Experiment (RELOCATED) [ANC:fr:exp.memory-length]

- **Status:** Relocated to [`flowai-experiments`](https://github.com/korchasa/flowai-experiments) on 2026-04-11 along with all `claude-md-length` variants and committed results. See `flowai-experiments:scripts/experiments/claude-md-length/README.md` for methodology, first-run headline numbers, and rerun instructions.

### FR-COMPONENT: Component Coverage [ANC:fr:component]

All 39 skills have at least one acceptance test scenario. Coverage is the source of truth: `find framework/*/acceptance-tests/*" | wc -l`. Agents (5 canonical definitions) are not tested individually via acceptance tests — they are exercised as subagents within skill acceptance tests.

### FR-INIT: Project Initialization [ANC:fr:init]

- **Description:** The `init` skill bootstraps AI agent understanding of a project by analyzing codebase, generating a single AGENTS.md file from the pack-level asset template, and scaffolding documentation (CLAUDE.md, SRS, SDS). Uses `generate_agents.ts` (Deno/TS, read-only) for project analysis. The AGENTS.md template is a pack-level asset (not a init scaffold) — its updates are tracked independently via `assets:` in `pack.yaml`. Legacy three-file layouts (`documents/AGENTS.md`, `scripts/AGENTS.md`) are detected and collapsed into the single root file during brownfield initialization.
- **Use case scenario:** User runs `/init` on existing or new project. Agent runs the analysis script, determines Greenfield vs Brownfield by its own judgment, interviews user (Greenfield) or reverse-engineers architecture (Brownfield), generates AGENTS.md, documentation (SRS, SDS, task file), and configures development commands.
- **Acceptance verified by acceptance tests:** `init-greenfield`, `init-brownfield`, `init-brownfield-update`, `init-brownfield-idempotent`, `init-vision-integration`, `init-claude-md-symlinks`
- **Infrastructure acceptance (code/scripts):**
  - [x] **FR-INIT.STACK Stack detection**: `generate_agents.ts` detects 6 stacks via marker files.
  - [x] **FR-INIT.TESTS Unit tests**: `generate_agents.test.ts` covers 8 scenarios.

### FR-DEV-SYNC: Multi-IDE Dev Resource Distribution [ANC:fr:dev-sync]

- **Description:** Dev resources (skills, agents, scripts) in `.claude/` are generated by `deno task sync-local` from `framework/` directly. NOT tracked in git. Auto-synced via SessionStart (bootstrap) and SessionEnd (persist changes) hooks.
- **Use case scenario:** Developer clones project. SessionStart hook detects empty `.claude/skills/` and runs `deno task sync-local` to populate from `framework/`. Changes to `framework/` are re-synced on each SessionEnd.
- **Acceptance criteria:**
  - [x] `.claude/skills/`, `.claude/agents/`, `.claude/scripts/` gitignored.
  - [x] SessionStart hook bootstraps `.claude/` if empty.
  - [x] SessionEnd hook re-syncs `.claude/` from `framework/` after each session.
  - [x] `deno task sync-local` uses `LocalSource` (reads `framework/` on disk).
  - [x] `check-skills.ts` validates `.claude/skills/` (dev skills).

### FR-DIST: Global Framework Distribution — flowai [ANC:fr:dist]

- **Description:** `flowai` CLI tool (developed in the external [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) repo, published to JSR as `@korchasa/flowai`) syncs framework skills/agents into project-local IDE config dirs. Single command, no subcommands. Reads bundled framework data (no network dependency at runtime). The CLI repo pins a framework revision via `framework.lock` and consumes a SHA-256-verified `framework.tar.gz` released from this repo (FR-DIST.BUNDLE.PIN).
- **Tasks:** [extract-cli-to-separate-repo](tasks/2026/05/extract-cli-to-separate-repo.md), [simplify-update-boundaries](tasks/2026/05/simplify-update-boundaries.md), [remove-flowai-prefix-from-primitives](tasks/2026/05/remove-flowai-prefix-from-primitives.md)
- **Def/Abbr:** CLI = flowai, BundledSource = JSON artifact with all framework files baked at publish time.

#### FR-DIST.SYNC Sync Command (`flowai`) [ANC:fr:dist.sync]
- **Desc:** Single command `flowai` run in project dir. Reads bundled framework, syncs skills/agents to IDE config dirs. Supports project scope (default) and global scope (`--global`) — scope drives config path, IDE target path, asset split, hook merge, and scope-field filter (see FR-DIST.GLOBAL and FR-PACKS.SCOPE).
- **Scenario A (no config, interactive):** `flowai` without `.flowai.yaml` → interactive prompts (IDEs, packs) → generates `.flowai.yaml` → syncs.
- **Scenario A2 (no config, non-interactive):** `flowai -y` without `.flowai.yaml` → auto-detect IDEs, select all packs → generates `.flowai.yaml` with defaults → syncs.
- **Scenario B (with config):** `flowai` with `.flowai.yaml` → disclaimer → sync. Bundled files compared with local. Unchanged silently, locally modified → prompt.
- **Scenario C (global):** `flowai sync --global` → loads/creates `~/.flowai.yaml`, installs primitives into user-level IDE dirs, skips scaffolds and artifact diffs.
- **Scenario D (dry-run):** `flowai --dry-run` (or `-n`) prints the sync plan (including `Target dirs:` in global mode) but performs no writes; exits 0 regardless of plan size. No `.flowai.yaml` auto-generation under dry-run — user is told to rerun without the flag.
- **Acceptance:**
  - [x] Without `.flowai.yaml` → interactive config generation → sync.
  - [x] With `.flowai.yaml` → disclaimer → sync.
  - [x] Files read from `BundledSource` (bundled.json).
  - [x] Skills written to `{ide_dir}/skills/{name}/`.
  - [x] Agents transformed per-IDE via `transformAgent()`.
  - [x] Idempotent: safe on repeated runs.
  - [x] `--yes` / `-y` flag for non-interactive mode.
  - [x] `-y` without config → non-interactive config generation (auto-detect IDEs, all packs).
  - [x] Core-level assets (`framework/<pack>/assets/`) synced to `{ide_dir}/assets/`. Asset changes reported as `ASSETS UPDATED` in sync output with mapped project artifact paths (from `pack.yaml` `assets:` field).
  - [x] `--global` / `-g` flag switches scope to global; scope-aware filter excludes `scope: project-only` primitives in global mode and `scope: global-only` in project mode.
  - [x] `--dry-run` / `-n` flag skips all writes; plan still produced and rendered.
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] Exit code: `0` on success (no errors, or any dry-run), `1` when at least one write failed.
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] Truthful header: `flowai sync complete.` on success; `flowai sync FAILED: N error(s).` on errors (red when color enabled).
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] ERRORS rendered as final block (after ACTIONS REQUIRED / NO ACTIONS REQUIRED), not interleaved with success sections. Red when color enabled, plain otherwise (respects `NO_COLOR` and `Deno.stdout.isTerminal()`).
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] CREATED/UPDATED counters show `written/planned` when a subset of writes failed; failed items move to the ERRORS block and are hidden from the success list.
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] Global-mode plan preview includes `Target dirs:` listing resolved user-level base dirs (including Codex's `~/.agents/skills` split) before the confirmation prompt.
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).

#### FR-DIST.CONFIG Config Generation [ANC:fr:dist.config]
- **Desc:** Interactive `.flowai.yaml` creation when config missing. Path depends on scope: `<cwd>/.flowai.yaml` (project) or `~/.flowai.yaml` (global). Both files may coexist; project scope wins when both are present and no flag is passed.
- **Acceptance:**
  - [x] Prompts: IDEs (auto-detected), skills include/exclude, agents include/exclude.
  - [x] Reads available skills/agents from BundledSource.
  - [x] Writes valid `.flowai.yaml`.
  - [x] Global mode writes `~/.flowai.yaml`; project mode writes `<cwd>/.flowai.yaml`. When both exist and no flag is passed, project config wins.

#### FR-DIST.GLOBAL Scope Selection (Global / Local / Auto) [ANC:fr:dist.global]

- **Desc:** `flowai` / `flowai sync` select scope via one of three mutually exclusive flags: `--global` / `-g` (user-level install), `--local` / `-l` (project-local install), and `--auto` (default). In `--auto` the CLI prefers the project config when present and falls back to the global config, eliminating accidental project-local installs on top of an existing global setup. Scope drives every path resolution decision: config file location, IDE base dir per IDE, asset split (templates installed both modes; artifact diff project-only), scaffold sync (project-only), and hook merge path. Scope is also a filter key on the `scope:` frontmatter field of skills and commands (see FR-PACKS.SCOPE).
- **Tasks:** [claude-code-plugin-marketplace-pilot](tasks/2026/05/claude-code-plugin-marketplace-pilot.md)
- **Target paths per IDE** (see also SDS section 3.5):
  - Claude Code: `~/.claude/`
  - Cursor: `~/.cursor/`
  - OpenCode: `~/.config/opencode/`
  - Codex agents: `~/.codex/`
  - Codex skills: `~/.agents/skills/` (distinct from agents; Codex user-skill convention)
- **Auto-resolution priority** (applied only when `--auto` is active):
  1. `<cwd>/.flowai.yaml` exists → project scope.
  2. Otherwise `~/.flowai.yaml` exists → global scope (CLI prints `Using global config at ~/.flowai.yaml`).
  3. Neither exists → interactive prompt asking scope; in `-y` mode defaults to **global** (safer fallback for CI after initial setup).
- **Explicit flag semantics:**
  - `--global` / `-g` — force global; create `~/.flowai.yaml` if missing. Bypasses the auto-resolution ladder.
  - `--local` / `-l` — force project; create `<cwd>/.flowai.yaml` if missing. Required to opt a project into per-repo primitives when a global config already exists.
  - `--auto` — default; applies the resolution priority above.
  - `--global` + `--local` together → CLI exits with a non-zero error explaining the conflict.
- **`migrate` subcommand** accepts `--global` / `-g` and `--local` / `-l` (mutually exclusive, required to disambiguate target dirs).
- **IDE guard:** the "IDE context detected" guard ([cli.ts]) fires only when auto-resolution selects the project scope inside an IDE (`isInsideIDE()`); in global scope the guard is bypassed (user dirs are not project-cwd).
- **Asset split:** Template install (`assets/AGENTS.template.md` → `{ide}/assets/`) runs in **both** modes. Artifact sync (diff/merge `<cwd>/AGENTS.md` from template) runs in **project** mode only. Scaffolds (`.devcontainer/*`, SRS/SDS stubs) run in **project** mode only.
- **Hook merge:** In global mode the hook writer resolves `~/.claude/settings.json` (and equivalent per IDE). The existing manifest-based merge already preserves user hooks not tracked by flowai; path change is the only new behavior.
- **Coexistence:** `~/.flowai.yaml` and per-project `.flowai.yaml` may coexist. In `--auto`, project wins when both exist; explicit `--global`/`--local` flags always override.
- **Not in scope:** Auto-migration from project to global. (Native marketplace packaging — see FR-DIST.MARKETPLACE.)
- **Acceptance:**
  - [x] `--global` flag drives every scope-dependent path (config, IDE base, hooks, user_sync).
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] `--local` flag forces project scope even when `~/.flowai.yaml` exists.
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] `--auto` (default) resolves project→global→prompt per the priority ladder above.
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] `--global` + `--local` together surfaces an error and exits non-zero.
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] IDE guard bypassed when resolved scope is global.
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] Global mode installs templates to `{home}/.{ide}/assets/AGENTS.template.md`.
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] Global mode skips artifact sync and scaffolds (no `<cwd>/AGENTS.md` diff).
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] Hook writer resolves global path when scope=global.
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] Per-project mode unchanged when `<cwd>/.flowai.yaml` exists.
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] `user_sync` scans user-level dirs under global scope.
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] `flowai migrate` requires explicit `--global` or `--local` (no auto-resolution).
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).

#### FR-DIST.MARKETPLACE Claude Code + Codex Plugin Marketplace [ANC:fr:dist.marketplace]

- **Desc:** **Preferred** native-plugin distribution channel for Claude Code and Codex users — on those IDEs the marketplace plugin is the recommended install path (native install, per-IDE update flow, no Deno toolchain required); the flowai CLI (FR-DIST.SYNC) remains a supported alternative there. The framework publishes a generated marketplace at downstream repo `korchasa/flowai-plugins`. Surface catalogs (`.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`) and plugin payloads are generated from `framework/<pack>/` by `scripts/build-plugins.ts` on every framework release (CI step inside the existing `release` job, gated on `framework-v*` tag publication). No plugin artefacts are committed to this repo (`dist/` is gitignored). Seven marketplace packs ship as separate plugins (`flowai`, `flowai-beta`, `flowai-deno`, `flowai-devtools`, `flowai-engineering`, `flowai-memex`, `flowai-typescript`). flowai CLI distribution (FR-DIST.SYNC) is the channel for Cursor / OpenCode, which have no plugin marketplace.
- **Tasks:** [claude-code-plugin-marketplace-pilot](tasks/2026/05/claude-code-plugin-marketplace-pilot.md), [codex-plugin-marketplace-support](tasks/2026/05/codex-plugin-marketplace-support.md), [remove-flowai-prefix-from-primitives](tasks/2026/05/remove-flowai-prefix-from-primitives.md), [local-marketplace-namespace](tasks/2026/05/local-marketplace-namespace.md)
- **Scenario:** A user on Claude Code runs `/plugin marketplace add korchasa/flowai-plugins` once, then `/plugin install flowai@flowai-plugins`. A user on Codex runs `codex plugin marketplace add korchasa/flowai-plugins`, then `codex plugin add flowai@flowai-plugins` (plus optional pack IDs). Codex writes the plugin payload cache plus `[plugins."<name>@flowai-plugins"] enabled = true` in `~/.codex/config.toml`; the next Codex thread loads installed packs. Skills become available under the installed plugin namespace. Short primitive names avoid duplicate branding (`/flowai:commit`, not `/flowai:flowai-commit`). Updates flow via each IDE's plugin update path tied to the downstream repo commit SHA, so one framework release maps to exactly one plugin update event.
- **Local install contract:** `deno task build-plugins` produces a local marketplace root at `./dist/claude-plugins`. Claude Code supports a one-session smoke via `claude --plugin-dir ./dist/claude-plugins/plugins/flowai` and persistent user install via `claude plugin marketplace add ./dist/claude-plugins` + `claude plugin install flowai@flowai-plugins --scope user`. Codex supports local marketplace registration via `codex plugin marketplace add ./dist/claude-plugins` plus per-pack activation via `codex plugin add <name>@flowai-plugins`; disabling a specific pack requires editing `[plugins."<name>@flowai-plugins"] enabled = false`.
- **Local refresh contract:** `deno task check` always runs `scripts/build-plugins.ts` + `scripts/validate-plugins.ts`. By default the build emits the upstream marketplace name `flowai-plugins` and `deno task check` does NOT touch the user's installed plugins. When `AUTO_INSTALL_PLUGINS=true` is set in env or `.env`, the build prerequisite is rerun with `--marketplace-name flowai-plugins-local` so the catalog the dogfood loop consumes carries the dogfood namespace, and `deno task check` additionally runs `scripts/sync-plugins-local.ts --no-build` as the last prerequisite. Framework developers who want their local edits installed without flipping the flag run `deno task sync-plugins-local` directly (`scripts/sync-plugins-local.ts`), which rebuilds `./dist/claude-plugins` in-process via `buildPlugins({ marketplaceName: "flowai-plugins-local" })`, then `claude plugin marketplace remove flowai-plugins-local` (best-effort) + `claude plugin marketplace add <absolute ./dist/claude-plugins>`, and for each plugin emitted by the local marketplace `claude plugin install <name>@flowai-plugins-local --scope user` unless that dogfood plugin was disabled at user scope before removal (disabled entries are skipped to preserve the user's mute choice). Codex: `codex plugin marketplace remove flowai-plugins-local` (best-effort) + `codex plugin marketplace add <absolute ./dist/claude-plugins>`, then `codex plugin add <name>@flowai-plugins-local` for every emitted pack to rebuild payload cache and mark new packs enabled; previously disabled dogfood packs keep `enabled = false` after installation. The upstream `flowai-plugins` marketplace registration and any `[plugins."x@flowai-plugins"]` Codex blocks are left byte-identical by the dogfood loop, so dogfood and downstream-tracking installs coexist side-by-side. Missing `claude` or `codex` CLIs are reported as warnings and skipped, not fatal. Reverting to upstream-only: `claude plugin marketplace remove flowai-plugins-local` (and the Codex equivalent) — the upstream `flowai-plugins` registration was never touched.
- **Build contract:** `scripts/build-plugins.ts` reads `framework/<pack>/{pack.yaml,commands,skills,agents,hooks}` and emits:
  - `<out>/.claude-plugin/marketplace.json` — catalog (top-level `name`, `owner`, `metadata.pluginRoot`, `plugins[]`).
  - `<out>/.agents/plugins/marketplace.json` — Codex catalog (top-level `name`, `interface.displayName` equal to the technical marketplace name, `plugins[]` with local `source.path: ./plugins/<name>` and install policy).
  - `<out>/plugins/<plugin>/.claude-plugin/plugin.json` — Claude manifest. Core emits `flowai`; optional packs emit `flowai-<pack>`. `version` mirrors upstream `deno.json`.
  - `<out>/plugins/<plugin>/.codex-plugin/plugin.json` — Codex manifest. Includes metadata, `skills: ./skills/`, optional `hooks: ./hooks/hooks.json` only when hooks exist. No `agents` component is declared because Codex plugin docs do not define it.
  - `<out>/plugins/<plugin>/skills/<stripped>/SKILL.md` (+ supporting subdirs except `acceptance-tests/`). `disable-model-invocation: true` injected on commands (source under `framework/<pack>/commands/`) and absent on skills (source under `framework/<pack>/skills/`). FR-PACKS.CMD-INVARIANT / SKILL-INVARIANT enforced fail-fast: any source SKILL.md that already carries the flag aborts the build with the offending path.
  - `<out>/plugins/<plugin>/agents/<name>.md` — frontmatter passed through the universal → Claude-native mapping from FR-DIST.MAPPING (keeps `name`, `description`, `tools`, `disallowedTools`, `model`, `effort`, `maxTurns`, `background`, `isolation`, `color`; drops `readonly`, `mode`, `opencode_tools`; resolves `model` tier `max|smart|fast|cheap` to the pair `opus/max|opus/high|sonnet/medium|sonnet/low` per FR-DIST.MAPPING, drops `inherit`).
  - `<out>/plugins/<plugin>/hooks/hooks.json` only when the source pack carries hooks. Hook commands keep `${CLAUDE_PLUGIN_ROOT}` because Claude Code requires it and Codex supports this compatibility variable. Codex users must enable `[features].plugin_hooks = true` before relying on hooks.
  - Output is byte-deterministic across runs.
- **Distribution contract:** CI step `Sync generated artefacts to downstream` checks out `korchasa/flowai-plugins` via deploy key `FLOWAI_PLUGINS_DEPLOY_KEY`, replaces every top-level entry except `README.md` / `LICENSE` / `.git`, commits as `release: framework-vX.Y.Z`, and force-pushes the matching tag. Idempotent across re-runs (`git diff --cached --quiet` short-circuits; `git tag -f` + `git push --force-with-lease` tolerates a re-shot tag).
- **Acceptance:**
  - [x] `scripts/build-plugins.ts` produces a deterministic shared plugin tree from `framework/core/`.
    Evidence: `deno test -A scripts/build-plugins_test.ts --filter 'byte-deterministic-rerun'`.
  - [x] Codex marketplace lists every emitted flowai plugin and points each entry at `./plugins/<plugin-name>`.
    Evidence: `scripts/build-plugins_test.ts::codex-marketplace emits-codex-marketplace-for-all-packs`.
  - [x] Codex plugin manifests include compatible metadata and component paths.
    Evidence: `scripts/build-plugins_test.ts::codex-plugin-manifests emits-codex-plugin-manifests`.
  - [x] Codex validator rejects malformed marketplace and manifest paths before publication.
    Evidence: `scripts/validate-plugins_test.ts::codex rejects-invalid-codex-marketplace` + `::codex rejects-invalid-codex-plugin-manifest`.
  - [x] Skill / command directory names have the `flowai-` prefix stripped.
    Evidence: `scripts/build-plugins_test.ts::skill-and-command-dirs-have-prefix-stripped`.
  - [x] `disable-model-invocation: true` injected for commands, absent for skills.
    Evidence: `scripts/build-plugins_test.ts::commands-get-disable-model-invocation-injected-skills-do-not`.
  - [x] Agent frontmatter transformed to Claude-native shape per FR-DIST.MAPPING.
    Evidence: `scripts/build-plugins_test.ts::agent-frontmatter-matches-claude-native-mapping` + `::emits-agents-with-claude-native-frontmatter`.
  - [x] Build fails fast on FR-PACKS.CMD-INVARIANT / SKILL-INVARIANT violations naming the offending file.
    Evidence: `scripts/build-plugins_test.ts::fails-fast-on-cmd-invariant-violation` + `::fails-fast-on-skill-invariant-violation`.
  - [x] Marketplace and plugin manifest schemas validate.
    Evidence: `scripts/build-plugins_test.ts::marketplace-and-plugin-json-schema-valid`; additionally `claude plugin validate ./dist/claude-plugins` and Codex install smoke (manual).
  - [x] CI step publishes to `korchasa/flowai-plugins` on each framework release. Idempotent across re-runs.
    Evidence: `gh api repos/korchasa/flowai-plugins/commits --jq '[.[] | select(.commit.message | startswith("release: framework-v"))] | length'` = 8 release commits through `framework-v0.13.0` (HEAD `5c300fb9`, 2026-05-24); tags `framework-v0.12.13`..`framework-v0.13.0` mirrored downstream.
  - [x] Downstream `README.md` and `LICENSE` survive every CI sync unchanged — the release bot never mutates them; maintainer hand-edits are allowed.
    Evidence: runnable — `for sha in $(gh api "repos/korchasa/flowai-plugins/commits?per_page=50" --jq '.[] | select(.commit.message | startswith("release: framework-v")) | .sha'); do gh api "repos/korchasa/flowai-plugins/commits/$sha" --jq '[.files[].filename] | map(select(. == "README.md" or . == "LICENSE")) | length'; done | sort -u` returns only `0`. Audited 2026-05-24: 8 release commits (`framework-v0.12.13`..`framework-v0.13.0`) by `flowai-release-bot`, zero touched README/LICENSE.
  - [x] Local install end-to-end is automated by `deno task check` with `AUTO_INSTALL_PLUGINS=true` (declared in `.env`): build-plugins (with `--marketplace-name flowai-plugins-local`) → validate-plugins → `sync-plugins-local --no-build` reinstalls every emitted pack into Claude Code at user scope under the `flowai-plugins-local` namespace.
    Evidence: `claude plugin list | grep -c '@flowai-plugins-local'` = `6` and every entry's `Version:` line equals `jq -r .version deno.json`.
  - [x] Codex local install end-to-end is automated by the same `deno task check` flow: `sync-plugins-local` re-adds the `flowai-plugins-local` marketplace at `dist/claude-plugins`, runs `codex plugin add <name>@flowai-plugins-local` for every emitted pack, and restores prior `enabled = false` dogfood choices while leaving any pre-existing upstream `[plugins."x@flowai-plugins"]` blocks untouched.
    Evidence: `codex plugin list | grep -c 'flowai.*@flowai-plugins-local.*installed, enabled'` = `6`.
  - [x] Local install docs distinguish Claude Code one-session smoke, Claude Code persistent local install, Codex local marketplace registration, and Codex per-plugin activation with `codex plugin add`.
    Evidence: README contains `claude --plugin-dir ./dist/claude-plugins/plugins/flowai`, `codex plugin marketplace add ./dist/claude-plugins`, and `codex plugin add flowai@flowai-plugins`.
  - [x] `deno task check` rebuilds and validates the plugin marketplace before parallel checks; by default it does not mutate user-installed plugins and emits the upstream `flowai-plugins` catalog. `deno task sync-plugins-local` is the explicit framework-developer entry point for installing the local build into Claude Code / Codex at user scope under the `flowai-plugins-local` namespace, and `AUTO_INSTALL_PLUGINS=true` opts `deno task check` into rebuilding with `--marketplace-name flowai-plugins-local` and then running that sync as an extra prerequisite.
    Evidence: `scripts/task-check_test.ts::buildCheckPlan: prerequisites build and validate plugin marketplace`, `scripts/task-check_test.ts::buildCheckPlan: sync-plugins-local is gated by env flag`, `scripts/task-check_test.ts::buildCheckPlan: build-plugins gets --marketplace-name flowai-plugins-local when syncPluginsLocal is on`, `scripts/sync-plugins-local_test.ts`.
  - [x] Plugin-installable project integration command: `update` is emitted into the plugin tree and reads local copied assets instead of requiring CLI sync.
    Evidence: `scripts/build-plugins_test.ts::plugin-includes-project-integration-update-command`.
  - [x] Pack-level `assets/*` files referenced by a SKILL.md are copied into the consuming skill's own dir, and `../assets/...` paths in the body are rewritten to `assets/...`.
    Evidence: `scripts/build-plugins_test.ts::copies-pack-assets-into-consuming-skill-dirs` + validator `validateAssetReferences`.
  - [x] CLI-only blocks fenced with `<!-- begin: cli-only-skill-update --> ... <!-- end: cli-only-skill-update -->` are stripped during plugin emit.
    Evidence: `scripts/build-plugins_test.ts::strips-cli-only-fences`.
  - [x] Cross-skill slash invocations `/flowai-<name>` in SKILL.md bodies are rewritten to `/<plugin>:<name>`.
    Evidence: `scripts/build-plugins_test.ts::rewrites-cross-skill-slash-invocations` + validator `validateNoUnnamespacedSlashCommands`; Codex shared-payload assertion in `scripts/build-plugins_test.ts::codex-payload codex-payload-matches-shared-transform-contract`.
  - [x] `version` is injected into `plugin.json` and the marketplace entry from the upstream `deno.json` `.version` (semver-validated).
    Evidence: `scripts/build-plugins_test.ts::injects-version-from-upstream-deno-json` + validator schema requires semver.
  - [x] Skill frontmatter `tags:` arrays are unioned, sorted, capped at 8, and emitted on the marketplace entry only (never plugin.json).
    Evidence: `scripts/build-plugins_test.ts::collects-tags-into-marketplace-entry-only`.
  - [x] Pack hooks (`framework/<pack>/hooks/<name>/{hook.yaml,run.ts}`) are translated to `hooks/hooks.json` referencing `${CLAUDE_PLUGIN_ROOT}/hooks/<name>/run.ts`, with the runner file co-emitted.
    Evidence: `scripts/build-plugins_test.ts::transforms-hook-yaml-into-hooks-json` + validator `HooksFileSchema` + per-command file-existence cross-check.
- **Status:** [x] (pilot shipped; `framework-v0.13.0` landed the downstream `release: framework-v0.13.0` commit `5c300fb9` on `korchasa/flowai-plugins` 2026-05-24; local install + verification automated via `AUTO_INSTALL_PLUGINS=true deno task check`).
- **External follow-up (tracked separately, not gating this FR):**
  - CLI aborts with an explicit message when it detects an installed Claude Code plugin for the same pack — implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli). Evidence on completion: install plugin, run `flowai sync`, confirm non-zero exit with the documented message.
- **Out of scope:** submission to official Anthropic marketplace (`claude-plugins-official`) or public Codex Plugin Directory; `latest` / `dev` release channel; npm-source plugin distribution.

#### FR-PACKS.SCOPE Scope Frontmatter Field [ANC:fr:packs.scope]

- **Desc:** SKILL.md frontmatter under `framework/<pack>/{commands,skills}/*/` MAY declare an optional `scope` field with values `project-only` | `global-only`. Absent = installable in both modes. The CLI filters primitives in `resolvePackResources()` based on the active scope.
- **Usage:**
  - `scope: project-only` only for primitives that cannot run from plugin/user-level installs.
  - `scope: global-only` reserved for future primitives that make no sense per-project.
  - Absent on `update`; it is plugin/user-level installable and writes only current-project artifacts.
- **Acceptance:**
  - [x] `scripts/resource-types.ts` Zod schema accepts `scope: "project-only" | "global-only"` (optional).
    Evidence: `scripts/check-skills_test.ts::validateScopeField`.
  - [x] CLI filter in `cli/src/sync.ts::resolvePackResources` excludes `scope: project-only` primitives when scope=global, excludes `scope: global-only` when scope=project.
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).

#### FR-DIST.FILTER Selective Sync [ANC:fr:dist.filter]
- **Desc:** `.flowai.yaml` controls which skills/agents to sync.
- **Acceptance:**
  - [x] Include/exclude filters for skills and agents.
  - [x] Include + exclude mutually exclusive.

#### FR-DIST.SYMLINKS CLAUDE.md Symlinks [ANC:fr:dist.symlinks]
- **Desc:** When `claude` IDE configured, create `CLAUDE.md -> AGENTS.md` symlink at project root.
- **Acceptance:**
  - [x] Scans project, creates/updates symlinks.
  - [x] Skips existing regular files.

#### FR-DIST.DETECT IDE Auto-Detection [ANC:fr:dist.detect]
- **Desc:** Detect IDEs by config dir presence (`.cursor/`, `.claude/`, `.opencode/`, `.codex/`).
- **Acceptance:**
  - [x] Detects 4 IDEs (Cursor, Claude Code, OpenCode, OpenAI Codex).
  - [x] Used as default when `ides` not in `.flowai.yaml`.
  - [x] `isInsideIDE()` recognises `CURSOR_AGENT`, `CLAUDECODE`, `OPENCODE`, plus `CODEX_THREAD_ID` / `CODEX_SANDBOX` (Codex sets these in every `codex exec` session).

#### FR-DIST.UPDATE Pre-Flight Update Notice [ANC:fr:dist.update]
- **Desc:** Before `flowai` / `flowai sync`, check JSR for a newer version and print a notice only. Never auto-install — users must run `flowai update` to apply. Fail-open (network errors ignored).
- **Acceptance:**
  - [x] Fetches JSR meta, compares semver.
  - [x] `--skip-update-check` flag bypasses the check entirely.
  - [x] 5s timeout, fail-open (silent on network error).
  - [x] Silent when already up to date (no spam on every sync).
  - [x] On newer version: prints `Update available: X → Y. Run \`flowai update\` to install.`
  - [x] Never spawns `deno install` from `flowai` / `flowai sync`.

#### FR-DIST.UPDATE-CMD Self-Update Subcommand [ANC:fr:dist.update-cmd]
- **Desc:** `flowai update` subcommand is the ONLY entry point that installs a newer binary. Checks JSR, prompts (or prints command in `-y` mode), installs via `deno install -g -A -f jsr:@korchasa/flowai@<ver>`.
- **Acceptance:**
  - [x] `flowai update` subcommand registered in CLI.
  - [x] Prints "Already up to date" when current version is latest.
  - [x] Prints "Updated to X.Y.Z" and returns on successful install.
  - [x] Graceful message on network error, exits 0.
  - [x] `yes` mode: prints update command instead of prompting.
  - [x] `runSelfUpdate()` used only by `flowai update`; `flowai` / `flowai sync` use notify-only `notifyUpdateAvailable()`.

#### FR-DIST.BUNDLE Bundled Source [ANC:fr:dist.bundle]
- **Desc:** Framework files bundled into the CLI package's `src/bundled.json` at publish time. No network dependency during sync. The CLI lives in the external [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) repo; this repo provides the framework content via a SHA-256-pinned tarball release (see FR-DIST.BUNDLE.PIN).
- **Tasks:** [extract-cli-to-separate-repo](tasks/2026/05/extract-cli-to-separate-repo.md)
- **Acceptance:**
  - [x] `BundledSource` (in flowai-cli) reads `src/bundled.json` baked at publish time.
  - [x] Bundling logic lives in `scripts/bundle-framework-lib.ts` (in flowai-cli); entry script `scripts/bundle-framework.ts` is a thin wrapper.
  - [x] Bundle output is byte-deterministic (sorted keys, stable JSON serialisation) — verified by `scripts/bundle-framework_test.ts::bundleFrameworkDir: byte-deterministic across two runs` (in flowai-cli).

#### FR-DIST.BUNDLE.PIN Pinned-Tarball Bundle Source (Post-Split) [ANC:fr:dist.bundle.pin]
- **Desc:** After the CLI is extracted to a standalone repo (`korchasa/flowai-cli`), `bundleFrameworkDir` consumes framework content from a downloaded GitHub-release tarball instead of an adjacent `framework/` directory. The CLI repo pins the framework revision via a committed `framework.lock` file (version, commit_sha, tarball_sha256). The bundle script downloads `framework.tar.gz` from `https://github.com/korchasa/flowai/releases/download/framework-v<version>/`, verifies its SHA-256 against `tarball_sha256`, and aborts on any mismatch. Runtime stays offline — only the bundle step touches the network.
- **Tasks:** [extract-cli-to-separate-repo](tasks/2026/05/extract-cli-to-separate-repo.md)
- **Acceptance:**
  - [x] `framework.lock` schema enforces all three mandatory fields (`version` matches `^\d+\.\d+\.\d+$`, `commit_sha` matches `^[0-9a-f]{40}$`, `tarball_sha256` matches `^[0-9a-f]{64}$`); bundle script aborts with the offending field name on schema violation. Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) — see upstream framework-lock test suite.
  - [x] Bundle script aborts with non-zero exit and diagnostic (expected vs. actual SHA-256) on tarball checksum mismatch. Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) `scripts/bundle-framework.ts` (lines verifying `sha256Hex` vs `lock.tarball_sha256`).
  - [x] Bundle output produced from the pinned tarball is byte-identical to the monorepo bundle output for the same framework commit SHA (Phase 3 parity acceptance verified for commit `656151d`).
  - [x] No fallback path: download / 404 / checksum failures all abort. The script never reads a stale cached tarball.

#### FR-DIST.USER-SYNC Cross-IDE User Resource Sync [ANC:fr:dist.user-sync]

- **Desc:** When `user_sync: true` in `.flowai.yaml` and ≥2 IDEs configured, propagate user-created resources (non-`flowai-*`, non-framework) across IDE config dirs. Canonical source = newest mtime.
- **Acceptance:**
  - [x] Scans skills/agents in each IDE dir, skips `flowai-*` prefix.
  - [x] Skips framework-bundled resources by name (e.g., `deep-research-worker`).
  - [x] Merges by `(type, name)` across IDEs, picks canonical by newest mtime.
  - [x] Agent frontmatter transformed per IDE via `crossTransformAgent()`.
  - [x] Invalid YAML frontmatter: copies as-is with warning (no crash).
  - [x] Skills copied as-is (no frontmatter transform).
  - [x] Conflict prompt in interactive mode; `--yes` overwrites.
  - [x] Skipped when <2 IDEs.
  - [x] Idempotent: repeated runs produce 0 writes.

#### FR-DIST.MIGRATE One-Way IDE Migration [ANC:fr:dist.migrate]

- **Desc:** `flowai migrate <from> <to>` migrates all primitives (skills, agents, commands) from one IDE config dir to another in a single pass. Includes both framework (`flowai-*`) and user-created resources. Agent frontmatter transformed for target IDE. Rules and hooks excluded (format incompatible).
- **Acceptance:**
  - [x] `flowai migrate <from> <to>` subcommand available.
  - [x] Skills copied as-is (full dir tree).
  - [x] Agents transformed via `crossTransformAgent()` for target IDE.
  - [x] Commands copied as-is.
  - [x] No filter: both `flowai-*` and user resources migrated.
  - [x] Conflict prompt in interactive mode; `--yes` overwrites.
  - [x] `--dry-run`: prints plan, no files written.
  - [x] Unknown IDE → error before FS operations.
  - [x] Same from/to → error.

#### FR-DIST.MAPPING Cross-IDE Resource Mapping (universal representation) [ANC:fr:dist.mapping]

- **Desc:** Defines how each logical resource type maps to IDE-specific paths and formats. flowai uses these mappings during framework sync (FR-DIST.SYNC) and user sync (FR-DIST.USER-SYNC).

**Resource type mapping:**

| Logical type | Cursor | Claude Code | OpenCode | OpenAI Codex |
|:---|:---|:---|:---|:---|
| **Command** (user-invoked only) | `.cursor/commands/foo.md` — flat md, no frontmatter | `.claude/commands/foo.md` — flat md, optional frontmatter (`allowed-tools`, `model`) | `.opencode/commands/foo.md` — flat md, `$ARGUMENTS` + shell interpolation | Installed as skill-command in `.codex/skills/foo/SKILL.md` with `disable-model-invocation: true` (Codex has no dedicated commands dir) |
| **Skill** (model-invocable) | `.cursor/skills/foo/SKILL.md` — dir, frontmatter `name`+`description` | `.claude/skills/foo/SKILL.md` — dir, frontmatter `name`+`description` | `.opencode/skills/foo/SKILL.md` — dir, same format | `.codex/skills/foo/SKILL.md` — dir, same format (Codex also auto-discovers `.agents/skills/` as fallback) |
| **Skill-command** (user-invoked skill) | `.cursor/skills/foo/SKILL.md` with `disable-model-invocation: true` | `.claude/skills/foo/SKILL.md` with `disable-model-invocation: true` | `.opencode/skills/foo/SKILL.md` with `disable-model-invocation: true` | `.codex/skills/foo/SKILL.md` with `disable-model-invocation: true` |
| **Agent** | `.cursor/agents/foo.md` — frontmatter: `name`, `description`, `readonly`, `model` | `.claude/agents/foo.md` — frontmatter: `name`, `description`, `tools`, `disallowedTools`, `model`, `effort`, `maxTurns`, `background`, `isolation`, `color` | `.opencode/agents/foo.md` — frontmatter: `description`, `mode`, `model`, `color`, `steps`, `tools` (map) | `.codex/agents/foo.toml` (sidecar) with `name`/`description`/`developer_instructions` + registered in `.codex/config.toml` as `[agents.foo] description=... config_file="./agents/foo.toml"` |

**Agent frontmatter field mapping (universal → IDE):**

| Universal field | Cursor | Claude Code | OpenCode | OpenAI Codex |
|:---|:---|:---|:---|:---|
| `name` | kept | kept | dropped | kept (sidecar `name`) |
| `description` | kept | kept | kept | kept (TOML `description` in both config + sidecar) |
| `tools` (string) | dropped | kept | dropped | dropped |
| `disallowedTools` | dropped | kept | dropped | dropped |
| `readonly` | kept | dropped | dropped | dropped |
| `mode` | dropped | dropped | kept | dropped |
| `opencode_tools` (map) | dropped | dropped | renamed → `tools` | dropped |
| `model` (tier) | resolved to IDE-native model | resolved to IDE-native model + effort (pair) | resolved from .flowai.yaml or omitted | dropped (Codex subagents inherit the session model) |
| `effort` | dropped | written by the tier (see Model tiers below); a source-level `effort:` beside a tier is a drift error | dropped | dropped |
| `maxTurns` | dropped | kept | renamed → `steps` | dropped |
| `background` | dropped | kept | dropped | dropped |
| `isolation` | dropped | kept | dropped | dropped |
| `color` | dropped | kept | kept | dropped |
| agent body (markdown) | stored as file body | stored as file body | stored as file body | stored in sidecar as `developer_instructions = """..."""` (TOML multi-line string, escaped) |
| unknown fields | pass-through | pass-through | pass-through | dropped (Codex TOML has a fixed schema) |

**Skill frontmatter fields (universal, no IDE transform):**

| Field | Claude Code | Cursor | OpenCode | Purpose |
|:---|:---|:---|:---|:---|
| `name` | yes | yes | yes | Skill identifier |
| `description` | yes | yes | yes | Skill purpose |
| `disable-model-invocation` | yes | yes | yes | User-invoked only |
| `allowed-tools` | yes | — | — | Pre-approve tools |
| `model` | yes (tier → model + effort) | — | yes (tier → model) | Override model (tier: max/smart/fast/cheap/inherit) |
| `effort` | yes | — | — | Reasoning effort. Written by the tier when one is present; standalone only on tier-less primitives |
| `argument-hint` | yes | — | — | Argument placeholder |

**Model tiers (tier → model + effort):**

A tier is the single source of truth for a primitive's quality/cost intent. It resolves to a PAIR, so the same tier can never ship with two different efforts. Applies to agents and to skills/commands that declare `model:`.

| Tier | Claude Code | Cursor | OpenCode | OpenAI Codex |
|:---|:---|:---|:---|:---|
| `max` | `opus` + `effort: max` | `slow` | user-configured | `gpt-5.4` |
| `smart` | `opus` + `effort: high` | `slow` | user-configured | `gpt-5.3-codex` |
| `fast` | `sonnet` + `effort: medium` | `fast` | user-configured | `gpt-5.4-mini` |
| `cheap` | `sonnet` + `effort: low` | `fast` | user-configured | `gpt-5.4-mini` |
| `inherit` / absent | both fields omitted | omitted | omitted | omitted |

Only Claude Code consumes `effort`; the other IDEs keep the model half and drop the effort half, exactly as they already drop a standalone `effort:` field.

Rules:

- A framework source that declares a tier MUST NOT also declare `effort:` — two sources of truth for the same value. A tier-less primitive may declare `effort:` on its own (it runs on the session model).
- User override in `.flowai.yaml` `models:` accepts two forms per tier — a bare string sets only the model and keeps the built-in effort (`smart: opus`), an object sets the pair (`smart: {model: opus, effort: high}`).
- The reverse direction (IDE-native → tier, used by cross-IDE sync) keys off the PAIR for Claude, because a bare `opus` no longer identifies a tier: `opus`+`max`→`max`, `opus`+`high`→`smart`, `sonnet`+`medium`→`fast`, `sonnet`+`low`→`cheap`. A model with no matching effort falls back to the model-only guess and is documented as lossy. Other IDEs stay model-only and lossy as before.

**Cross-IDE sync transformations (user_sync):**

| Source → Target | Resource type | Transform |
|:---|:---|:---|
| Skill (any IDE pair) | skill | Copy dir as-is (format identical across IDEs) |
| Skill with extra files (references/, scripts/) | skill | Copy entire dir tree |
| Agent (cursor → claude) | agent | Frontmatter: keep `name`+`description`+`tools`+`disallowedTools`+`model`+`effort`+`maxTurns`+`background`+`isolation`+`color`, drop `readonly` |
| Agent (claude → cursor) | agent | Frontmatter: keep `name`+`description`+`readonly`+`model`, drop `tools`+`disallowedTools`+`effort`+`maxTurns`+`background`+`isolation`+`color` |
| Agent (any → opencode) | agent | Frontmatter: keep `description`+`mode`+`model`+`color`, rename `opencode_tools`→`tools` + `maxTurns`→`steps`, drop rest |
| Agent (invalid YAML) | agent | Copy as-is, log warning |
| Command (cursor → claude) | command | Copy `.cursor/commands/foo.md` → `.claude/commands/foo.md` as-is |
| Command (cursor → opencode) | command | Copy `.cursor/commands/foo.md` → `.opencode/commands/foo.md` as-is |

**Not synced (by design):**

- Framework resources (matching bundled names plus legacy `flowai-*` names during cleanup) — managed by framework sync (FR-DIST.SYNC)
- Rules (`.cursor/rules/` ↔ `.claude/rules/`) — frontmatter differs fundamentally (globs vs paths), no automated transform
- Hooks (`.cursor/hooks.json` ↔ `.claude/settings.json` hooks key) — structure and event names differ, no automated transform
- MCP config (`mcp.json` ↔ `.mcp.json`) — trivial rename, user responsibility

**Open questions:**

- [ ] Should `user_sync` also propagate `.cursor/commands/` ↔ `.claude/commands/` ↔ `.opencode/commands/`?
- [ ] Should skills with `disable-model-invocation: true` in one IDE map to commands in another?

- **Acceptance:**
  - [x] Agent transform implemented per mapping table above.
  - [x] Skill copy preserves dir structure with extra files.
  - [x] Framework resources excluded from user sync.
  - [ ] Command sync across IDEs (pending open question resolution)

#### FR-DIST.CODEX-AGENTS OpenAI Codex Subagent Sync [ANC:fr:dist.codex-agents]

- **Desc:** Sync universal agent files (`framework/<pack>/agents/*.md`) to OpenAI Codex subagent format. Codex uses TOML configuration (`~/.codex/config.toml` or `<repo>/.codex/config.toml`) with `[agents.<name>]` tables that reference sidecar agent files via `config_file`. Agent prompt body lives in `<repo>/.codex/agents/<name>.toml` as `developer_instructions` (TOML multi-line string). Flowai owns current bundled agent names and legacy `flowai-*` entries only for one-way cleanup (see FR-DIST.CLEAN-PREFIX); user-authored tables outside the bundle are preserved.
- **Scenario:** `flowai sync` with `ides: [codex]` and a set of universal agents writes each agent body to `.codex/agents/<name>.toml` (with `name`/`description`/`developer_instructions`) and merges `[agents.<name>]` entries into `.codex/config.toml` via `mergeCodexConfig`. Removing (or renaming) an agent removes its table and sidecar on next run via bundled-name ownership plus legacy-prefix cleanup. Malformed TOML in `.codex/config.toml` throws a clear error naming the file path — does NOT silently overwrite user config.
- **Acceptance:**
  - [x] `mergeCodexConfig(tomlText, changes)` is pure (no FS). It upserts `[agents.<name>]` for each change and deletes any existing `[agents.<k>]` where `k.startsWith("flowai-")` and `k` is not in `changes`. Non-prefix tables are left untouched.
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] `writeCodexAgents(plan, fs, cwd)` in `cli/src/writer.ts` writes sidecars + TOML block atomically.
  - [x] Running `sync` twice is idempotent for Codex (no diff on second run). Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] Removing or renaming an agent in `.flowai.yaml` / framework removes the `[agents.<name>]` block and `.codex/agents/<name>.toml` on next sync via prefix-based orphan cleanup (see FR-DIST.CLEAN-PREFIX).
  - [x] User-hand-edited `[agents.user-agent]` tables (no `flowai-` prefix) survive a sync round-trip.
  - [x] Malformed `.codex/config.toml` throws with file path + underlying parse error; file contents are preserved.
  - [x] Legacy `.codex/flowai-agents.json` manifest is deleted on next sync after upgrade (one-shot migration).
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).

#### FR-DIST.CLEAN-PREFIX Legacy Prefix Orphan Cleanup [ANC:fr:dist.clean-prefix]

- **Desc:** Framework sync owns current bundled primitive names and treats legacy `flowai-*` installed names as removable migration orphans. After writing the current short-name set, flowai scans managed target dirs and deletes any legacy `flowai-*` entry whose short-name equivalent is in the current keep-set or whose old prefixed name disappeared from the bundle. Supersedes the per-name `computeDeletePlan` comparison and the Codex `flowai-agents.json` manifest — both missed renames where the old name disappeared from the current bundle.
- **Scenario A (skill/command rename):** Framework renames `flowai-plan` → `plan`. On next `flowai sync`, `{ide}/skills/plan/` is written and legacy `{ide}/skills/flowai-plan/` is removed. User skill `my-skill` and third-party skill `paperclip` are untouched.
- **Scenario B (agent rename):** `framework/core/agents/deep-research-worker.md` is removed from the bundle. On next sync, `{ide}/agents/deep-research-worker.md` (and `.toml` for Codex) is deleted. User agent `my-agent.md` untouched.
- **Scenario C (symlink preservation):** `{ide}/skills/plan` is a symlink (user-maintained). Sync does NOT remove it even if the target is missing from the bundle.
- **Managed target dirs (per IDE, per scope via `resolveIdeBaseDir`):**
  - `{ide}/skills/` — skills + commands share this dir; keep-set = union of installed `skillNames` and `commandNames`.
  - `{ide}/agents/` — keep-set = `agentNames`. File extension `.md` (Claude/Cursor/OpenCode) or `.toml` (Codex sidecar) is stripped before matching.
  - Codex `config.toml` `[agents.*]` tables — handled inside `mergeCodexConfig` by the same prefix rule.
- **Not in scope:**
  - `{ide}/commands/` (flat slash-command files) — owned by user and `runUserSync`.
  - Files inside a `flowai-*` dir (sub-file orphans after internal renames) — deferred; no evidence of need (all 10 orphans observed on 2026-04-21 have only `SKILL.md`).
  - Prefix other than `flowai-` — out of scope.
- **Acceptance:**
  - [x] `computePrefixOrphansPlan(targetDir, keepNames, fs, type, { prefix, ext })` in `cli/src/sync.ts` returns a delete plan covering the four invariants above (prefix match, keep-set, symlink skip, absent-target = empty plan).
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] Framework sync invokes `computePrefixOrphansPlan` once per managed dir per IDE (skills-dir unified pass after skills+commands write; agents-dir pass).
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] Codex `mergeCodexConfig` removes stale `flowai-*` tables without a manifest; `syncCodexAgents` removes orphan `flowai-*.toml` sidecars via prefix scan and deletes legacy `flowai-agents.json` if present.
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] `runUserSync` is unaffected — no prefix cleanup there (framework entries already filtered out at scan stage).
    Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).

#### FR-DIST.CODEX-HOOKS OpenAI Codex Hook Sync (Experimental) [ANC:fr:dist.codex-hooks]

- **Desc:** Sync universal `hook.yaml` definitions to OpenAI Codex `hooks.json` format (`~/.codex/hooks.json` or `<repo>/.codex/hooks.json`). Codex uses Claude-Code-compatible event names (`PreToolUse`, `PostToolUse`, `SessionStart`, `UserPromptSubmit`) and a nested `hooks` structure very similar to Claude. The Codex hook subsystem is feature-gated behind `codex_hooks` (stage: under development) and the flowai sync path is gated behind `experimental.codexHooks: true` in `.flowai.yaml`. When the flag is absent or false, hook sync for Codex is skipped with an info log. This requirement is experimental — tests are tagged `@flaky-until-probed` until a live probe against enabled `codex_hooks` confirms the schema.
- **Scenario:** With `experimental.codexHooks: true`, `flowai sync` transforms each hook definition via `transformHookForCodex` and calls `mergeCodexHooks` to produce a `hooks.json` with the Claude-style nested shape (`{ "hooks": { "PreToolUse": [{ matcher, hooks: [{ type: "command", command, timeout }] }] } }`). User-added hooks outside the flowai manifest are preserved. Removing a hook from the flowai set removes only its manifest-tracked entries.
- **Acceptance:**
  - [ ] `transformHookForCodex(hook, scriptPath)` produces an entry matching the Codex wire schema captured from the binary (`PreToolUse`/`PostToolUse`/`SessionStart`/`UserPromptSubmit`, `matcher`, nested `hooks[]` with `type`/`command`/`timeout`). Tagged `@flaky-until-probed`.
  - [ ] `mergeCodexHooks(existing, newHooks, manifest)` preserves user hooks not tracked by the manifest.
  - [x] `sync` skips Codex hook install when `experimental.codexHooks` is absent or false; info-logs the skip reason.
  - [x] `sync` installs hooks into `<cwd>/.codex/hooks.json` when flag is true.
  - [x] `cleanupRemovedHooks` removes only manifest-tracked entries for Codex.

#### FR-SOURCE-OVERRIDE: Source Override (git branch / local path) [ANC:fr:source-override]

- **Desc:** `.flowai.yaml` `source` field overrides default BundledSource. Supports git branch/tag clone and local filesystem path. Default git URL: official repo (`https://github.com/korchasa/flowai.git`).
- **Config:**
  - `source.ref` — branch or tag (clones via `git clone --depth 1 --branch`). Default URL if `source.git` absent.
  - `source.git` — custom repo URL (requires `source.ref`). For forks.
  - `source.path` — local `framework/` dir path. Mutually exclusive with `source.ref`.
  - No `source` field → bundled (backward compatible).
- **Acceptance:**
  - [x] `source.ref` alone → clone default repo. Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] `source.git` + `source.ref` → clone custom repo. Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] `source.path` → LocalSource. Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] `source.git` without `ref` → validation error. Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] `source.ref` + `source.path` → validation error. Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] No `source` → BundledSource (backward compatible). Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] CLI logs source type. Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] Cleanup on failure (tmpdir removed). Evidence: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (CLI moved to external repo; see upstream tests).
  - [x] `deno task check` passes with all new tests. Evidence: 255 tests pass.

### FR-AGENT-COMMIT: Conventional Commits — `agent` Type [ANC:fr:agent-commit]

- **Description:** Add `agent:` as a new commit type in Conventional Commits convention used by `commit`. Covers changes to agents, skills, `AGENTS.md`, and other AI-agent-related configuration in IDE directories.
- **Use case scenario:** Developer modifies a skill's `SKILL.md` or updates an agent definition. On commit, the message is prefixed with `agent:` (e.g., `agent: update commit skill with atomic grouping rules`).
- **Acceptance verified by acceptance tests:** `commit-agent-type`

### FR-REVIEW-COMMIT: Review-and-Commit Workflow — `review-and-commit` [ANC:fr:review-commit]

- **Description:** Composite command: review → gate (Approve only) → commit. Stops on Request Changes/Needs Discussion.
- **Generated origin:** `framework/composites.yaml` + `framework/composites/review-and-commit.md` per FR-SKILL-COMPOSE.
- **Tasks:** [generate-skills-from-atoms](tasks/2026/05/generate-skills-from-atoms.md)
- **Acceptance verified by acceptance tests:** `review-and-commit-approve`, `review-and-commit-reject`, `review-and-commit-auto-docs`, `review-and-commit-auto-invoke-reflect`, `review-and-commit-phase-2-diff-eliminated`, `review-and-commit-post-reflect-cleanup-commit`, `review-and-commit-parallel-delegation`, `review-and-commit-non-deno-project`

### FR-DO-WITH-PLAN: Full-Cycle Workflow — `do-with-plan` [REMOVED] [ANC:fr:do-with-plan]

- **Description:** Removed. Functionality fully superseded by `ship` (FR-SHIP), which adds an explicit Push phase + 4 gates. Composite wrapper, manifest entry, generated SKILL.md, and 6 acceptance scenarios deleted.
- **Tasks:** [do-with-plan-command](tasks/2026/05/do-with-plan-command.md), [generate-skills-from-atoms](tasks/2026/05/generate-skills-from-atoms.md)
- **Status:** [x] Removed

### FR-SKILL-COMPOSE: Generated Composite Skill Assembly [ANC:fr:skill-compose]

- **Description:** Composite and atomic SKILL.md files are **gitignored build artefacts** materialized from a single source of truth (`framework/atoms/*.md` + `framework/composites/*.md` wrappers + `framework/composites.yaml` manifest) by [scripts/generate-skill-composites.ts](../scripts/generate-skill-composites.ts). The generator parametrizes atoms with `{{NAME}}` placeholders + `<param-branch>` blocks so one atom serves multiple composites with phase-specific divergence. **Each downstream consumer regenerates first**: `scripts/task-check.ts` runs `--write` as a prerequisite before fmt/lint/tests; `scripts/task-acceptance-tests.ts` runs `--write` before sandbox setup; `scripts/build-plugins.ts` runs `--write` before reading SKILL.md into the marketplace tree; the CI `Build framework tarball` step runs `--write` before `tar`. This makes drift between source and rendered output structurally impossible — there is no tracked rendered copy to fall behind. `--check` mode is now a syntax + gitignore-parity self-test (no longer a drift gate, since fresh-clone disk is empty). `--list-targets` emits the manifest's target paths for `.gitignore` parity checks. `.gitignore` must list exactly the target set; parity is enforced by `checkGitignoreParity` inside both `--write` and `--check` and exercised by a unit test. Generator inputs (`framework/atoms/`, `framework/composites/`, `composites.yaml`, and legacy `_atom.md` / `_composite.md`) are excluded from `framework.tar.gz` by `tar --exclude` flags in [.github/workflows/ci.yml](../.github/workflows/ci.yml) and re-verified by [scripts/check-pack-refs.ts `--leakage`](../scripts/check-pack-refs.ts); the rendered SKILL.md files ARE included in the tarball (generated immediately before `tar`). Composite canon (no Skill-tool delegation, "Self-contained — execute the inlined steps directly" marker in description, no source-skill names in description, explicit verdict-gate success/failure branches, single `<step_by_step>` per atom slot, 700-line cap) is machine-enforced by a canon validator inside the generator. Replaces the legacy substring-matching `scripts/check-skill-sync.ts` + `scripts/composite-skills.ts` infrastructure (removed in an earlier commit of the implementing task).
- **Use case scenario:** A maintainer edits `framework/atoms/commit.md`. They run `deno task check` — `--write` regenerates the atom's standalone SKILL.md AND every composite SKILL.md that consumes the atom (`review-and-commit`, `ship`), each with phase-specific params. Fresh-clone scenario: developer clones, runs `deno task check`; the generator's `--write` prerequisite materializes all 9 SKILL.md files before any downstream check runs. Adding a new composite: the maintainer edits `framework/composites.yaml`, runs `deno task check`, sees a parity error from `checkGitignoreParity` pointing at the missing `.gitignore` entry; adds it; re-runs.
- **Tasks:** [generate-skills-from-atoms](tasks/2026/05/generate-skills-from-atoms.md), [remove-flowai-prefix-from-primitives](tasks/2026/05/remove-flowai-prefix-from-primitives.md)
- **Acceptance verified by acceptance tests:** `scripts/generate-skill-composites_test.ts` (manifest loading + render + canon validation + gitignore parity); `scripts/check-pack-refs_test.ts` (bundle-leakage detection); plus the full acceptance-test suites for every regenerated primitive (`plan`, `review`, `commit`, `review-and-commit`, `ship`) as semantic-equivalence gate.
- **Evidence:** `deno test -A scripts/generate-skill-composites_test.ts && deno test -A scripts/check-pack-refs_test.ts && deno run -A scripts/generate-skill-composites.ts --check && deno run -A scripts/check-pack-refs.ts --leakage`
- **Status:** [x]

### FR-ATOM-IMPLEMENT: TDD Implement Atom — `implement` [ANC:fr:atom-implement]

- **Description:** Model-invocable skill that drives the canonical TDD cycle (RED → GREEN → REFACTOR → CHECK, per [AGENTS.md § TDD Flow](../framework/AGENTS.md)) against a written plan's Solution section. Triggers on "implement under TDD per task plan" prompts without overlapping `plan` (planning), `review` (post-implement review), or `fix-tests` (existing-test repair). Source: `framework/atoms/implement.md`. Generated SKILL.md materialized by [scripts/generate-skill-composites.ts](../scripts/generate-skill-composites.ts) per FR-SKILL-COMPOSE.
- **Tasks:** [generate-skills-from-atoms](tasks/2026/05/generate-skills-from-atoms.md)
- **Acceptance verified by acceptance tests:** `implement-tdd-cycle-completes`, `implement-returns-to-red-on-check-failure`, `implement-trigger-pos-1`, `implement-trigger-adj-1`, `implement-trigger-false-1`. (Implementation deviates from the task's "consolidated mixed-1" plan to keep `check-trigger-coverage.ts` happy without an exemption.)
- **Status:** [x]

### FR-ATOM-REFLECT-GATE: Reflect Gate Atom — `reflect-gate` [ANC:fr:atom-reflect-gate]

- **Description:** User-invoked command (kind=command; CLI writer injects `disable-model-invocation: true` at sync time) that closes a finished session: it checks the conversation and the invocation message for complexity signals and speaks the verdict aloud either way; audits the session INLINE (execution flow, logic patterns, technical decisions, context gaps and waste, undocumented discoveries, automation opportunities); criticises its own findings before writing anything; applies the surviving corrective edits to the project's instruction files (`AGENTS.md`, `**/CLAUDE.md` and the rule files they point at, never application code); lists every edit file by file; commits them WITHOUT asking as a single `agent:` commit staging only the edited paths, since the edit and its commit are equally local and equally reversible; then asks the ONE question of the phase — whether to push that commit — and waits for the answer. The push is a plain `git push` followed by an upstream check; `--force`, `--force-with-lease` and `--set-upstream` are refused and handed to the `push` atom, which owns those decisions. On refusal the edits are treated as unwanted, not merely unpublished: the atom removes the commit and the file contents together with a single `git reset --hard HEAD~1`. Two read-only guards make that safe and are both satisfied by construction at this point in the cycle — its commit is still `HEAD`, and `git status --porcelain` is empty because the earlier phases committed and pushed everything. If either guard fails the atom STOPs and changes nothing, since a `--hard` reset would then discard work it did not create. It MUST NOT delegate the audit to `reflect` or any other skill via the Skill tool: a sub-run ends with a report, the report reads like the end of the work, and the calling workflow's next phase is lost — recurred in 1 run of 3 on 2026-08-19 with the delegation still in place. Accepted residual risk (2026-08-19): the question sits at the END of the phase, so under `HAND_OFF_TO_NEXT` both the commit and the Push Phase follow the user's reply. Declares `TERMINATION` (`TOTAL_STOP` | `HAND_OFF_TO_NEXT`) like `plan`, `implement` and `push`. Split out of `framework/atoms/commit.md` on 2026-08-17: held inside `commit`, the branch had no hand-off form, so a composite that placed `commit` before another phase lost that phase — measured on `ship-task-full-cycle-success` run-1 of the `2026-08-17T09-27-52` sweep, where the report ended the turn and the Push Phase never ran with the commit left local. The standalone `commit` no longer carries the branch at all. Two consequences of the same turn-boundary property shape the design: (a) the atom performs the audit INLINE and invokes no skill for it — with the audit still delegated to `reflect` through the Skill tool the loss recurred in 1 run of 3 on 2026-08-19; (b) in `ship` and `ship-task` the Reflect Phase is LAST, after the Push Phase, so the only work left after its commit question is the commit itself. A declined commit leaves the edits in the working tree; they are never reverted. Source: `framework/atoms/reflect-gate.md`.
- **Tasks:** [extract-reflect-gate-atom](tasks/2026/08/extract-reflect-gate-atom.md)
- **Acceptance verified by acceptance tests:** `ship-task-reflect-after-push`, `ship-task-reflect-push-declined`, `review-and-commit-auto-invoke-reflect`, `review-and-commit-post-reflect-cleanup-commit`. No trigger scenario (commands carry no trigger scenarios anywhere in the codebase).
- **Status:** [x]

### FR-ATOM-PUSH: Git Push Atom — `push` [ANC:fr:atom-push]

- **Description:** User-invoked command (kind=command; CLI writer injects `disable-model-invocation: true` at sync time) that pushes the current branch to its remote with a strict safety contract: (a) `--force` is forbidden; (b) `--force-with-lease` is permitted ONLY with explicit per-push user authorization in chat (not via a session-long flag), **AND ONLY on non-protected branches**; (c) if upstream is unset → run `--set-upstream` automatically AFTER explicit user confirmation that the branch should track; (d) when the remote branch is `main`/`master` AND the remote has commits the local does not have, REFUSE both `--force` and `--force-with-lease` absolutely — explicit per-push authorization does NOT unlock force here (canonical regression: destroying a teammate's commits). The agent asks with exactly two options: pull-rebase or abort. If the user volunteers "force", "overwrite", or similar, the agent restates the refusal; (e) when the local branch is unprotected but the user typed a target other than the current branch, refuse. Post-push verification: `git rev-parse @{u}` matches `HEAD`. Source: `framework/atoms/push.md`.
- **Tasks:** [generate-skills-from-atoms](tasks/2026/05/generate-skills-from-atoms.md), [REF:task:2026-06-push-await-ci | push-await-ci]
- **Acceptance verified by acceptance tests:** `push-happy-path`, `push-sets-upstream-on-first-push`, `push-refuses-force-on-divergence`. No trigger scenario (commands carry no trigger scenarios anywhere in the codebase).
- **Status:** [x]

#### FR-ATOM-PUSH.CI-AWAIT: Await CI then Investigate Failures [ANC:fr:atom-push.ci-await]

- **Description:** When the project's `AGENTS.md` declares a `## CI/CD` section (Provider, Status command, optional Logs command, optional Run URL command), the `push` atom MUST, after a successful local push, poll the declared Status command until terminal state, with the cap of 30 iterations × 60s sleep ≈ 30 minutes. Exit codes: 0=green, 1=red (terminal failure), 2=in-progress (continue polling), other=malformed status command (STOP fail-fast). On red the atom hands off to the `investigate` skill with the failed-run URL and a 12 KB log buffer; on timeout the atom STOPs with a timeout report and does NOT invoke investigate; on absence of the `## CI/CD` section the atom skips silently with a one-line note. The wait is unconditional when CI is declared — there is no per-push opt-out param. Status command MUST be a single-shot status query (NOT a blocking wait like `gh run watch --exit-status`); the iteration cap is what bounds wall-clock. Commands receive the pushed SHA via `$SHA` env. The `## CI/CD` section is user-populated (not scaffolded by `init`) — projects without CI omit it entirely and the atom skips. Source: `framework/atoms/push.md` step 6.
- **Tasks:** [REF:task:2026-06-push-await-ci | push-await-ci]
- **Acceptance verified by acceptance tests:** `push-skips-ci-await-when-not-declared`, `push-awaits-ci-success`, `push-investigates-ci-failure`, `push-stops-on-malformed-ci-block`, `push-stops-on-ci-timeout`. The timeout-branch test drives the cap cheaply through the `## CI/CD` tunables (`Poll interval: 5`, `Wall-clock budget: 10` → `ITER_CAP = 2`); no runner-level `sleep` shimming required.
- **Status:** [x]

### FR-SHIP: Terminal Full-Cycle Workflow — `ship` [ANC:fr:ship]

- **Description:** User-invoked composite command: plan → implement → review → commit → push. Five phases, four explicit gates (variant-selection after Plan, green-check before Review, verdict gate before Commit, clean-tree + branch-protection check before Push). Generated from `framework/composites/ship.md` + the five atoms (`plan`, `implement`, `review`, `commit`, `push`) per FR-SKILL-COMPOSE. Composite canon (no delegation, "Self-contained — execute the inlined steps directly" marker, explicit verdict-gate branches, 700-line cap) is machine-enforced by the generator.
- **Tasks:** [generate-skills-from-atoms](tasks/2026/05/generate-skills-from-atoms.md)
- **Acceptance verified by acceptance tests:** `ship-full-cycle-success`, `ship-pauses-for-variant-selection`, `ship-rejects-on-changes-requested`, `ship-refuses-push-on-dirty-tree`. No trigger scenario (command convention).
- **Status:** [x]

### FR-SHIP-TASK: SDLC Continuation from a Ready Task File — `ship-task` [ANC:fr:ship-task]

- **Description:** User-invoked composite command that picks up the SDLC AFTER the planning phase. Takes a path (or identifier) to a task file with a filled `## Solution` section and drives implement → review → commit → push. Four phases, three explicit gates (green-check before Review, verdict gate before Commit, clean-tree + branch-protection check before Push). The Plan atom is intentionally absent; the composite STOPs if the task file is missing or its `## Solution` is empty. Generated from `framework/composites/ship-task.md` + the four atoms (`implement`, `review`, `commit`, `push`) per FR-SKILL-COMPOSE. Composite canon (no delegation, "Self-contained — execute the inlined steps directly" marker, explicit verdict-gate branches, 700-line cap) is machine-enforced by the generator.
- **Acceptance verified by acceptance tests:** `ship-task-full-cycle-success`. No trigger scenario (command convention).
- **Status:** [x]

### FR-DECISION-GATE: Decision-Level Human Gate (above class/method) [ANC:fr:decision-gate]

- **Description:** The human is the initiator and approver of every decision **above the level of individual classes/methods** — business decisions, architecture, key technical choices. Before implementing any such above-class/method decision that is NOT already settled in the approved plan, the agent MUST surface it to the human stated in decision terms (options + trade-offs + recommendation) and obtain approval BEFORE writing code. Decisions at or below class/method granularity are executed by the AI without a human gate (AI is trusted there). The gate is the *decision*, NOT the diff (diff inspection is optional — see FR-DIFF-OPTIONAL). Governs `implement`/`plan`/`ship`; reinforced in `framework/atoms/implement.md`; shipped to users via `framework/core/assets/AGENTS.template.md`.
- **Tasks:** [vision-shift-decision-level](tasks/2026/06/vision-shift-decision-level-no-cognitive-debt.md)
- **Acceptance verified by acceptance tests:** `implement-decision-gate`
- **Status:** [x]

#### FR-DECISION-GATE.PROACTIVE: Exhaust Autonomous Search Before Escalating [ANC:fr:decision-gate.proactive]

- **Description:** Before surfacing a question to the human, the agent MUST exhaust autonomous resolution — search the codebase, the docs, and the web. Escalation is reserved for genuine above-class/method decisions and irreducible ambiguity; a question the agent could answer itself is a defect. Realizes `[REF:pr:proactive | PR-PROACTIVE]`; balances the decision gate against over-asking (`[REF:fm:decide.overask | FM-DECIDE.OVERASK]`).
- **Acceptance:** `agents-rules-proactive-resolution` (benchmark to be authored)
- **Status:** [ ]

### FR-UPWARD-NARRATION: Upward Narration in Class/Method Terms [ANC:fr:upward-narration]

- **Description:** The agent communicates *upward*: it narrates work to the human in terms of requirements AND the class/method structure it produces (names, responsibilities, relationships) — never requiring the human to read implementation code. Every decision above class/method granularity MUST appear in the chat summary the human reads; an unsurfaced above-class/method decision is a defect. This absorbs the former cognitive-debt guard — the anti-cognitive-debt mechanism is **completeness of the chat summary**, NOT document currency and NOT a static check script (neither can inspect chat). Reinforced in `framework/atoms/implement.md`; shipped via `framework/core/assets/AGENTS.template.md`.
- **Tasks:** [vision-shift-decision-level](tasks/2026/06/vision-shift-decision-level-no-cognitive-debt.md)
- **Acceptance verified by acceptance tests:** `implement-upward-narration`
- **Status:** [x]

### FR-AI-CODE-REVIEW: AI-Owned Code Review, Decision-Level Verdict [ANC:fr:ai-code-review]

- **Description:** Code review is owned by the AI. The `review` workflow performs the code review itself and reports a **decision-level verdict** to the human (task completion, architectural soundness, key risks) rather than a line-by-line diff walk-through; the human is not required to read the diff to accept the verdict. Heavy diff reading is delegated to a diff-analysis subagent (`diff-specialist`) where the IDE supports subagents, keeping line-level churn out of the human-visible context. Source: `framework/atoms/review.md`.
- **Tasks:** [vision-shift-decision-level](tasks/2026/06/vision-shift-decision-level-no-cognitive-debt.md)
- **Acceptance verified by acceptance tests:** `review-decision-level-verdict`
- **Status:** [x]

#### FR-AI-CODE-REVIEW.EXISTING-SUITE: Existing-Suite Gate — No Approve on Self-Authored Tests Alone [ANC:fr:ai-code-review.existing-suite]

- **Description:** `review` MUST locate the repository's PRE-EXISTING test module(s) covering the changed symbols — including tests of their callers (transitive coverage) — and RUN them, scoped to the changed area (never a full-suite CI run). An `Approve` verdict is forbidden when the only tests executed for the changed area were authored in the same diff. A located module that cannot run locally (live service, missing env) is recorded with its reason in Degradation Notes — never a fabricated pass. Kills the SWE-bench false-green pattern (django-14792: agent's self-authored tests passed while the canonical suite failed unrun). Source: `framework/atoms/review.md` Rule 13 + step 4b.
- **Tasks:** [review-run-existing-tests](tasks/2026/06/review-run-existing-tests.md)
- **Acceptance verified by acceptance tests:** `review-runs-existing-suite`
- **Status:** [x]

#### FR-AI-CODE-REVIEW.MINIMAL: Verdict Flags Disproportionate Edit Breadth [ANC:fr:ai-code-review.minimal]

- **Description:** The review verdict MUST flag edits broader than the requirement demands — unrequested refactors, scope widening, drive-by changes. Breadth beyond the task is a finding; the DEPTH of the fix (patch vs root cause) stays the human's choice and is NOT flagged. Realizes `[REF:pr:minimal | PR-MINIMAL]`; catches over-build (`[REF:fm:shape.wide | FM-SHAPE.WIDE]`, `[REF:fm:scope.over | FM-SCOPE.OVER]`).
- **Acceptance:** `review-flags-overbuild` (benchmark to be authored)
- **Status:** [ ]

### FR-DIFF-OPTIONAL: Optional, Non-Blocking Diff Review (Model B) [ANC:fr:diff-optional]

- **Description:** Diff-level review remains available but OPTIONAL (Model B): the `review` / `ship` / `review-and-commit` workflows MUST NOT block on human diff inspection. The agent offers the diff for optional inspection and proceeds on the decision-level verdict; the human MAY inspect any diff but is never forced to as a mandatory barrier. Source: `framework/atoms/review.md`.
- **Tasks:** [vision-shift-decision-level](tasks/2026/06/vision-shift-decision-level-no-cognitive-debt.md)
- **Acceptance verified by acceptance tests:** `review-decision-level-verdict` (shared scenario, distinct checklist item — same verdict-not-diff-walk execution path as FR-AI-CODE-REVIEW)
- **Status:** [x]

### FR-DEVCONTAINER: AI Devcontainer Setup — setup-ai-ide-devcontainer [ANC:fr:devcontainer]

- **Description:** Generates `.devcontainer/` config optimized for AI IDE development. Stack detection, AI CLI integration, global skills mounting, security hardening.
- **Acceptance verified by acceptance tests:** `setup-ai-ide-devcontainer-node-basic`, `setup-ai-ide-devcontainer-deno-with-claude`, `setup-ai-ide-devcontainer-deno-flowai`, `setup-ai-ide-devcontainer-brownfield-existing`, `setup-ai-ide-devcontainer-feature-discovery`, `setup-ai-ide-devcontainer-opencode-multi-cli`

### FR-UNIVERSAL: Universal Skill & Script Requirements [ANC:fr:universal]

- **Description:** All framework skills MUST conform to the agentskills.io standard and work identically across supported IDEs (Cursor, Claude Code, OpenCode). Scripts bundled with skills MUST be cross-IDE compatible.
- **Tasks:** [doc-schema-indirection](tasks/2026/05/doc-schema-indirection.md)
- **Use case scenario:** A developer installs flowai skills via flowai. Skills with bundled scripts work in any of the three supported IDEs without modification.
- **Priority:** High (foundational for multi-IDE support).

#### FR-UNIVERSAL.STRUCT Directory Structure (agentskills.io) [ANC:fr:universal.struct]

- **Acceptance:**
  - [x] Every skill is a directory with `SKILL.md` (required) and optional `scripts/`, `references/`, `assets/`, `evals/` subdirectories. No other top-level conventions (README.md, CHANGELOG.md). Enforced by `scripts/check-skills.ts`.

#### FR-UNIVERSAL.FRONTMATTER Frontmatter (agentskills.io) [ANC:fr:universal.frontmatter]

- **Acceptance:**
  - [x] `name` (required, max 64 chars, `[a-z0-9-]`, must match parent directory name) and `description` (required, max 1024 chars). Optional: `license`, `compatibility`, `metadata`, `allowed-tools` (experimental), `disable-model-invocation`. Enforced by `scripts/check-skills.ts`.

#### FR-UNIVERSAL.DISCLOSURE Progressive Disclosure (agentskills.io) [ANC:fr:universal.disclosure]

- **Acceptance:**
  - [x] Metadata (~100 tokens) loaded at startup; full SKILL.md (<10000 tokens, <700 lines per `scripts/lib/skill-limits.ts`) on activation; scripts/references/assets loaded only when required. Enforced by `scripts/check-skills.ts`.
  - [x] **Composite-skill exemption (FR-SKILL-COMPOSE):** the composite roster is derived live from `framework/composites.yaml` `composites:` keys via [scripts/lib/composite-list.ts](../scripts/lib/composite-list.ts); the SKILL.md files for those composites are exempt from the 10000-token cap. Their byte count is mechanically dictated by the atom `<step_by_step>` blocks the generator inlines; the no-delegation canon is machine-enforced by the generator's canon validator (see `framework/CLAUDE.md` § Composite Skill Authoring). Line cap (700) and frontmatter catalog cap (100 tokens) still apply. No separate list to keep in sync — adding a composite to `framework/composites.yaml` automatically exempts it.

#### FR-UNIVERSAL.REFS File References (agentskills.io) [ANC:fr:universal.refs]

- **Acceptance:**
  - [x] One level deep from SKILL.md. No nested reference chains. Enforced by `scripts/check-skills.ts`.

#### FR-UNIVERSAL.XIDE-PATHS Cross-IDE Script Path Resolution [ANC:fr:universal.xide-paths]

- **Acceptance:**
  - [x] **Relative paths**: SKILL.md MUST reference scripts using relative paths from the skill root (e.g., `scripts/validate.ts`, `python3 scripts/process.py`). Per agentskills.io client implementation guide, the IDE resolves relative paths against the skill's directory and converts to absolute paths in tool calls. All framework SKILL.md files migrated to relative paths.
  - [x] **No custom path placeholders**: Do NOT use custom placeholders like `<this-skill-dir>` in framework skills. The agentskills.io standard defines relative paths as the canonical mechanism; IDEs are responsible for resolution. Existing skills using `<this-skill-dir>` MUST be migrated to plain relative paths. Enforced by `scripts/check-skills.ts`.
  - [x] **No IDE-specific path variables**: Do NOT use `${CLAUDE_SKILL_DIR}` or other IDE-specific variables in framework skills. These are IDE extensions, not part of the agentskills.io standard, and break portability. Enforced by `scripts/check-skills.ts`.

#### FR-UNIVERSAL.IDE-NEUTRAL Framework IDE Neutrality [ANC:fr:universal.ide-neutral]

- **Desc:** Framework SKILL.md bodies and command bodies MUST NOT name a specific IDE model ID or CLI binary. Model resolution happens at install time via `DEFAULT_MODEL_MAPS` and `resolveModelTier`; hard-coding `gpt-5.x`, `claude-opus-x`, or `claude-sonnet-x` breaks cross-IDE portability and drifts out of sync when IDE model catalogs change. Abstract tiers (`max`/`smart`/`fast`/`cheap`/`inherit`) are the only portable way to express intent.
- **Acceptance:**
  - [x] `scripts/check-skills.ts` validates `framework/<pack>/{skills,commands}/**/SKILL.md` bodies against forbidden patterns: `gpt-5(?:\.\d+)?(?:-\w+)?`, `claude-opus-\d(?:-\d+)?`, `claude-sonnet-\d(?:-\d+)?`. Violations fail the check with criterion tag `FR-UNIVERSAL.IDE-NEUTRAL`.
  - [x] Frontmatter `model:` keys with abstract tiers (e.g. `model: smart`) are allowed; only the body is scanned.
  - [x] Acceptance tests directory (`framework/*/acceptance-tests/`) and `.claude/skills/` dev resources are exempt (not distributed).

#### FR-UNIVERSAL.DOC-SCHEMA Documentation Schema Indirection [ANC:fr:universal.doc-schema]

- **Desc:** Distributed plugin primitives MUST resolve project documentation through semantic roles declared by the project-instructions artifact before reading/writing docs: `SRS` (requirements), `SDS` (design), `tasks` (persistent plans), `index` (navigation aggregate). Plugin resources MUST NOT encode concrete default paths or embedded SRS/SDS/task schemas, except `AGENTS*`/`CLAUDE*` templates, acceptance-test fixtures/assertions, and code-comment GFM traceability links to SRS/SDS headings. `pack.yaml` `scaffolds:` MAY keep concrete project-relative artifact paths because the external CLI contract consumes them as display/sync metadata; this exception is metadata-only and not an operational fallback.
- **Acceptance:**
  - [x] `scripts/check-skills.ts` scans distributed plugin resources (`framework/<pack>/{skills,commands,agents,hooks}/**`, `framework/<pack>/pack.yaml`, `framework/atoms/**`, `framework/composites/**`) and fails with criterion `FR-UNIVERSAL.DOC-SCHEMA`, matched literal, file path, and replacement guidance.
  - [x] Concrete documentation paths/schema blocks are allowed in `framework/*/assets/AGENTS*.md`, `framework/*/assets/CLAUDE*.md`, and acceptance-test fixtures/assertions. Evidence: `scripts/check-skills_test.ts::doc schema indirection`.
  - [x] No implicit fallback to default flowai paths in operational primitives; missing role binding is a stop-and-ask condition. Evidence: acceptance scenarios `plan-doc-schema-discovery`, `review-doc-schema-discovery`, `commit-doc-schema-discovery`.

#### FR-UNIVERSAL.QA-FORMAT Question Format for User Interaction [ANC:fr:universal.qa-format]

- **Desc:** Every framework skill that prompts the user with **clarifying / Q&A-style questions** MUST use a unified format:
  1. **Numbered questions** — each question is a numbered list item (`1.`, `2.`, `3.`, …). Not a heading, not bold-only, not a bare paragraph.
  2. **`agent's choice` resolution semantics for multi-select** — when the user picks multiple items from a list and explicitly delegates the choice to the agent (e.g. by saying `agent's choice` or its language equivalent), the agent picks the subset, emits a one-line justification announcing what it picked and why, and proceeds without re-asking for confirmation.
- **Scope (in / out):**
  - **In** — clarifying questions, option picks with short labels, multi-select over short option lists. Examples: IDE / scope choice in `engineer-skill`, target audience / constraints in `write-prd`, fix verdict in `maintenance`.
  - **Out** — multi-section content presentations where each "option" is a rich block with its own Pros/Cons/Risks/Best-for sub-sections, AND closing "how to proceed" questions that immediately follow a long rich-content listing in the same response. Examples: variant selection in `plan` Step 4, phase decomposition in `epic` Step 4, the post-findings "how to proceed" prompt in `maintenance` (after the multi-category findings list). These follow the legacy multi-section pattern (`### Variant N` / `### Phase N` per option, or bullet-dash short options after a rich-content preamble) — empirical testing across 7 SKILL.md iterations and a deterministic helper-script approach showed Claude Sonnet 4.6's layout prior for "rich-content alternatives" cannot be overridden through skill text alone, and Claude Code lacks an `afterAgentResponse` hook for runtime enforcement.
- **Deferred (follow-up):** strict numbering of option choices and literal `all` / `agent's choice` lines appended to every multi-select option list, plus extending the format to rich-content alternatives. Both require a runtime mechanism (e.g. an output-rewrite hook) not available in Claude Code today; revisit when such a mechanism exists across IDEs.
- **Acceptance:**
  - [x] `flowai-conduct-qa-session/SKILL.md` documents the scoped format (numbered questions, `agent's choice` resolution semantics) as canonical.
  - [x] Benchmark `flowai-conduct-qa-session-multi-select-format` verifies, on a multi-select prompt: the question is numbered; on `agent's choice` the agent emits a one-line justification and proceeds without awaiting confirmation.
  - [x] Question-asking skills (`plan`, `epic`, `write-prd`, `maintenance`, `engineer-skill`, `engineer-command`) reference `FR-UNIVERSAL.QA-FORMAT` in their SKILL.md and call out exemptions where applicable.
- **Status:** [x]

**Script Requirements**

- **Acceptance criteria:**
  - [x] **Non-interactive**: Scripts MUST NOT use interactive prompts (stdin confirmation, interactive menus). All input via CLI flags, env vars, or stdin piping. Agents run in non-interactive shells. All 17 scripts use CLI args/env/stdin piping; none use interactive prompts.
  - [x] **Structured output**: Scripts MUST output structured data (JSON preferred) to stdout. Diagnostics/progress to stderr. This enables reliable parsing by any agent implementation. All framework scripts output `{ "ok": bool, "result": {...} }` JSON to stdout. Diagnostics go to stderr via `console.error()`.
  - [x] **Self-contained dependencies**: Scripts MUST declare dependencies inline (PEP 723 for Python, `npm:`/`jsr:` imports for Deno/TS). No implicit global installs required. All framework scripts use `jsr:` specifiers. No bare `@std/` imports remain in `framework/<pack>/{skills,commands}/*/scripts/`.
  - [N/A] **Help output**: Scripts SHOULD implement `--help` flag as the primary way agents learn the script interface. Dropped: agents read SKILL.md for script interface; `--help` duplicates SKILL.md and adds maintenance burden.
  - [x] **Meaningful exit codes**: Exit 0 on success, non-zero on failure. Scripts SHOULD use distinct codes for different error types. All 17 scripts exit 0/non-zero correctly. Verified across `scripts/`, `framework/<pack>/skills/*/scripts/`, and `framework/<pack>/commands/*/scripts/`.
  - [x] **Read-only by default**: Analysis/validation scripts MUST NOT create, write, or modify project files. File creation is the agent's responsibility unless the script's explicit purpose is generation. Analysis scripts (`generate_agents.ts`, `check-skills.ts`, `check-agents.ts`) are read-only.
  - [x] **Idempotent**: Scripts MUST be safe to run multiple times with the same input producing the same output. Validation/check scripts are inherently idempotent (read-only). Init scripts support `--skip-existing` flag for idempotent mode; default is fail-fast on conflict.
  - [x] **Error messages**: Scripts MUST provide clear, actionable error messages to stderr. Include what failed, why, and how to fix. All 17 scripts write diagnostics to stderr via `console.error()`.
  - [x] **Dry-run support**: Scripts performing destructive operations SHOULD support `--dry-run` flag. N/A — no framework scripts perform destructive operations. All are analysis/validation/symlink tools.

**Script Language Policy**

- **Acceptance criteria:**
  - [x] **Framework scripts in Deno/TS**: All framework product scripts (`framework/<pack>/{skills,commands}/*/scripts/`) MUST be written in Deno/TypeScript. Zero `.py` files in these subtrees.
  - [x] **General-purpose utilities in Python**: Utility scripts outside the framework product directory MAY use Python. Scripts inside `framework/<pack>/{skills,commands}/*/scripts/` MUST be Deno/TS per FR-UNIVERSAL.LANG. Policy documented in SDS (section 3.1.2 "Script Language Policy"). Project uses Deno/TS exclusively — no Python.
  - [x] **User-facing skills are language-agnostic**: The agentskills.io standard allows any language. Framework documentation (e.g., `engineer-skill`) MUST NOT restrict users to a single language. Common options: Python, Bash, JavaScript/TypeScript. `engineer-skill` does not restrict script language; examples mention multiple options.

#### FR-UNIVERSAL.EXEC Script Execution Model [ANC:fr:universal.exec]

- **Acceptance criteria:**
  - [x] **Agent-driven execution**: Scripts are NOT auto-executed. The agent reads SKILL.md instructions and decides when to run scripts using its standard code execution tool (Bash/terminal). This is consistent across all three IDEs. All SKILL.md files use imperative instructions ("Run…", "Execute…") directing the agent; no auto-execution hooks.
  - [x] **No dedicated script runner**: There is no special "script runner" tool in any supported IDE. All script execution goes through the generic Bash/terminal tool. Confirmed: all three IDEs (Cursor, Claude Code, OpenCode) use Bash/terminal for script execution.
  - [x] **allowed-tools hint**: Skills MAY use the `allowed-tools` frontmatter field (experimental) to pre-approve tools needed for script execution (e.g., `Bash(deno:*)`). This reduces permission prompts but is not guaranteed across all IDEs. Documented in SDS (section 3.1.3 "Skill Tool Hints"). Adoption is optional per agentskills.io spec.

#### FR-UNIVERSAL.DISCOVERY Skill Discovery Paths [ANC:fr:universal.discovery]

- **Acceptance criteria:**
  - [x] **Framework distribution**: Framework primitives distributed from `framework/<pack>/skills/` and `framework/<pack>/commands/` to IDE directories via flowai. Both subtrees install into `.{ide}/skills/`; commands get `disable-model-invocation: true` injected by the writer at sync time. See FR-DIST, FR-PACKS.STRUCT.
  - [x] **Cross-IDE discovery**: Skills discoverable by IDEs via IDE-specific config dirs (e.g., `.claude/skills/`). flowai handles placement per IDE.
  - [x] **Name collision**: Project-level skills override user-level skills when names collide (per agentskills.io client implementation guide). flowai overwrites on sync. Documented in SDS (section 3.1.4).

### FR-UPDATE: Project Integration Update — `update` [ANC:fr:update]

- **Description:** Project integration command that reconciles current-project artifacts with the installed flowai framework templates. It handles `AGENTS.md`/`CLAUDE.md`, scaffolded project artifacts, and legacy three-file AGENTS.md collapse. It never runs `flowai update`, `flowai sync`, or rewrites installed primitives/plugin caches/user-level dirs; local primitive adaptation is delegated to `adapt`.
- **Tasks:** [simplify-update-boundaries](tasks/2026/05/simplify-update-boundaries.md)
- **Acceptance verified by acceptance tests:** `update-basic`, `update-asset-drift-no-sync`, `update-template-vs-artifact`, `update-plugin-user-scope`

### FR-ADAPT: Standalone Primitive Adaptation — `adapt` [ANC:fr:adapt]

- **Description:** On-demand adaptation of project-local flowai primitives (skills, agents, AGENTS.md artifact, hooks) to project specifics — independent of `update`. Plugin-installed and user-level primitives are read-only and skipped. Uses `skill-adapter` subagent for skills and `agent-adapter` subagent for agents. Supports filtering by type (`--skills`, `--agents`, `--assets`, `--hooks`) and by name.
- **Tasks:** [simplify-update-boundaries](tasks/2026/05/simplify-update-boundaries.md), [remove-flowai-prefix-from-primitives](tasks/2026/05/remove-flowai-prefix-from-primitives.md)
- **Use case scenario:** Developer installs flowai on a Python project. All skills contain generic Deno examples. Runs `/adapt` to adapt all primitives to Python/pytest/ruff. Can also run `/adapt --skills commit` to adapt a single skill.
- **Acceptance verified by acceptance tests:** `adapt-skills-basic`, `adapt-agents-basic`, `assets-plugin-local-template`

#### FR-ADAPT.SKILLS Skill Adaptation [ANC:fr:adapt.skills]

- **Desc:** Scans `{ide}/skills/` for `flowai-*` directories, launches `skill-adapter` subagent per skill in parallel, shows diff, asks confirmation.
- **Acceptance:**
  - [ ] Scans installed skills in IDE config dirs.
  - [ ] Launches parallel `skill-adapter` subagents.
  - [ ] Shows diff per skill, asks user confirmation.
  - [ ] Reverts rejected adaptations.

#### FR-ADAPT.AGENTS Agent Adaptation [ANC:fr:adapt.agents]

- **Desc:** Scans `{ide}/agents/` for `flowai-*` files, launches `agent-adapter` subagent per agent in parallel, shows diff, asks confirmation. Frontmatter preserved as-is.
- **Acceptance:**
  - [ ] Scans installed agents in IDE config dirs.
  - [ ] Launches parallel `agent-adapter` subagents.
  - [ ] Shows diff per agent, asks user confirmation.
  - [ ] Frontmatter unchanged after adaptation.

#### FR-ADAPT.ASSETS AGENTS.md Artifact Verification [ANC:fr:adapt.assets]

- **Desc:** Compares the AGENTS template with project artifacts (AGENTS.md) and proposes updates for outdated framework sections. The template location depends on install mode and MUST be resolved in priority order: skill-local plugin asset (`.{ide}/skills/adapt/assets/AGENTS.template.md`, for plugin/user installs) → project-local copy (`.{ide}/assets/AGENTS.template.md`, for CLI `flowai sync`) → user-level copy. The SKILL.md references the template as `assets/AGENTS.template.md` so `build-plugins` inlines it into the adapt skill dir; reading only `{ide}/assets/` fails in plugin installs.
- **Acceptance:**
  - [ ] Reads asset mapping from `pack.yaml` or uses default mapping.
  - [x] Resolves the template from the skill-local plugin asset path when `.{ide}/assets/` is absent (plugin-install layout). Verified by acceptance test `assets-plugin-local-template`.
  - [x] `build-plugins` inlines `AGENTS.template.md` into `skills/adapt/assets/`. Evidence: `deno test -A scripts/build-plugins_test.ts --filter copies-pack-assets`.
  - [ ] Compares template vs artifact using `git diff --no-index`.
  - [ ] Proposes updates for outdated framework-originated sections.

#### FR-ADAPT.HOOKS Hook Adaptation [ANC:fr:adapt.hooks]

- **Desc:** Checks hook scripts in `{ide}/scripts/` for stack-specific commands, adapts if needed.
- **Acceptance:**
  - [ ] Scans hook scripts for stack-specific commands.
  - [ ] Skips stack-agnostic hooks.
  - [ ] Adapts stack-specific hooks with project commands.

### FR-PACKS: Pack System — Modular Resource Installation [ANC:fr:packs]

- **Description:** Reorganize framework resources into self-contained packs. Each pack is an autonomous directory containing commands, skills, agents, hooks, and scripts. Users select packs in `.flowai.yaml` instead of listing individual resource names. Replaces flat `framework/skills/` and `framework/agents/` structure.
- **Tasks:** [remove-flowai-prefix-from-primitives](tasks/2026/05/remove-flowai-prefix-from-primitives.md)
- **Use case scenario:** Developer runs `flowai sync` with `.flowai.yaml` containing `packs: [core, deno]`. Only resources from those packs are installed. Another developer with `packs: []` gets only core pack.
- **Priority:** High (enables scalable resource management, unblocks hooks/scripts).
- **Terminology:** "Command" has two meanings — (a) a user-only framework primitive under `framework/<pack>/commands/`, distributed into `.{ide}/skills/` with `disable-model-invocation: true` injected by the writer; (b) an IDE-native slash-command file under `.{ide}/commands/` owned by the user and managed by `flowai user-sync`. The CLI's `PlanItemType = "command"` refers only to (b).

#### FR-PACKS.STRUCT Pack Structure [ANC:fr:packs.struct]

- **Desc:** Each pack is a directory under `framework/<name>/` containing `pack.yaml` manifest and resource subdirectories (`commands/`, `skills/`, `agents/`, `hooks/`, `scripts/`). `commands/` holds user-only primitives; `skills/` holds agent-invocable primitives. Primitive names are short kebab-case without redundant `flowai-` or pack prefixes. Resources discovered by convention (directory scan), not listed in manifest.
- **Acceptance:**
  - [x] `pack.yaml` format: `name` (string), `version` (semver), `description` (string).
  - [x] Skills stored as `framework/<pack>/skills/<name>/SKILL.md`.
  - [x] Commands stored as `framework/<pack>/commands/<name>/SKILL.md`.
  - [x] Agents stored as `framework/<pack>/agents/<name>/SUBAGENT.md`.
  - [x] No dependencies between packs — each pack is self-contained.
  - [x] `framework/skills/` and `framework/agents/` removed. All resources live in packs.

#### FR-PACKS.CMD-INVARIANT Command source MUST NOT carry `disable-model-invocation` [ANC:fr:packs.cmd-invariant]

- **Desc:** SKILL.md files under `framework/<pack>/commands/` are the source of truth for user-only primitives. They MUST NOT declare `disable-model-invocation` in their frontmatter. The CLI writer (`injectDisableModelInvocation` in `cli/src/sync.ts`) injects `disable-model-invocation: true` at sync time based on directory placement. Directory is the single source of truth for the user-only classification.
- **Acceptance:**
  - [x] `scripts/check-skills.ts` rejects any `framework/<pack>/commands/*/SKILL.md` that carries `disable-model-invocation` in source. Verified by `check-skills_test.ts::validateKindInvariants: command WITH flag fails`.
  - [x] CLI reader `readPackCommandFiles` injects the flag into the in-memory copy returned to the writer. Verified by `sync_test.ts::readPackCommandFiles - injects disable-model-invocation into SKILL.md`.
  - [x] End-to-end sync test `main_test.ts::sync - pack commands install into .{ide}/skills/ with injected flag` asserts the installed SKILL.md contains the flag.

#### FR-PACKS.SKILL-INVARIANT Skill source MUST NOT carry `disable-model-invocation` [ANC:fr:packs.skill-invariant]

- **Desc:** SKILL.md files under `framework/<pack>/skills/` are agent-invocable by definition. They MUST NOT declare `disable-model-invocation` at all. A primitive that is user-only belongs under `commands/`, not `skills/`.
- **Acceptance:**
  - [x] `scripts/check-skills.ts` rejects any `framework/<pack>/skills/*/SKILL.md` that carries `disable-model-invocation` in source. Verified by `check-skills_test.ts::validateKindInvariants: skill WITH flag fails`.

#### FR-PACKS.CONFIG Config v1.1 [ANC:fr:packs.config]

- **Desc:** `.flowai.yaml` version `"1.1"` adds `packs:` field. `skills.include/exclude` applies after pack expansion.
- **Acceptance:**
  - [x] `packs:` field: list of pack names to install.
  - [x] `packs: []` (empty) = install only `core` pack.
  - [x] `packs` absent + `version: "1.0"` = all resources (backward compat).
  - [x] `skills.exclude`/`skills.include` applied AFTER pack expansion.
  - [x] v1 config auto-migrated to v1.1 on `flowai sync` (adds all packs).

#### FR-PACKS.VERSION Pack Versioning [ANC:fr:packs.version]

- **Desc:** `flowai sync` displays version changes informionally. No pinning — always installs latest from bundle.
- **Acceptance:**
  - [x] `flowai sync` output shows pack versions.

#### FR-PACKS.BUNDLE Bundle Update [ANC:fr:packs.bundle]

- **Desc:** `cli/scripts/bundle-framework.ts` scans the full `framework/*/` tree (pack-aware, path-agnostic walk). Bundles commands, skills, agents, hooks, scripts, and assets from every pack.
- **Acceptance:**
  - [x] Bundle includes pack definitions and all pack resources.
  - [x] Existing tests updated for new bundle structure.
  - [x] Bundle walks `framework/<pack>/commands/` and `framework/<pack>/skills/` without hardcoded subtree enumeration.

#### FR-PACKS.DEFAULTS Default Packs [ANC:fr:packs.defaults]

- **Desc:** `flowai init` (interactive config generation) defaults to all packs.
- **Acceptance:**
  - [x] Generated `.flowai.yaml` includes all available packs.

### FR-HOOK-RESOURCES: Hook Resources [ANC:fr:hook-resources]

- **Description:** Packs contain hooks — Deno TS scripts triggered by IDE events (PostToolUse, PreToolUse). Hooks are IDE-agnostic: stored as `hook.yaml` + `run.ts`, installed by flowai with IDE-specific configuration generation. Claude Code naming as canonical; flowai transforms for other IDEs.
- **Use case scenario:** Pack `core` contains `skill-structure-validate` hook. `flowai sync` for Claude Code adds entry to `settings.json` hooks section; for Cursor — generates `.cursor/hooks.json`; for OpenCode — generates plugin file.
- **Priority:** Medium (new resource type, depends on FR-PACKS).

#### FR-HOOK-RESOURCES.FORMAT Hook Format [ANC:fr:hook-resources.format]

- **Desc:** Hook = directory with `hook.yaml` (metadata) + `run.ts` (Deno script). Located at `framework/<pack>/hooks/<name>/`.
- **Acceptance:**
  - [x] `hook.yaml` fields: `event`, `matcher` (optional), `description`, `timeout` (optional, default 30/600).
  - [x] Supported events: PostToolUse, PreToolUse, SessionStart. Event/tool name mapping per IDE.
  - [x] `Stop` (turn-end) supported in the plugin-bundle path — `emitHooks` is event-agnostic, so a `Stop` hook flows into `hooks.json` under a top-level `Stop` key. Verified by `scripts/build-plugins_test.ts::emits-stop-event-hooks-json`. Effective turn-end-hook support is **Claude Code only** (empirically probed 2026-06): Codex `codex exec` never fires `Stop` (only `SessionStart`), OpenCode `session.idle` is observation-only, and the `cursor-agent` CLI runs no `.cursor/hooks.json` hooks. A per-IDE `flowai sync` mapping for `Stop` would therefore be inert on non-Claude IDEs and is intentionally NOT pursued for the `doc-anchors-validate` hook.
  - [x] `run.ts` uses stdin JSON contract (Claude Code canonical format). Cursor/OpenCode wrappers normalize format. SessionStart hooks output `hookSpecificOutput.additionalContext`.
  - [x] Framework hooks: `skill-structure-validate` (devtools, PostToolUse), `status` (memex, SessionStart), `doc-anchors-validate` (beta, Stop).

#### FR-HOOK-RESOURCES.INSTALL IDE-Specific Installation [ANC:fr:hook-resources.install]

- **Desc:** flowai reads `hook.yaml` and generates IDE-specific configuration. Manifest tracks installed hooks for clean deinstallation.
- **Acceptance:**
  - [x] Claude Code: 3-level nested entry in `settings.json` hooks section.
  - [x] Cursor: flat entry in `.cursor/hooks.json`.
  - [x] OpenCode: generated plugin file `.opencode/plugins/flowai-hooks.ts`.
  - [x] Manifest `.{ide}/flowai-hooks.json` tracks installed hooks. Removed hooks cleaned from IDE config.
  - [x] Merge preserves user hooks (not in manifest).

#### FR-HOOK-RESOURCES.SYNC-INFRA Hook Sync Infrastructure [ANC:fr:hook-resources.sync-infra]

- **Desc:** flowai discovers, reads, copies hook files, generates IDE config, and tracks actions in SyncResult.
- **Acceptance:**
  - [x] Hook discovery: `extractPackHookNames()` extracts hooks from `framework/<pack>/hooks/`.
  - [x] Hook files copied to `.{ide}/scripts/` during sync.
  - [x] `resolvePackResources()` includes `hookNames` in return.
  - [x] `SyncResult.hookActions` tracks per-hook actions.

### FR-SCRIPTS: Script Resources [ANC:fr:scripts]

- **Description:** Packs can contain scripts — utility shell/Deno scripts callable by skills via bash. Not tied to IDE events. Copied to `.{ide}/scripts/` at install time.
- **Priority:** Low (simple copy, depends on FR-PACKS).
- **Acceptance:**
  - [x] **FR-SCRIPTS.STORE** Scripts stored at `framework/<pack>/scripts/<name>`.
  - [x] **FR-SCRIPTS.COPY** Copied to `.{ide}/scripts/` during sync.

### FR-PLAN-VARIANT-ARCHETYPES: Solution-Variant Archetypes for Non-Obvious Tasks [ANC:fr:plan-variant-archetypes]

- **Description:** For a non-obvious task, the `plan` skill's Step 4 variant analysis MUST cover three distinct solution archetypes — quick fix (minimal scope, may incur tech debt), architecturally-correct (correct design within current constraints/scope), and best long-term (strategic, optimizes maintainability over the horizon, may exceed current scope) — each with Pros/Cons/Risks plus cross-variant trade-offs. The agent MAY add further options. The obvious-task single-variant exception is preserved. `ship` inherits the mandate via composite regeneration from the `plan` atom. The shipped `AGENTS.md` `Variant Analysis` canon stays an abstract, domain-agnostic comparison format (no plan- or archetype-specific content).
- **Tasks:** [plan-variant-archetypes](tasks/2026/06/plan-variant-archetypes.md), [plan-reco-root-cause-ranking](tasks/2026/06/plan-reco-root-cause-ranking.md)
- **Scope:**
  - Non-obvious task → variant set covers quick-fix, architecturally-correct, best-long-term archetypes (judged by intent; labels may vary).
  - Obvious task → exactly one variant (no regression).
  - When two archetypes collapse into one option, the agent states so and still surfaces a distinct third.
  - The `AGENTS.md` `Variant Analysis` bullet contains no plan/archetype-specific tokens; the rule name is retained.
  - Recommendation ranking: when variants differ in root-cause fidelity, the recommendation ranks root-cause fidelity above smallest-diff / lowest-speculative-risk, names the root cause it addresses, and justifies any rejection of a root-cause variant with inspected-caller evidence — not an un-verified speculative risk.
- **Acceptance verified by acceptance tests:** `plan-variants-complex`, `plan-variants-obvious`, `plan-recommends-root-over-symptom`
- **Status:** [x]
  - Note (`plan-recommends-root-over-symptom`): regression-guard, not RED-first. The mis-ranking failure (SWE-bench django-14792) stems from large-codebase caller-uncertainty, which a small self-contained acceptance fixture cannot reproduce — the scenario passes on both `claude-sonnet-4-6` and `claude-haiku-4-5` before and after the rule. It guards against future regression of the ranking discipline; the rule was added as defensive guidance per an explicit RED-first waiver.

### FR-PLAN-OUTCOME-COMPLETENESS: Plan Covers Stated Outcomes, Affected Surface, and Explicit Scope Cuts [ANC:fr:plan-outcome-completeness]

- **Description:** When the request has a definite outcome set (stated behaviors, named acceptance conditions, a deliverable list), the `plan` skill MUST (a) seed the task file's `## Definition of Done` with one bullet per stated outcome, preserving concrete expected results verbatim; (b) enumerate the affected surface proportionally to the blast radius (code: callers and duplicated/parallel logic; infrastructure: environments, regions, dependent services, scheduled jobs; process/non-IT: affected people, downstream steps), covering or explicitly excluding each item with inspected evidence; (c) surface outcome coverage as a heading-level property: every variant title ends with a scope marker (`— full scope`, or `— partial: drops <outcomes>` / `— partial: covers N of M stated outcomes`), with dropped outcomes also named in the variant's Cons — a stated outcome must appear in ≥1 variant or be explicitly named as deferred at selection time; and (d) after triage, verify every stated outcome maps to a DoD item, a Solution step, or a `## Follow-ups` entry naming the deferral reason. The scope choice itself stays with the human, made at variant selection on visible information. Open-ended/exploratory requests route ambiguity to the clarifying-question gate instead. `ship` inherits via composite regeneration from the `plan` atom.
- **Tasks:** [plan-outcome-completeness](tasks/2026/07/plan-outcome-completeness.md), [plan-surface-scout-critic](tasks/2026/07/plan-surface-scout-critic.md)
- **Scope:**
  - DoD seeded from the request's own wording at Step 3 (verbatim expected values; related outcomes may collapse into one bullet with a single acceptance check; placeholder fallback when no discrete outcomes stated).
  - Affected-surface enumeration at Step 2, conditional and proportional; undisclosed duplicated sites must be discovered proactively.
  - **Independent surface pass (loop5, 2026-07-05)**: where the environment provides the pre-declared `surface-scout` agent (`framework/core/agents/surface-scout.md`, read-only), Step 2 dispatches it with the user's VERBATIM request (never the planner's restatement or fix site); Step 3 persists the scout's raw output VERBATIM plus plain-bullet disposition rows (`covered-by` / `not affected — inspected per-domain evidence` / `deferred — human choice`) in `### Affected Surface` under `## Overview` (checkbox syntax forbidden — protects `deriveStatusFromDoD`). No subagent support → visible degradation line under `## Follow-ups`. Residual risk (declared): all inter-agent channels are mediated by the orchestrating agent; active falsification of the verbatim block remains possible — the same trust class as every existing primitive; human + `review` are downstream checkers.
  - **Independent critique (loop5, 2026-07-05)**: Step 6 dispatches the pre-declared `plan-critic` agent (`framework/core/agents/plan-critic.md`, fresh-context adversarial reviewer that recomputes the scout-vs-table diff itself) when the scout block exists OR 2+ variants were presented; objections surface verbatim; Step 7 per-item triage labels unchanged (the human sees every objection + label). Fallback: self-critique + degradation line.
  - Scope-cut transparency at Step 4: scope marker in every variant title (full scope / partial with named drops or a count), details in Cons; user-selected cuts recorded under `## Follow-ups`; silent drops are planning defects.
  - Completeness check at Step 7 complements the Rule-8 acceptance-tuple walk (items↔tuples vs request↔items) and verifies no dangling `covered-by` pointers in `### Affected Surface`.
- **Acceptance verified by acceptance tests:** `plan-dod-covers-stated-outcomes`, `plan-records-dropped-outcomes`, `plan-affected-surface-scout`, `plan-uses-scout-findings`, `plan-surface-non-code`, `plan-surface-degradation`, `plan-auto-critique`
- **Status:** [ ]
  - Note (both scenarios): regression-guards, not RED-first. The 2026-07-02 RED attempts PASSED on the unchanged atom — in a small self-contained fixture `claude-sonnet-4-6` already seeds the DoD, discovers the duplicated site, and defers the user-cut scope to Follow-ups. The real failure mode (SWE-bench INCOMPLETE_FIX family, 9-10/11 of the 2026-07-02 failures) stems from large-codebase attention pressure that a small fixture cannot reproduce; the discipline was added as defensive guidance per an explicit RED-first waiver (precedent: `plan-recommends-root-over-symptom`). The empirical evidence for the change is the benchmark re-run.
  - Coverage gap (point c, heading scope marker): the variant-title marker requirement (`— full scope` / `— partial: …`, added 2026-07-02 per explicit user TDD waiver) is NOT verified by any scenario — `plan-records-dropped-outcomes` checks Cons + `## Follow-ups` only. Closing the gap = extend that scenario's checklist with a title-marker item (no new scenario: same execution path).

#### FR-PLAN-OUTCOME-COMPLETENESS.REUSE: Reuse Before New Code [ANC:fr:plan-outcome-completeness.reuse]

- **Description:** During affected-surface enumeration (point b), the `plan` skill MUST search for an existing implementation to reuse before proposing new code; proposing a new implementation where an existing one fits is a planning defect and must be justified in the variant. Realizes `[REF:pr:reuse | PR-REUSE]`; prevents duplication (`[REF:fm:shape.dup | FM-SHAPE.DUP]`).
- **Acceptance:** `plan-reuse-before-new` (benchmark to be authored)
- **Status:** [ ]

### FR-REFLECT: Reflection with Session History Search and Self-Criticism [ANC:fr:reflect]

- **Description:** Reflection skills (`reflect`, `reflect-by-history`) must search session history for similar errors/mistakes, identify patterns, and include findings in output. Before presenting the final report, the agent must perform self-criticism — validate findings, check for false positives and blind spots, evaluate proportionality of proposed fixes, and revise the report accordingly.
- **Acceptance verified by acceptance tests:** `reflect-session-history-pattern`, `reflect-context-inefficiency`, `reflect-process-loop`, `reflect-self-criticism`, `reflect-by-history-self-criticism`

### FR-CICD: CI/CD Pipeline Security [ANC:fr:cicd]

- **Description:** GitHub Actions workflow (`.github/workflows/ci.yml`) must follow supply chain security and least privilege practices.
- **Tasks:** [extract-cli-to-separate-repo](tasks/2026/05/extract-cli-to-separate-repo.md), [ci-bump-actions-to-node24](tasks/2026/06/ci-bump-actions-to-node24.md)
- **Scenario:** Contributor pushes to main or opens PR. CI runs checks with minimal permissions; release steps get elevated permissions only when needed. Third-party actions cannot modify repository files.
- **Acceptance:**
  - [x] **FR-CICD.PIN SHA pinning**: All third-party GitHub Actions pinned to full commit SHA with version comment.
  - [x] **FR-CICD.PRIV Least privilege**: Check job uses `contents: read` only. Write permissions (`contents: write`, `id-token: write`) granted only to release job, gated on `push` to `main`.
  - [x] **FR-CICD.INTEGRITY File integrity**: After third-party setup steps (`checkout`, `setup-deno`) and after `deno task check`, verify no unexpected file modifications via `git diff --exit-code` + untracked file check. Fail pipeline if integrity violated.
  - [x] **FR-CICD.JOBS Job separation**: Pipeline split into `check` (read-only) and `release` (write) jobs. `release` depends on `check` success.
  - [x] **FR-CICD.SPLIT Two-repo topology (post-split)**: After CLI extraction (see FR-DIST.BUNDLE.PIN), CI splits across two repos. Framework repo (`korchasa/flowai`) keeps the `check` job and adds a `release-framework-tarball` step that uploads `framework.tar.gz` + `framework.tar.gz.sha256` as assets of a `framework-v<version>` GitHub release; framework repo no longer publishes to JSR. CLI repo (`korchasa/flowai-cli`) runs its own `check` job (fmt, lint, TS tests; no framework validators, no acceptance tests) on PR/`main` and publishes `@korchasa/flowai` to JSR via OIDC on tag `v*`. OIDC trust binding for `@korchasa/flowai` rebound from `korchasa/flowai` to `korchasa/flowai-cli` exactly once at the Phase 3 cutover.

### FR-REVIEW-SPLIT: Responsibility Separation: Review vs Commit [ANC:fr:review-split]

- **Description:** Clear separation of concerns between `review` and `commit`:
  - Review owns: project checks (lint/test), hygiene scan, code quality verdict
  - Commit owns: documentation audit, atomic grouping, commit execution, task file cleanup
  - Review MUST NOT do atomic commit grouping (SA3). Commit MUST NOT run project checks.
- **Acceptance verified by acceptance tests:** `commit-no-checks`, `review-no-grouping`

### FR-JIT-REVIEW: JIT Review Skill — `jit-review` [ANC:fr:jit-review]

- **Description:** JiT-subset of the `review` atom. Given a diff (staged, unstaged, or commit-range), the review skill synthesizes ephemeral **Catching JiTTests** — temporary tests that pass on the parent revision and fail on the diff revision — as part of the same review pass. Adapts Meta's Intent-Aware JiTTests pipeline (FSE 2026) to flowai's language-agnostic `test`-command interface declared in AGENTS.md. Activates automatically inside every `review` invocation and every composite that uses it (`review-and-commit`, `ship`); no separate user-facing skill or command.
- **Tasks:** [merge-jit-review-into-review-atom](tasks/2026/05/merge-jit-review-into-review-atom.md)
- **Scope:** Interleaved into `framework/atoms/review.md` as step 2b (parent baseline), 3d-e (intent hints + inference), 6/7/8 side-channel risk hypotheses, 8a (mutant + ephemeral test synthesis), 8b (dual-run + filter), extended step 10 (report sections: Intents, Catching Tests, Uncovered Risks, Degradation Notes), and step 11 (ephemeral dispose prompt). NOT a standalone skill.
- **Scenario:** Developer prepares a diff (staged or unstaged) and invokes `/review` (or a composite that runs `review` as a phase). The agent:
  1. Collects the diff target and resolves the parent revision via `git worktree add` (or `git show` fallback).
  2. Runs the declared `test`/`check` command on parent (step 2b); if parent baseline is red, JiT subset disables itself and review continues (graceful degradation).
  3. Infers ≤5 intents per diff and ≤3 risk hypotheses per intent as a side-channel during the existing code-review reading passes (steps 3e, 6, 7, 8).
  4. Synthesizes one mutant per risk (≤15 mutants total); skips on pure code deletion or other degradation triggers.
  5. Writes catching-test candidates into a session-id'd ephemeral directory (outside the main test tree, not under git, stable within session).
  6. Dual-runs tests on parent and diff; optionally mutant-probes unless the time-budget degradation is active (>30s per test invocation).
  7. Filters flaky / duplicate / zero-kill tests.
  8. Reports surviving catching tests as `[critical]` findings inside the existing review verdict gate (no separate JiT gate); a surviving catching test pushes verdict to `Request Changes`.
  9. Interactively asks the user to `save` (move to main test tree) or `discard` (delete scratch dir).
- **Constraints:**
  - Language-agnostic: MUST use the `test`/`check` command declared in AGENTS.md "Development Commands"; MUST NOT hardcode stack-specific runners (deno/npm/pytest/etc.).
  - Graceful degradation, not fail-fast: if AGENTS.md declares no `test`/`check` command, OR parent baseline is red, OR diff is pure-deletion, OR diff exceeds ~10 files / ~500 LOC, the JiT subset disables itself silently. Review continues; the lost signal is recorded in the report's `### Degradation Notes` section.
  - MUST NOT modify production code; MUST NOT write tests into the main test tree without explicit user `save` consent.
  - Mutant budget: ≤5 intents × ≤3 risks × 1 mutant = ≤15 mutants. Report top-5 catching tests by severity × uniqueness.
  - Verdict gate is shared with `review`: catching tests that fail-on-diff are `[critical]` findings; no second gate.
  - Ephemeral tests live under a session-id'd scratch directory (`.flowai/review-jit/<sid>/` with `.gitignore` ensure, or `$(mktemp -d)/review-jit-<sid>/`); session-id MUST be unique per invocation so parallel reviews do not clobber each other.
- **Acceptance verified by acceptance tests:** `review-catches-regression-via-jittests`, `review-no-change-no-alarm`

### FR-DIAGNOSE-BENCH: Benchmark Failure Diagnostic Skill — `diagnose-benchmark-failure` [ANC:fr:diagnose-bench]

- **Description:** Agent-invocable skill that, given a failed benchmark scenario ID, reads the run artifacts (`acceptance-tests/runs/latest/<scenario-id>/run-1/judge-evidence.md`, the sandbox copy of the failing primitive's `SKILL.md`, and the scenario `mod.ts`), pattern-matches the symptoms against a documented failure-mode taxonomy (MD-PRIOR-BULLETS, HEADING-INSTEAD-OF-ITEM, STALE-SKILL-IN-SANDBOX, SKILL-NOT-MOUNTED, COMPOSITE-DELEGATION-BYPASS, PERSONA-MISMATCH, TEST-FITTING-PERSONA, CROSS-PACK-REFERENCE-MISSING), and produces an evidence-grounded diagnostic report.
- **Scope:** Lives under `framework/engineering/skills/diagnose-benchmark-failure/`. Model-invocable. Triggered by user prompts about diagnosing/investigating a specific failed benchmark run, or by an agent's own follow-up after observing a benchmark failure during Acceptance Test TDD.
- **Constraints:**
  - Read-only: MUST NOT edit any source file (no `SKILL.md`, `mod.ts`, SRS/SDS, etc.). Output is a report; downstream agents apply fixes.
  - Evidence-grounded: every claim in the report must cite a quoted line from `judge-evidence.md`, the sandbox `SKILL.md`, or the scenario `mod.ts`. Hypotheses without artifact citations are invalid.
  - Fail-closed: if any of the three required artifacts is missing, the skill stops and reports the gap rather than proceeding with partial data.
  - Taxonomy-grounded: classifications use the documented codes; novel modes only when the documented set is empirically ruled out.
- **Acceptance verified by acceptance tests:** `diagnose-benchmark-failure-md-prior-bullets`
- **Status:** [x]

### FR-AI-IDE-RUNNER: AI IDE Runner Skill — `ai-ide-runner` [ANC:fr:ai-ide-runner]

- **Description:** Agent-invocable skill that spawns another AI IDE runtime (`claude`, `opencode`, `cursor-agent`, `codex`) from the current session in non-interactive mode, captures its stdout, and relays it back verbatim. Enables single-IDE "second opinion" runs, multi-IDE fan-out comparisons, and multi-model comparisons within one IDE.
- **Tasks:** [ide-bridge-pack](tasks/2026/05/ide-bridge-pack.md)
- **Scope:** Lives under `framework/beta/skills/ai-ide-runner/` (cross-IDE delegation skills live in the `beta` pack alongside `delegate-to-ide` + `worker` — see FR-IDE-BRIDGE-WORKER, FR-IDE-BRIDGE-DELEGATE). Model-invocable. Triggered by queries like "run in <ide>", "compare <ide> vs <ide>", "try on <model>", "which IDE handles X better".
- **Constraints:**
  - MUST relay the child runtime's stdout byte-for-byte; MUST NOT synthesise a "better" answer from the outer model's weights. The skill is a courier, not a co-author.
  - MUST default to the vendor's native IDE when the user names only a model: Anthropic/Claude → `claude`; OpenAI/GPT → `codex`; Cursor's own Composer → `cursor-agent`. Route to OpenCode only when the user says "in OpenCode", asks for OpenRouter billing, or requests cross-provider fan-out.
  - MUST prefer native providers over routed variants in OpenCode (`anthropic/claude-sonnet-4.6` beats `openrouter/anthropic/claude-sonnet-4.6` unless the user explicitly asks for OpenRouter).
  - If the native provider fails (auth / not configured / model ID mismatch), MUST report the failure and stop — MUST NOT silently retry with a routed variant.
  - MUST apply the `CLAUDECODE=""` environment override when the caller is itself Claude Code and the child is `claude` (otherwise the inner CLI refuses with "already in a Claude session").
  - MUST NOT install or authenticate CLIs, persist transcripts, or judge output quality automatically.
- **Acceptance verified by acceptance tests:** `ai-ide-runner-fanout-parallel-claude-opencode`, `ai-ide-runner-opencode-provider-format`, `ai-ide-runner-single-cursor-read-only`, `ai-ide-runner-default-native-ide-for-model`

### FR-IDE-BRIDGE-WORKER: Cross-IDE Delegation Subagent — `worker` [ANC:fr:ide-bridge-worker]

- **Description:** Subagent that owns a single cross-IDE CLI invocation in an isolated context window. Receives `{target_ide}` (`codex` / `claude` / `opencode` / `cursor-agent`), optional `{model}`, and `{task_prompt}`; runs the target's non-interactive CLI exactly once; relays its stdout (or hook-block `reason` payload) byte-for-byte back to the parent. Single-shot — multi-turn / session-resume is explicitly out of scope. Lets a parent agent in IDE A delegate work to IDE B without the child's transcript flooding the parent's context.
- **Tasks:** [ide-bridge-pack](tasks/2026/05/ide-bridge-pack.md)
- **Scope:** Lives under `framework/beta/agents/worker.md`. Invoked via the parent IDE's subagent-dispatch mechanism (Claude Code `Agent`/`Task` tool, OpenCode `@<agent>` mention). Not directly user-invocable; spawned by `delegate-to-ide` (FR-IDE-BRIDGE-DELEGATE).
- **Constraints:**
  - MUST relay the child runtime's stdout byte-for-byte; MUST NOT synthesise an answer from the outer model's weights — the worker is a courier, not a co-author. Inherits the FR-AI-IDE-RUNNER output contract.
  - MUST treat a hook-blocked Bash call's `reason` payload as the child's stdout (verbatim relay applies to the mock prefix, including the `<TOOL>-MOCK:` token).
  - MUST issue exactly one Bash invocation to the target binary per task. Retries, fan-out, and follow-up calls are out of scope (use `ai-ide-runner` for one-shot relay/comparison; this worker does single-shot delegation).
  - MUST apply the `CLAUDECODE=""` prefix when the target is `claude` (otherwise the inner CLI refuses with "already in a Claude session").
  - MUST use OpenCode's mandatory `provider/model` format; MUST NOT silently fall back to routed providers on native failure.
  - MUST NOT install or authenticate CLIs, persist transcripts, judge output quality, or spawn nested subagents.
- **Acceptance verified by acceptance tests:** `delegate-to-ide-via-subagent` (end-to-end: parent skill → worker subagent → mocked Codex CLI → relay back to parent; verifies binary choice, single-shot invocation, and verbatim relay through the subagent path). The worker has no standalone acceptance scenario by design — `AcceptanceTestAgentScenario` exposes the agent file to the main runtime but does not execute it as a subagent (the main runtime sees the userQuery directly), so isolated worker tests do not actually exercise the worker's body. The wrapping `via-subagent` scenario is the only path that drives the worker as the SDK does in production. Pattern mirrored from `deep-research-worker`, which is also tested via its orchestrator only.

### FR-IDE-BRIDGE-DELEGATE: Cross-IDE Delegation Skill Wrapper — `delegate-to-ide` [ANC:fr:ide-bridge-delegate]

- **Description:** Agent-invocable skill that routes "delegate this task to another IDE" requests to the `worker` subagent (FR-IDE-BRIDGE-WORKER) instead of running the target CLI inline from the parent context. Preserves context isolation: the child CLI's transcript stays in the subagent's window, only the worker's relayed reply reaches the parent.
- **Tasks:** [ide-bridge-pack](tasks/2026/05/ide-bridge-pack.md)
- **Scope:** Lives under `framework/beta/skills/delegate-to-ide/`. Model-invocable. Triggered by queries like "delegate to <ide>", "have <ide> do <task>", "execute <task> in <ide>", "offload to <ide>". Disambiguation from FR-AI-IDE-RUNNER: that skill is the right fit for one-shot relay / fan-out comparison ("compare X vs Y", "try on <model>"); this skill is for delegating a task whose intermediate work should NOT flood the parent.
- **Constraints:**
  - MUST invoke the `worker` subagent via the host IDE's subagent-dispatch mechanism. MUST NOT shell out to the target CLI inline from the parent session — that defeats the context-isolation rationale of the skill.
  - On hosts without a native subagent mechanism (Cursor, Codex), MUST surface the limitation and route the user to `ai-ide-runner` for one-shot relay; MUST NOT silently fall back to inline parent-side Bash.
  - MUST relay the worker's quoted block verbatim to the user — no paraphrase, translation, or grammar fixes inside the block. Thin framing (target IDE label) outside the block is allowed.
  - MUST NOT fan out across multiple IDEs or run cross-model comparisons (use `ai-ide-runner` for those flows).
- **Acceptance verified by acceptance tests:** `delegate-to-ide-via-subagent`, `delegate-to-ide-trigger-pos-1`, `delegate-to-ide-trigger-adj-1`, `delegate-to-ide-trigger-false-1`

### FR-LOOP: Non-Interactive Runner — `flowai loop` [ANC:fr:loop]

- **Description:** Launch Claude Code non-interactively with a prompt. Base automation primitive. `flowai loop [OPTIONS] <prompt>`.
- **Acceptance:**
  - [x] CLI subcommand `loop` with flags: `--agent`, `--model`, `--cwd`, `--yolo`, `--timeout`, `--interval`, `--max-iterations`.
  - [x] Stream-json output processing with ANSI formatting and agent nesting depth tracking.
  - [x] 28 unit tests for pure functions, formatter, processNDJSONStream.

### FR-MEMEX: Memex Pack — `memex` [ANC:fr:memex]

- **Description:** Long-term knowledge bank for AI agents, packaged as a separate `memex` pack. Three agent-invocable skills operating on a memex directory (`raw/` + `pages/` + `AGENTS.md` schema + `log.md`):
  1. `save <path|url|text>` — atomic save: store source in `raw/` → extract entities → create / update memex pages → backlink audit → update index → append log. Scaffolds the memex on first call if no `AGENTS.md + pages/` ancestor is found.
  2. `ask <question>` — read index, open relevant pages, follow one wikilink hop, synthesise answer with `[[wikilink]]` citations, file the answer to `pages/answers/`, optionally promote to `pages/`. Honest about gaps; never falls back on training-data knowledge.
  3. `audit [--fix]` — deterministic structural audit (dead links, orphans, missing concept-gap sections, index drift) plus LLM-judgement layer (contradictions, stale claims, gap-question suggestions). `--fix` applies trivial auto-fixes (stub pages, missing-section append, index drift). Never auto-deletes or auto-resolves contradictions.
- **Tasks:** [adopt-salp-anchors](tasks/2026/06/adopt-salp-anchors.md)
- **Pack provides:**
  - `framework/memex/skills/memex-{save,ask,audit}/SKILL.md` — three agent-invocable skills.
  - `framework/memex/scripts/audit.ts` — deterministic Deno audit script (Map-based link graph, frontmatter-aware checks, no external deps).
  - `framework/memex/hooks/status/{hook.yaml,run.ts}` — `SessionStart` hook that walks up from cwd for `AGENTS.md + pages/`, injects memex status (page count, source count, last log entry, last audit date, ≥5 uncompiled-source nudge) as `additionalContext`.
  - `framework/memex/assets/AGENTS.md` — schema asset dropped into the memex root on scaffold.
- **Inherited primitives:**
  - From Karpathy's `llmwiki` (Memex-style persistent wiki maintained by an LLM): three operations, `raw/` / `pages/` / schema layering, `index.md` (catalog) + `log.md` (chronological, grep-friendly `## [YYYY-MM-DD] op | title`), one-source-touches-many-pages atomicity.
  - From ekadetov-llm-wiki: active memex detection (walk up from cwd), entity types (concept / person / source-summary), backlink audit via grep, deterministic audit script, contradiction callouts.
  - From nvk-llm-wiki: nested `AGENTS.md` as portable schema (vs `CLAUDE.md`), frontmatter-as-data, optional dual-link `[[slug|Name]] ([Name](slug.md))` when the memex is an Obsidian vault, structural-guardian nudge on session start, honest-gaps rule, ask-answer promotion two-step (file then offer promote).
- **Out of scope (intentionally minimal vs nvk):** multi-memex hub, research / thesis / librarian / projects commands, volatility / freshness scoring, qmd dependency.
- **Acceptance verified by acceptance tests:** `save-new`, `save-update`, `ask-citations`, `ask-honest-gap`, `audit-clean`, `audit-defects`.
- **Acceptance verified by tests:** `framework/memex/scripts/audit_test.ts` (6 tests covering DEAD_LINK, ORPHAN, MISSING_SECTION, INDEX_MISSING, INDEX_DEAD, clean-pass, missing-dir error); `framework/memex/hooks/status/run_test.ts` (4 tests covering page / source count, last-log / last-audit extraction, uncompiled detection, format nudge thresholds).
- **Status:** [x]

### FR-DOC-ANCHORS: SALP as Canonical Anchor Mechanism [ANC:fr:doc-anchors]

- **Description:** Adopt **SALP (Semantic Anchor / Link Protocol)** as the single canonical cross-reference grammar across every project surface — SRS, SDS, README, AGENTS, framework, code comments, memex pages. Grammar:
  - Anchor — `[ANC:<ns>:<id>]` — declares a named target.
  - Reference — `[REF:<ns>:<id>]` or `[REF:<ns>:<id> | <display>]` — points at a target.
  - `<ns>` matches `[a-z][a-z0-9-]*`. The set is open — any grammar-conformant value is accepted by the validator. Examples currently in use: `fr`, `sds`, `task`, `nfr`, `code`, `mx-concept`, `mx-person`, `mx-source`, `mx-answer`. New consumers may introduce new namespaces without amending this list; `scripts/lib/salp.ts` ships `EXAMPLE_NAMESPACES` as a documentation hint only.
  - `<id>` is lower-kebab.
  Salp-short form (`[ANC:id]` / `[REF:id]` without namespace) is REJECTED — the namespace is what carries the multi-hop disambiguation value the empirical sweep measured. Supersedes `FR-DOC-LINKS` (GFM-link mandate) and `FR-DOC-IDS` (GFM-link migration of `// FR-…` comments). Replaces wikilink (`[[X]]`) inside the memex pack.
- **Tasks:** [REF:task:2026-06-adopt-salp-anchors | adopt-salp-anchors]
- **Rationale:** The 2026-05-13/14/15 anchor-systems experiment (`flowai-experiments/anchor-systems/`, 240 trials, gpt-5.4-mini, six formats) measured SALP winning on every variant except `boundary`: mapping 0% → 80%, linting 20% → 100%, multi-hop 13% → 40% versus GFM-link baseline. The namespace is what produces the multi-hop gain (wikilinks lost 26.7% → 40% precisely because they lack namespace disambiguation between `mx-concept:oauth` and `mx-source:oauth`).
- **Scope:** Atomic replacement, no dual-link transition. After the four-phase cutover lands, no `[FR-X](path.md#…)`, no `[[slug]]`, and no `// FR-X` comment survives in target surfaces (excludes `flowai-experiments/` snapshot and `acceptance-tests/runs/` historical traces).
- **Out of scope:** First-class `flowai migrate-anchors` CLI verb in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli); downstream users invoke the shipped `scripts/migrate-to-salp.ts` directly per the AGENTS.template "Migrating from GFM" sub-section.
- **Acceptance verified by tests:** `scripts/lib/salp_test.ts` (parse, serialize, salp-short rejection, open-namespace acceptance, legacy-grammar detection); `scripts/check-salp_test.ts` (dead REF, duplicate ANC, open-namespace acceptance, legacy grammar, clean fixture, cross-file resolution); `scripts/migrate-to-salp_test.ts` (13 tests: GFM-FR conversion, SDS link, wikilink, dual-link, comment migration, idempotency, fail-fast, template-variable preservation); `scripts/check-fr-coverage_test.ts` (FR-DOC-ANCHORS has Acceptance field).
- **Acceptance verified by acceptance tests:** `plan-updates-index-on-new-fr`, `plan-updates-srs-task-back-pointer` (rewritten checklists assert SALP row format); memex scenarios `save-new`, `save-update`, `ask-citations`, `ask-honest-gap`, `audit-clean`, `audit-defects` (SALP-rewritten fixtures).
- **Acceptance verified by command:** three grep guards return zero hits across the target surface (post-Phase-4): `! git grep -nE '\[\[[a-z0-9-]+(\|[^]]+)?\]\]' -- framework/ documents/ README.md scripts/ AGENTS.md ':!flowai-experiments/' ':!acceptance-tests/runs/' ':!acceptance-tests/cache/'`; `! git grep -nE '// FR-[A-Z]' -- scripts/ framework/ ':!acceptance-tests/runs/' ':!acceptance-tests/cache/'`; `! git grep -nE '\[FR-[A-Z][A-Z-]*\]\(' -- documents/ README.md AGENTS.md framework/ ':!flowai-experiments/' ':!acceptance-tests/runs/' ':!acceptance-tests/cache/'`.
- **Status:** [ ]

#### FR-DOC-ANCHORS.HOOK: Turn-End SALP Validation Hook [ANC:fr:doc-anchors.hook]

- **Desc:** Framework hook `doc-anchors-validate` that, on turn-end (`Stop`), validates SALP anchors/refs across the user's repo and feeds dangling/duplicate findings back to the AGENT. The `reason` itself prescribes the fix method: the agent DELEGATES the mechanical fix to a subagent (Task / Agent / subagent tool) and then resumes its primary task — it does NOT fix inline and is NOT forced to stop — so mechanical clean-up never derails the main thread. Ships in the **opt-in `beta` pack** (plugin `flowai-beta`), NOT bundled into core — the turn-end mechanism is Claude-Code-only and beta-grade, so users adopt it deliberately. Self-contained `run.ts` (vendored pure parser; `jsr:` specifiers; no dependency on dev `scripts/`). Scan set comes from `git ls-files --cached --others --exclude-standard` in a git work tree (so `.gitignore`d paths are never scanned), falling back to a manual denylist walk (skip `.git`, `node_modules`, `dist`, `build`, `.{ide}`) outside a repo; both layers also drop `_test.ts` / fixtures / run-artifact surfaces (`isSkippedPath`). A consuming project narrows the scan two further ways, both additive to the built-ins: (1) committed `.salpignore` dot-files — `.gitignore`-style glob lists, each rooted at its own directory (patterns matched relative to it), deeper files overriding shallower, `!` re-including, `#`/blank lines skipped; this is the preferred mechanism because the exclusion lives in-repo next to the fixtures it silences; (2) the `FLOWAI_DOC_ANCHORS_SKIP` env var (comma-separated path substrings) for ad-hoc/non-committed skips — for repos whose fixture/example layout differs from flowai's own conventions (e.g. plural `fixtures/`, or an experiment's tree of intentionally-malformed/duplicate tokens). Reuses `stripNonReferenceContext` semantics so grammar examples in fenced/inline code are not parsed as real anchors.
- **Tasks:** [REF:task:2026-06-hook-findings-subagent-delegation | hook-findings-subagent-delegation]
- **Scenario:** Agent edits docs across several files within a turn, leaving a `[REF:ns:id]` whose `[ANC:ns:id]` it never added. At turn-end the hook scans the settled tree, finds the dead-ref, and returns `decision: block` + `reason` listing it; the agent delegates the fix to a subagent (which adds the anchor or removes the ref) and resumes its primary task.
- **Design:**
  - Validates the SETTLED end-of-turn state (variant B) — in-turn forward-refs / rename chicken-and-egg produce no finding, eliminating per-write livelock.
  - Findings → `decision: block` + `reason` (agent-directed, not user-directed). The reason prescribes delegation: fix via a subagent, then resume the primary task (no stop directive) — keeping the fix out of the main agent's reasoning thread. Anti-loop guard: stdin `stop_hook_active === true` → `exit 0` silently (bounds to one forced follow-up turn). No findings, or zero SALP tokens in tree → `exit 0` silently (zero cost/noise for non-SALP repos).
  - Project-supplied skip folders: `FLOWAI_DOC_ANCHORS_SKIP` (comma-separated path substrings) is read via `readSkipEnv` and merged into `isSkippedPath`; production runs the hook under `deno run -A` so the env read is permitted (dev shebang grants `--allow-env=FLOWAI_DOC_ANCHORS_SKIP` explicitly).
  - Committed per-directory skips: `.salpignore` files (basename `SALP_IGNORE_FILE`) are discovered during `collectFiles` (from `git ls-files` in a work tree, from the manual walk otherwise), parsed by `parseSalpIgnore` into anchored/`**`/`?`/dir-only/negated glob patterns, and applied via `isIgnoredBySalpIgnore` (ordered shallow→deep so a nested `.salpignore` overrides its parent; last matching pattern wins within a file). Read under `deno run -A`; fail-open on unreadable files.
  - Cross-IDE support (empirically probed 2026-06, live headless CLIs): **Claude Code only.** Claude `Stop` block→reason continues the agent and `stop_hook_active` flips true on the re-triggered stop (anti-loop verified). Codex (0.135) does NOT emit a turn-end hook in `codex exec` (`SessionStart` fires, `Stop` never does; feature flag renamed `codex_hooks`→`hooks`). OpenCode (1.15) `session.idle` is observation-only (no block/continue). Cursor `cursor-agent` CLI executes NO `.cursor/hooks.json` hooks (project or user level) — hooks are a Cursor IDE-app feature, not the CLI. On non-Claude IDEs the hook is not active (no degraded fallback).
- **Acceptance verified by tests:** `framework/beta/hooks/doc-anchors-validate/run_test.ts` (cross-file dead-ref, duplicate-anchor, settled-forward-ref-clean, code-span-ignored, no-tokens-silent, blocks-with-findings-reason, stop-hook-active-guard, collectFiles-respects-gitignore, isSkippedPath-honors-extra-substrings, readSkipEnv-parses-comma-list, collectFiles-respects-skip-env, salpignore-matches-gitignore-style-patterns, salpignore-deeper-file-overrides-shallower, collectFiles-respects-salpignore); `scripts/build-plugins_test.ts::emits-stop-event-hooks-json` (Stop emission), `scripts/build-plugins_test.ts::beta-pack ships-doc-anchors-stop-hook` (pack placement). flowai-cli cross-IDE install: `manual — korchasa` (pending external PR).
- **Status:** [ ]

### FR-DOC-LINKS: Interconnectedness Principle for Documentation (Superseded) [ANC:fr:doc-links]

- **Superseded by:** [REF:fr:doc-anchors | FR-DOC-ANCHORS]. The GFM-link mandate is replaced by the SALP `[ANC:ns:id]` / `[REF:ns:id | display]` grammar across every project surface.
- **Description (historical):** `framework/core/assets/AGENTS.template.md` previously declared GFM markdown links of the form `[descriptive text](relative/path.md#auto-slug)` the only allowed cross-reference grammar. SALP supersedes that rule project-wide.
- **Tasks:** [REF:task:2026-06-adopt-salp-anchors | adopt-salp-anchors]
- **Status:** [~] Superseded

### FR-DOC-IDS: GFM Link Migration — Code Comments and Documentation Map (Superseded) [ANC:fr:doc-ids]

- **Superseded by:** [REF:fr:doc-anchors | FR-DOC-ANCHORS]. The migration target (GFM-link in `//` comments) is itself superseded; all surviving comment references now use `// [REF:fr:<id>]`.
- **Description (historical):** Migrated all `// FR-<ID>` and `# FR-<ID>` comments to GFM-link form (`// [FR-X](path.md#…)`). Replaced by the SALP cutover documented in FR-DOC-ANCHORS.
- **Tasks:** [REF:task:2026-06-adopt-salp-anchors | adopt-salp-anchors]
- **Status:** [~] Superseded

### FR-DOC-INDEX: Agent-Maintained Documentation Index [ANC:fr:doc-index]

- **Description:** `plan` writes/updates a row in `documents/index.md` whenever it adds or modifies an FR section in SRS. Row format: `- [<NS>-<ID>](relative/path.md#anchor) — <one-line summary> — <status>`. File is grouped by namespace (FR / SDS / NFR), sorted by ID within each group. Created on first write by `plan`; never scaffolded by `init`. A `maintenance` back-fill MAY populate rows for pre-existing FR anchors in one pass (re-derives summary + status from SRS); subsequent edits remain `plan`'s responsibility.
- **Tasks:** [adopt-salp-anchors](tasks/2026/06/adopt-salp-anchors.md)
- **Scenario:** Agent plans a task that introduces FR-XYZ → adds FR-XYZ section to SRS → appends `- [FR-XYZ](requirements.md#fr-xyz-...) — <summary> — [ ]` under `## FR` in `documents/index.md`. Subsequent status flip to `[x]` updates the same row.
- **Acceptance verified by acceptance tests:** `plan-updates-index-on-new-fr`.
- **Status:** [x]

### FR-DOC-TASKS: First-Class Committed Tasks [ANC:fr:doc-tasks]

- **Description:** Tasks are persistent canonical records — committed (NOT gitignored), one file per task at `documents/tasks/<YYYY>/<MM>/<slug>.md`. Frontmatter carries: `date` (YYYY-MM-DD; required), `status` ∈ `to do | in progress | done | superseded` (required), `implements: [FR-...]` (optional — present for FR-driven tasks, omitted for internal/maintenance), optional `tags: [...]`, optional `related_tasks: [...]` (markdown links to other task files), optional `migrated_from: "<old-id> (status: <old>)"` for provenance, optional `superseded_by: "<task-path>"` (required when status is `superseded`). Body uses GODS shape (Goal / Overview / Definition of Done / Solution). Architectural decisions are recorded as regular tasks with weighed alternatives surfaced inline (no separate ADR primitive). Validated by `scripts/check-task-format.ts` — wired into `deno task check`. `plan` writes this layout.
- **Scenario:** User invokes `/plan add cache layer to CLI` → skill writes `documents/tasks/2026/05/add-cache-layer.md` with new-shape frontmatter (`date: 2026-05-07`, `status: to do`, `implements: [FR-CACHE]`).
- **Constraints:**
  - Path MUST match `documents/tasks/<YYYY>/<MM>/<slug>.md` (kebab-case slug).
  - `status` value MUST come from the task-state set (`to do`, `in progress`, `done`, `superseded`); legacy ADR statuses (`accepted` / `implemented` / `proposed`) are rejected by the validator. `superseded` MUST carry `superseded_by` and is excluded from DoD-derived status checks.
  - Tasks NEVER deleted by commit-cleanup (persistent canonical records).
- **Acceptance verified by acceptance tests:** `plan-writes-task-new-frontmatter`.
- **Status:** [x]

### FR-DOC-TASK-LIFECYCLE: Task Status Derived from DoD by Commit Skills [ANC:fr:doc-task-lifecycle]

- **Description:** `commit` and `review-and-commit` derive `status` from `## Definition of Done` checkbox state on every commit that stages a non-superseded `documents/tasks/**/*.md` file with new-shape frontmatter (presence of `date:`). Algorithm: count top-level `- [ ]`/`- [x]` items K of N under `## Definition of Done`; map `K=0 → "to do"`, `0<K<N → "in progress"`, `K=N → "done"`. If the derived value differs from the current frontmatter `status`, rewrite the frontmatter line and `git add` the file as part of the same commit. Idempotent. Never downgrades `done` (manual re-open required). `superseded` is manually set, requires `superseded_by`, and is excluded from DoD derivation because stale original DoD no longer maps to current reality. Warn-only on parse errors / missing DoD section. Legacy flat-path tasks (no `date:`) are skipped for status derivation — preserves coexistence with unmodified `plan`. Task files of ANY shape (new-shape or legacy) are NEVER deleted by `commit` — persistence is the invariant; status derivation is the only lifecycle action.
- **Scenario:** Developer commits a fix that ticks the last DoD box of `documents/tasks/2026/05/add-cache-layer.md`. `commit` re-counts the DoD items (N/N), sees `status: in progress`, rewrites frontmatter to `status: done`, and stages the file alongside the developer's diff.
- **Constraints:**
  - MUST run only on commits — no out-of-band flips.
  - MUST be idempotent: re-committing an already-derived task is a no-op.
  - MUST NOT downgrade `done`. Other transitions are bidirectional.
- **Acceptance verified by acceptance tests:** `commit-flips-task-status`, `commit-derives-in-progress-status`, `commit-preserves-superseded-task-status`, `review-and-commit-flips-task-status`.
- **Status:** [x]

### FR-DOC-TASK-CONTEXT: Plan Skill Loads Related Tasks into Step 2 [ANC:fr:doc-task-context]

- **Description:** `plan` Step 2 ("Deep Context & Uncertainty") globs `documents/tasks/**/*.md`, parses each task's frontmatter `implements:` array, and reads (Read tool) tasks whose `implements:` set intersects the new task's `implements:` set. Cap: 10 most recent (by `date:`) related tasks. Loaded content informs the variant analysis and DoD synthesis so prior decisions are not contradicted. Empty `implements:` → no related-task lookup.
- **Scenario:** User runs `/plan` for a task that `implements: [FR-CACHE]`. Step 2 finds two prior tasks under `documents/tasks/` whose frontmatter also lists `FR-CACHE`, reads both, and references them in the variant analysis.
- **Acceptance verified by acceptance tests:** `plan-loads-related-tasks`.
- **Status:** [x]

### FR-DOC-TASK-LINK: SRS-Inline `**Tasks:**` Back-Pointer [ANC:fr:doc-task-link]

- **Description:** `plan` (and `epic`) inserts/extends a `- **Tasks:** [<slug>](tasks/<YYYY>/<MM>/<slug>.md)[, ...]` line directly after the `**Description:**` line in each SRS FR section listed in the new task's `implements:`. Surgical edit: only this single line is touched in the SRS — no other SRS content modified. Idempotent: re-running on the same task does not duplicate the link. Replaces the now-removed `## ADR` section in `documents/index.md` as the navigation surface from FR → its driving tasks.
- **Tasks:** [adopt-salp-anchors](tasks/2026/06/adopt-salp-anchors.md)
- **Scenario:** New task `documents/tasks/2026/05/add-cache.md` declares `implements: [FR-CACHE]`. Skill opens `documents/requirements.md`, finds `### FR-CACHE`, and inserts `- **Tasks:** [add-cache](tasks/2026/05/add-cache.md)` after the existing `**Description:**` line. Subsequent task `clear-cache.md` for the same FR appends `, [clear-cache](tasks/2026/05/clear-cache.md)` to the existing line.
- **Acceptance verified by acceptance tests:** `plan-updates-srs-task-back-pointer`.
- **Status:** [x]

### FR-DOC-RESCUE: Reflect Surfaces Decisions for Task Capture [ANC:fr:doc-rescue]

- **Description:** `reflect` adds a "Durable Findings Rescue" pass that scans the current task file for **decision passages** — passages with ≥2 weighed alternatives and explicit reasoning ("we picked X over Y because …", "considered A and B; chose A because …"). For each detected decision, reflect emits a chat message naming the decision and recommends `/plan` (the canonical-record writer) on its `**Recommended action:**` line. Reflect itself remains read-only — it never writes a task file, never edits SRS/SDS, never creates an ADR (the `documents/adr/` directory has been phased out). Recording is owned exclusively by `/plan`.
- **Acceptance verified by acceptance tests:** `reflect-rescues-decision-as-task`.
- **Status:** [x]

### FR-DOC-LINT: Documentation Health Category in Maintenance [ANC:fr:doc-lint]

- **Description:** `maintenance` adds a "Documentation Health" category to its multi-category audit. Checks (LLM-judgement, not deterministic — that is the value of using a skill):
  - **Broken GFM cross-links** — any `[text](path.md#anchor)` reference where the target file or the anchor (GFM auto-slug) does not exist. Scope: project documentation files (`documents/*.md`, `README.md`, `AGENTS.md`) and code comments in source directories.
  - **Stale `[x]` FRs** — FRs marked `[x]` whose `**Acceptance:**` reference no longer exists or, if it is a runnable command/test, no longer passes.
  - **Orphan FRs** — FRs marked `[x]` in SRS that have no GFM-link reference (`[FR-<ID>](requirements.md#…)`) anywhere in source code.
  - **SRS↔SDS contradictions** — pairs of statements where SRS and SDS describe the same component or behavior with mutually exclusive constraints.
  - **`documents/index.md` drift** — index rows disagreeing with the artifact (status mismatch, stale summary, missing row for an FR that exists in SRS).
- **Scope:** Maintenance keeps its existing interactive issue-by-issue UX; Documentation Health integrates as one of the categories (slot 9 — preserved across later category additions). Findings appear under a clearly labeled "Documentation Health" group in the numbered summary.
- **Acceptance verified by acceptance tests:** `maintenance-detects-doc-health-issues`.
- **Status:** [x]

### FR-MODEL-SELECT: Task-Driven LLM Model Recommender (beta) [ANC:fr:model-select]

- **Description:** Beta-pack skill `select-llm-model` recommends which LLM to use for a concrete task. Input: free-form task description. The skill derives **benchmark-category** weights (closed set: general, coding, math, agentic, instruction, long-context, diff-edit, web, computer-use, swe — documented in SKILL.md so the agent knows them) from the task, then **live-fetches** current standings through **two CLI tools with subcommands** (not bulk dumpers): `scripts/benchmarks.ts` (`scores --category <c> [--benchmark <b>] [--model] [--top]`, `model --name`) and `scripts/openrouter.ts` (`models`, `price`, `providers --model <slug>`, `speed`). A `scripts/catalog.ts` bridges each category→benchmark→(source, parser axis, URL); the tools reuse the pure per-source parsers (`parse-<source>.ts`) and `catalog_test.ts` proves every benchmark maps to an axis its parser actually emits. The canonical invocation is `curl <url> | deno run scripts/<tool>.ts <subcmd> … --stdin` — the `curl` stays the single mockable seam (IDE-neutral per FR-UNIVERSAL). The `curl`-pipe is the ONLY form the agent uses: Phase 0 does not probe `curl` (a `command -v`/`which` probe leaks a binary path the agent then misuses), and a blocked/failed `curl` is the fail-fast signal the agent must not route around (no absolute path, alternate binary, proxy, or `/tmp` download) — bypassing an unavailable fetch tool yields fabricated-looking results. A tool that cannot parse exits non-zero so the source becomes an explicit Gap, never a fabricated score. Sources (4 active + documented Gaps): **Artificial Analysis** (keyed API via `AA_API_KEY`; **absorbs** ~15 individual benchmarks — intelligence/mmlu-pro/GPQA/HLE/coding/LiveCodeBench/scicode/math/aime/aime-25/math-500/Terminal-Bench-hard/τ²-bench/ifbench/lcr — plus its own blended price + median speed, with correlated fields tagged a shared `group` so Phase 3 collapses them to one contribution), **OpenRouter** (public API; model-level input/output/blended $/Mtok + context, AND a **per-provider** breakdown via `/models/<slug>/endpoints` — input/output/cache-read price, uptime/reliability, context, quantization; latency/throughput are NOT emitted — both `null` in the documented API, with AA median tok/s kept as the `speed` proxy), **Aider Polyglot** (repo YAML; diff-edit, not in AA), **Steel.dev** (server-rendered per-benchmark agent tables; one adapter `parse-steel.ts` picks the axis from the page title — WebArena→web-agent, OSWorld→computer-use, SWE-bench Verified→swe-bench; agent-board scores are system/submission-attributed, SWE-bench lists bare models). Documented Gaps (no stable keyless endpoint → not scraped): LMArena Elo, ARC-AGI, LLM-Stats, BenchLM, AgentBench (Google Sheet), Epoch AI, Scale SEAL/Showdown, SWE-bench Pro. Phase 3 normalizes each benchmark to a within-set percentile, collapses a category's benchmarks to one contribution (avoids multi-counting broadly-smart models), then weighted-sums; price/speed stay post-rank filters/tie-breakers unless the task states a budget/latency (or an explicit value/$ ask). Phase 4 optionally enriches the top picks with the cheapest/most-reliable provider via `openrouter.ts providers`. Architecture: live-fetch, no bundled snapshot; tool + parser logic is unit-tested against inline fixtures (Code-TDD). Requires a `deno` runtime (absent → sources Gap, fail-fast). First skill in the opt-in `beta` pack → flips the pack from hook-only to skill-bearing (Codex manifest now emitted for `flowai-beta`).
- **Tasks:** [select-llm-model-skill](tasks/2026/06/select-llm-model-skill.md), [select-llm-model-source-scripts](tasks/2026/06/select-llm-model-source-scripts.md), [select-llm-model-cli-tools](tasks/2026/06/select-llm-model-cli-tools.md)
- **Scenario:** User asks "which model is best at editing code via diffs?" → skill detects `curl`+`deno`, derives the diff-edit weight, runs `curl … | deno run scripts/parse-aider.ts`, ranks models on the parsed rows with per-axis rationale + citations + fetch timestamp, lists source gaps (e.g. AA without `AA_API_KEY`). No fetch tool / parser exit≠0 / unset key → that source is a Gap; nothing fetchable → STOP + report, no ranking, no fabrication.
- **Acceptance verified by acceptance tests:** `select-llm-model-recommends-for-coding-task`, `select-llm-model-cites-sources`, `select-llm-model-source-parse-failure-becomes-gap`, `select-llm-model-fails-fast-no-fetch`. Parser logic: `deno test framework/beta/skills/select-llm-model/scripts/`.
- **Status:** [x]

### FR-BENCH-SWE: SWE-rebench same-harness A/B for flowai-core (vs bare codex) [ANC:fr:bench-swe]

- **Description:** Dev-tooling harness (`scripts/benchmark/`, Deno orchestration + Python `swebench` verifier via subprocess) measuring the end-to-end usefulness of flowai-core on realistic engineering tasks. **Same-harness A/B**: both arms are the same IDE over the ACP transport (FR-ACCEPT.ACP) — codex since 2026-08-09, Claude Code before that (FR-BENCH-SWE.IDE); the only difference is flowai — `baseline` installs nothing and gets a neutral "fix the bug" prompt (historically single-turn with a "never stop to ask" line; since 2026-07-22 superseded by FR-BENCH-SWE.SYMMETRY below — the same human emulator answers baseline questions and `maxSteps` is equal in both arms), `flowai` installs the local `core` pack via `copyFrameworkToIdeDir` + a process-rules `AGENTS.md` and is **operator-driven**: an operator plays the human across turns, issuing `/plan` (turn 1, carrying the issue), then `/implement`, then `/review` as SEPARATE slash commands the SDK resolves to the installed `core` skills (the skill body expands into the prompt; not a `Skill` tool call). **Emulated human across every turn** (`scripts/benchmark/human_emulator.ts` `FlowaiOperator`): after turn 1 (`/plan`), EVERY turn is authored by an LLM emulating the human, which reads ONLY the issue and the engineer's latest message (never gold patches or FAIL_TO_PASS — measurement honesty) — authorizes exactly one variant, names outcomes the plan missed or narrowed, challenges evidence-free "nothing to do" conclusions, and answers an engineer blocked by the environment instead of leaving them waiting. It does NOT assess the finished work: it cannot see the diff, so reviewing the implementation is handed to the engineer and the session ends on their answer. This replaced the former unconditional "Go ahead with your recommended variant" rubber stamp, which made every plan-quality effect invisible (loop4 STOP-ANALYSIS 2026-07-04). Consequence: the gate turn is stochastic — every report must state it; an emulator failure fails the instance loudly (no fallback to the stamp). **Sandbox isolation** (`scripts/benchmark/sandbox_root.ts`): agent sandboxes (and their sibling `bench-home`) live in a deterministic temp root OUTSIDE `$HOME`, because ancestor-directory memory files (`CLAUDE.md`/`AGENTS.md` up the cwd path) load regardless of the isolated `HOME` and leak the developer's personal rules into the measurement (observed live 2026-07-04); the run dir keeps `sandbox`/`bench-home` symlinks for post-run analysis, and the root computation fails fast if it would land under `$HOME`. Each turn is `/<name> <args>` with a space after the name — the SDK parses the command name up to the first space, so a newline there would silently degrade the turn to plain text and skip the skill. This isolates flowai's contribution (unlike comparing against a published, different-scaffold submission). Targets are a **frozen pool** (`scripts/benchmark/pools/<subject>.json`) derived from result cells by `cells-select` under the keep-rule in `isHeadroomKeeper` (`pool2_select.ts`): keep an instance iff the subject arm is NOT already reliable (resolved in 0 or 1 of N reps) AND someone solves it on our scaffold (subject >=1 rep, OR the ceiling model). Excludes always-solved (no headroom for flowai to demonstrate) and nobody-solved (no ceiling, so a miss proves nothing). Rows come from SWE-rebench under the vintage rule (FR-BENCH-SWE.POOL2). **The SWE-bench Verified path was retired and removed 2026-08-04** — the published-submission proxy pool, the `sonnet-fails INTERSECT opus-fails` pool, the measured-headroom pool over `pool.json`, and the `select`/`run`/`report` subcommands that drove them are gone, together with `instances.ts`, `select.ts`, `report.ts` and their committed data. What each design bought, what it cost, and the observation that ended it is recorded once in `documents/benchmarks/retired-approaches.md`; the headline reason the Verified path went is training-data contamination (its newest task is 2023-08, inside every candidate model's training window, so a solve cannot be separated from recall). Both arms are measured over the frozen pool, rep by rep. Each run's working-tree `git diff` → swebench predictions record (`{instance_id, model_name_or_path, model_patch}`); grading via official `swebench.harness.run_evaluation` (Docker, arm64 — proven: gold patch resolves `psf__requests-1142` in 52s). **Test-hunk stripping at grading time** (`scripts/benchmark/patch.ts` `stripTestHunks`, wired into `verify`/`report` via `writeGradablePredictions`): the harness applies the hidden gold `test_patch` AFTER the model patch, so a model-authored change to any file the gold test_patch also touches makes `git apply` collide and atomically reject the ENTIRE oracle → every FAIL_TO_PASS errors even when the production fix is correct. flowai's TDD (author a failing test first) reliably triggers this. Since the agent's own tests are never the oracle, every test-file hunk (`tests/` suite dir — plural, NOT production `django/test/`; or a pytest `test_*.py`/`*_test.py`/`conftest.py` basename) is stripped from the prediction before grading; the original predictions file is preserved and stripped paths are logged. Measured effect: `django-16256` (production complete, self-authored `tests/async/test_async_related_managers.py` collided) 0/9 → 9/9 resolved. The signal is the **baseline-fail → flowai-pass** cell — instances the bare IDE could not solve but flowai could. Output: A/B markdown report (`documents/benchmarks/ab-<pool>-<date>.md`) with per-instance marks + win list + regressions, carrying explicit caveats. **Measured pair (2026-08-09, codex/`gpt-5.6-terra`@medium, referee `gpt-5.6-sol`@medium, 40-min budget, frozen 15, 3 reps each):** flowai 13/45 clean against baseline 5/45; 7 instances solved at least once vs 4; the arms disagree on 10 instances with flowai ahead on 7, which a two-sided exact binomial puts at p ≈ 0.34 — directional, NOT significant. Cost moves the other way and must be quoted with it: flowai spent 5.6× the API calls and 13.9× the input tokens, median session 16.4 min / 3 turns against 3.2 min / 1 turn. Both arms break the same four PASS_TO_PASS tests on `pygraphistry-1277` in every rep while passing its FAIL_TO_PASS pair, so neither banks it. Full snapshot incl. per-instance counts and run integrity: [ab-frozen15-2026-08-09](benchmarks/ab-frozen15-2026-08-09.md). The delta stays headroom-conditional (FR-BENCH-SWE.POOL2) and the pool was frozen at a different operating point (20 min, retired `sonnet` referee) than the pair was measured at. Verification reproducibility is provable cheaply via `--gold` (no LLM). Dev tooling, not framework product → Code TDD.
- **Tasks:** [swe-verified-benchmark](tasks/2026/06/swe-verified-benchmark.md), [bench-judge-gate](tasks/2026/07/bench-judge-gate.md), [bench-sandbox-isolation](tasks/2026/07/bench-sandbox-isolation.md)
- **Scenario:** Maintainer runs `deno task benchmark setup --rebench`, then `pool2-run --arm baseline --pool <frozen.json> --rep <N>` for each rep, grades each, repeats with `--arm flowai`, and reads the two result cells (`cells-show`) — the signal is the baseline-fail -> flowai-pass cell, per instance, across reps.
- **Acceptance:** `deno test scripts/benchmark/` (frozen-pool integrity = every member satisfies the keep-rule over `pool2_headroom.json` (`pool2_headroom_test.ts`); diff→prediction shape; cell identity + append-only semantics (`cells_test.ts`); test-hunk stripping `scripts/benchmark/patch_test.ts` — production vs `tests/` classification, section drop, round-trip; emulated gate `scripts/benchmark/human_emulator_test.ts` — issue+plan-only emulator input, verdict-wrapped `/implement` turn, fail-fast on emulator failure/blank verdict; sandbox isolation `scripts/benchmark/sandbox_root_test.ts` — deterministic external root, fail-fast under `$HOME`, idempotent run-dir symlinks — all pass); gold-patch verification smoke `deno task benchmark verify --gold --instance psf__requests-1142` exits 0 with `resolved_instances: 1`; measured baseline + ceiling + final measured-headroom pool committed at `documents/benchmarks/measured-baseline-2026-07-05.md` (our Sonnet 3×: 8/14/12, our Opus: 15/20; 13-instance measured-headroom pool at freeze — 12 after the 2026-07-11 `requests-2317` drop). Superseded interim reports removed (recoverable from git history).
- **Optics caveat (evolve-in-place decision, 2026-07-22):** single-number autonomous `pass@1` charges flowai for its process overhead while the compensating value (fewer failure modes, no regressions, durable results) stays invisible — headline `pass@1` numbers make no SRS-grade effect claim. The former replacement track (FR-BENCH-V1, a separate Direction-I workhorse on a fresh N≥250 pool) was closed unbuilt by user decision 2026-07-22; its design contract — endpoint conjunction `solved ∧ no-regression`, frozen non-informative human reply, two-stage pre-registration freeze, corpus vintage rule — is recorded in [benchmark-system-requirements](tasks/2026/07/benchmark-system-requirements.md) §Final design v1 (superseded) and is adopted PIECEMEAL into this harness via sub-FRs (P2P decomposition and cost counters below; pool power, contamination, arm symmetry, freeze to follow).
- **Status:** [x]

#### FR-BENCH-SWE.P2P: Regression decomposition from per-instance grading reports [ANC:fr:bench-swe-p2p]

- **Description:** swebench's `resolved` verdict is already the conjunction "all FAIL_TO_PASS pass ∧ all PASS_TO_PASS pass", but the harness reported only the headline, making "solved-but-broke-existing" indistinguishable from "not solved". `scripts/benchmark/retro.ts` re-reads the per-instance `logs/run_evaluation/<runId>/<arm>/<instance>/report.json` files swebench leaves on disk for every graded campaign and decomposes each grade into the two v1-endpoint components (`solved` := F2P all pass; `no-regression` := P2P no failures), classifying it as `clean | solved-broke | unsolved | no-patch | apply-failed | ungraded` with F2P/P2P counts and named broken P2P tests. `deno task benchmark retro --run <id>|--glob <pattern> [--pool-only] [--out <md>]` recomputes past campaigns from disk with zero LLM calls. Sanity cross-check: derived `clean` must equal swebench `resolved`; mismatches are flagged loudly in the output, never silently trusted. TS never re-derives test outcomes — it only re-reads swebench's own verdict files.
- **Tasks:** [bench-swe-regression-efficiency](tasks/2026/07/bench-swe-regression-efficiency.md)
- **Scenario:** Maintainer runs `deno task benchmark retro --glob 'pool2-flowai-codex-*' --out <report.md>` → per-arm class counts + solved-broke instances with their broken tests, retro-computed from the graded runs with zero LLM calls.
- **Acceptance:** `deno test -A scripts/benchmark/retro_test.ts`; a retro over a graded campaign reproduces that campaign's swebench resolved count as its `clean` total, and any mismatch is flagged loudly.
- **Status:** [x]

#### FR-BENCH-SWE.COST: Session cost counters — informative, never a quality criterion [ANC:fr:bench-swe-cost]

- **Description:** Every (instance, arm) run captures cost counters — wall-clock ms, API calls, input/output/cache-read tokens, tool calls — harvested by `scripts/benchmark/metrics.ts` from the codex rollouts (`<CODEX_HOME>/sessions/**/rollout-*.jsonl`) IMMEDIATELY after the session, because those roots live in the OS temp root and macOS purges them within days (observed 2026-07-22: all pre-existing campaign transcripts already lost — past-campaign cost is unrecoverable, capture is forward-only). Aggregation takes the LAST `token_count` event (codex re-emits `total_token_usage` as a running total after every API response, so summing would multiply the real cost) and dedupes tool calls by `function_call` id. Cache-CREATION is always 0 — codex reports no such counter, and the field stays empty rather than borrowing a number that means something else. The Claude-transcript reader this replaced was removed 2026-08-09 with the Claude subject arm: it produced nothing on the codex path, the only path campaigns run on. Counters persist to `<runDir>/<arm>/<instance>/<instance>.metrics.json`; `report` renders a per-arm "Cost (informative)" section when metrics files are present. There are TWO roots per instance since FR-BENCH-SWE.ISOLATION gave the human emulator its own, and the harvester sums across both — so emulator tokens stay counted inside the arm's overhead exactly as when the directories were shared, matching the v1 principle that flowai's process cost is measured and disclosed, never scored. Collection failure logs loudly (`[metrics] FAILED`) but does not fail the instance: the prediction — the primary measurement of a 20-minute LLM session — is never sacrificed to a counter (deliberate, documented exception to fail-fast).
- **Tasks:** [bench-swe-regression-efficiency](tasks/2026/07/bench-swe-regression-efficiency.md)
- **Scenario:** Maintainer runs `deno task benchmark pool2-run --arm baseline --pool <frozen.json> --rep 1 --instance <id>`; after the session the harness prints a one-line cost summary and `<repDir>/baseline/<id>/<id>.metrics.json` exists. (The former `run`/`report` subcommands were removed with the SWE-bench Verified path on 2026-08-04 — see `documents/benchmarks/retired-approaches.md`; the counters themselves moved unchanged to the pool2 driver.)
- **Acceptance:** `deno test -A scripts/benchmark/metrics_test.ts` (rollout aggregation, running-total handling, tool-call dedupe, loader) — pass; live-run smoke (one real `pool2-run --arm baseline --rep 1 --instance <id>` writes a non-empty metrics.json): manual — korchasa.
- **Status:** [x]

#### FR-BENCH-SWE.SYMMETRY: One human emulator for both arms — equal human availability [ANC:fr:bench-swe-symmetry]

- **Description:** The arms must differ ONLY by flowai — but historically they also differed in human availability: baseline ran one turn under "make every decision yourself and never stop to ask" while the flowai arm had an operator and an emulated-human gate. Chosen design (user, 2026-07-22): do not remove the human emulator from flowai — give the SAME emulator to the bare arm too. One human persona (knowledgeable reviewer who knows ONLY the issue text and the conversation — never gold patches or FAIL_TO_PASS), identical model/config in both arms, equal `maxSteps` (`SESSION_MAX_STEPS`, imported by both the session and the cell header so the record cannot disagree with the harness). flowai keeps its structured turns (`/plan` → emulator-authored gate verdict in `/implement` → `/review`). **Fully emulator-driven flowai turns (2026-07-28, user decision):** the arm no longer replays canned `/implement` and `/review` strings after a single gate call. Every turn after `/plan` is authored by the emulator, which labels its reply `DECISION: AUTHORIZE|REPLAN|REVIEW|ANSWER|DONE` (`parseOperatorDecision`; an absent or unknown token fails the instance loudly, never a guessed decision) and the label selects the next turn: authorize → `/implement`, replan → its own `/plan` turn carrying the objection (`replanTurn`), review → `/review` in the human's own words, answer → plain text with no command, done → end. `SESSION_MAX_STEPS` rose 3 → 4 in BOTH arms to pay for the re-plan turn — equal shape preserved, and the extra step is not binding for the bare arm, which ends on `DONE`. Cause of the re-plan turn: while every reply was wrapped into `/implement`, a rejection consumed the implementation turn and the session reached `/review` over an empty working tree — first flowai campaign, 4 of 11 logged sessions rejected at the gate, 3 of them produced no patch at all. The re-plan budget is one: a human who still objects afterwards sends the objection along with `/implement`, because a session that spends every turn re-planning writes no code either. Cause of dropping the canned turns: an engineer who followed the seeded AGENTS.md rule ("environment broken → STOP and ask") asked into a void, since nobody was listening after the gate — `smolvm-172` (no Rust toolchain) and `virtualizarr-979` (no `h5py`) both banked an empty patch that way, while the bare arm, which has a live human after every turn, simply wrote code. **The human never assesses the work:** they cannot see the code or run the tests, so reviewing the implementation is the ENGINEER's task — handing it over is the last thing the human says and the session ends on the answer, without the emulator being asked to judge a diff it cannot see. Consequence, stated not hidden: `/review` is the human's call, so a session can also end without one. Baseline drops the "never stop to ask" line (a reviewer is available; asking is allowed) and gets an emulator-operator called after every agent turn: the emulator either answers the engineer's question from the issue text (information beyond it is explicitly unavailable — "your call"), or replies the literal terminal token `DONE` when the engineer has finished, which ends the session. Judge failure or a blank reply fails the instance loudly (no fallback); an emulator turn is stochastic in BOTH arms now — every report states it. Residual asymmetry disclosed, not hidden: flowai's emulator interaction always fires (it is the workflow's gate), baseline's only on demand — that difference IS flowai, the thing measured. **Reasoning-effort invariant (2026-07-23):** effort is also a same-harness variable — a stray `CLAUDE_EFFORT`/`CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` in the operator's shell would be inherited by every spawned agent + emulator (Deno.Command does not clear the parent env), so the baseline arm (run now) and flowai arm (run later) could silently differ by effort alone. `run.ts` `effortEnv(effort)` / `codexAgentEnv(effort, model)` pin the AGENT's effort into the session env; the pinned value is recorded in `pool2_provenance.json` and each rep's `run-meta.json`, and MUST be identical in both arms. **Referee decoupled from subject (2026-08-09, user decision):** the human emulator no longer inherits the agent's effort. `humanEmulatorConfig` fixes it at `medium` and defaults the model to `gpt-5.6-sol`, so one referee serves both arms of every campaign — otherwise a subject at medium and a ceiling at high would be judged by two different judges, and the difference would read as flowai. The emulator moved from `claude -p` to `codex exec` in the same change (`codexChatCompletion`; `cliChatCompletion` stays for the acceptance-test judge). Consequence recorded, not hidden: the emulator identity is part of the cell key, so cells measured before 2026-08-09 are not comparable with cells measured after. **Campaign identity (2026-07-25, user decision):** a campaign is the full `(ide, model, effort)` triple — terra at medium and terra at high are different operating points, so `pool2_provenance.json.campaigns` keys them as `<ide>/<model>@<effort>` and they coexist (the gate results they share are model-independent). Because a different effort is now simply a different key, the provenance can no longer catch reps of ONE campaign blending two efforts; that guard moved to where it belongs, the output directory: `pool2-run` writes `<baseOut>/campaign.json` (owns rep1..rep3, catches effort blending) and `<repDir>/run-meta.json` (catches a second campaign resuming into another's rep, where "0 pending" would silently adopt the first campaign's patches), and `campaignMismatch` aborts on either. **Session budget (2026-08-01, user decision):** the whole-session cap is `SESSION_BUDGET_MS` = 40 min (`run.ts`), the single default behind both `--step-timeout` flags. It was 20, and a nominally symmetric setting was charging one arm for its own workflow: baseline reached the cap in 0 of 198 sessions while flowai — which spends ONE budget on plan → implement → review — hit it in 11 of 45. Re-measuring exactly those 11 at 40 min (the faster sessions were left alone) closed the question: 10 finished the full cycle and the arm's score did NOT improve, 10/45 → 9/45, because twice the cap had been cutting `review` off while the patch still passed. The budget was never the constraint; it is now wide enough to stop being a hidden variable. **Review-turn scope (2026-08-01, user decision):** `reviewTurn` bounds the fix to the issue — the repository's other tests must keep passing, anything worth improving beyond the issue goes in the report and not the diff. This is a BENCHMARK rule and MUST NOT migrate into the framework's own review skill: on real work an extra fix is a win because a human and CI see it before it ships, while SWE-bench grades against a hidden P2P suite where a change the issue never asked for can only lose tests. Measured over three reps: review edited code in 91% of sessions and twice (`pygraphistry-1277`, `schemathesis-3778`) turned a passing diff into a failing one; the old wording invited it by asking to "fix any gaps you find". The human emulator's `REVIEW —` hand-off carries the same bound, or it would re-open in the operator's words what the turn just closed.
- **Tasks:** [bench-swe-fix-problems](tasks/2026/07/bench-swe-fix-problems.md)
- **Scenario:** Baseline agent asks "should I also handle the legacy format?" mid-run → the emulator answers from the issue text only (or says it is the engineer's call), the session continues; the agent finishes → the emulator replies `DONE` → session ends. The flowai arm's gate behaves as before, same judge config and same pinned effort.
- **Acceptance:** `deno test -A scripts/benchmark/human_emulator_test.ts scripts/benchmark/operator_test.ts scripts/benchmark/run_test.ts` (answer-emulator messages carry issue+conversation and no gold; `DONE` → session end; blank reply → loud failure; baseline prompt has no "never stop to ask"; equal maxSteps wiring; `effortEnv` pins `CLAUDE_EFFORT` + neutralizes the adaptive-thinking disable; `reviewTurn` bounds the fix to the issue and the emulator's `REVIEW —` hand-off says the same).
- **Status:** [x]

#### FR-BENCH-SWE.ISOLATION: One bench codex store, cross-session peeking audited [ANC:fr:bench-swe-isolation]

- **Description:** One codex config root for the whole benchmark, in a predictable place outside the project (user decision 2026-08-09): `~/.flowai-dev/auth.json` symlinks the maintainer's credentials ONCE, and each instance run gets its own store beneath it at `~/.flowai-dev/bench/<runKey>/.codex` (`prepareBenchCodexHome`). `runKey` is `<instance>-<8 hex of the full sandbox path>` (`benchRunKey`) — readable at a glance, unique per (campaign, rep, arm, instance), and deterministic so a resume re-prepares the same store. The instance name ALONE is not enough and the first version got exactly that wrong: the rep lives a level above `<arm>/<instance>`, so all three reps of one instance shared a store and each later rep's cost harvest counted the earlier reps' rollouts — measured on the 2026-08-09 baseline campaign, `transcriptFiles` ran 2, 4, 6 across the reps and 45 sessions left only 15 stores on disk. Solve verdicts were unaffected (they come from swebench grading, not from the store), and the campaign's per-rep cost was recovered afterwards by filtering rollouts on the rep windows recorded in `cell.json`. The store stays PER RUN rather than one directory for the whole benchmark because the cost harvest attributes tokens by walking a store: instances run four at a time by default (`--concurrency`, `benchmark.ts`), and one shared directory would interleave four sessions' rollouts with no way to tell them apart. The store carries an empty `skills/` and no `config.toml`, for the reason FR-BENCH-SWE.IDE gives: `~/.codex/skills/` would shadow the sandbox pack and `~/.codex/config.toml` globally pins model + reasoning effort. The bench root overrides the adapter's own `CODEX_HOME` rather than reusing it — the acceptance-test runner shares that code path and keeps writing into its temp home. Nothing purges this tree, deliberately: the sessions stay readable after a campaign, and reclaiming the space is the maintainer's call — `du -sh ~/.flowai-dev/bench/* | sort -h` to see it, `find ~/.flowai-dev/bench -maxdepth 1 -mindepth 1 -mtime +14 -exec rm -rf {} +` to drop runs older than a fortnight. No harness command wraps those: a wrapper would only add a code path that can compute the wrong target, and the rollouts are the evidence behind a campaign's cost and audit numbers. **The agent under test and the human emulator SHARE the run's store**, but not the environment: `emulatorEnvFor` builds the emulator's env as a whitelist of exactly `HOME` and `CODEX_HOME`, so `CODEX_CONFIG` (the agent's model and effort, which the referee is pinned away from by argv) and the sandbox venv `PATH` cannot ride along, and a key added to the agent env later cannot reach the referee silently. **Prevention by separation was considered and dropped:** codex has no sandbox mode that denies disk reads — measured on codex-cli 0.144.6, a `--sandbox read-only` session read `~/.zshrc` and printed its first line — so separate roots removed a pointer rather than granting a guarantee, and no report may claim otherwise. **What replaced it is a check** (`peek_audit.ts`): the same harvest pass that reads the rollouts for cost and web access scans every recorded shell command for a codex session store — `rollout-`, `.codex/sessions`, `CODEX_HOME`, `bench-home`, `flowai-bench-emulator` — and writes `<runDir>/<arm>/<instance>/<instance>.peekaudit.json` plus a per-instance console line. The detector is deliberately COARSE and does not try to decide whose store a path belonged to: under a shared store a path carries no ownership, and reading rollouts is no part of solving a GitHub issue for either side. Flags are DISCLOSURE, never automatic exclusion, and a harvest failure logs loudly without failing the instance — the same rule as COST and WEBAUDIT. The risk being checked is real in both directions: the agent's rollout carries the reasoning the emulator must never see (it answers from the issue text and the engineer's latest message alone), and the emulator's carries the human persona and the `DECISION: AUTHORIZE|REPLAN|REVIEW|ANSWER|DONE` protocol the agent is graded through, while the agent runs `INITIAL_AGENT_MODE=agent-full-access`.
- **Tasks:** [bench-codex-only](tasks/2026/08/bench-codex-only.md)
- **Scenario:** A flowai instance runs → agent and emulator write into `~/.flowai-dev/bench/<runKey>/.codex/sessions`, authenticating through the single root-level `auth.json`; the run dir gains a `codex-home` symlink; `<instance>.metrics.json` counts that store, `<instance>.webaudit.json` audits it, and `<instance>.peekaudit.json` reports zero commands reaching for a session store.
- **Acceptance:** `deno test -A scripts/acceptance-tests/lib/acp/auth_test.ts scripts/benchmark/run_test.ts scripts/benchmark/metrics_test.ts scripts/benchmark/webaudit_test.ts scripts/benchmark/peek_audit_test.ts` (the bench store sits under `~/.flowai-dev`, one per instance run, credentials resolved through the single root-level `auth.json`, contents exactly `auth.json` + empty `skills/`, and a re-prepare returns the same store; `emulatorEnvFor` is a two-key whitelist carrying no `CODEX_CONFIG`/`PATH`/`CLAUDE_EFFORT`; the harvesters accept a list of stores and fail fast naming the absent one; `sessionPeekMarker` flags store paths and leaves ordinary test/git work alone, `collectPeekAudit` reads both stores and truncates a long command instead of dropping it).
- **Status:** [x]

#### FR-BENCH-SWE.WEBAUDIT: Per-instance web-access audit — flagged, never banned [ANC:fr:bench-swe-webaudit]

- **Description:** Agents may research the web mid-session (user decision 2026-07-22: research is normal engineering work — never ban it), but a benchmark instance's real upstream fix is public on GitHub during the run, so unaudited access is an oracle-leak blind spot. `scripts/benchmark/webaudit.ts` extracts every `http(s)` URL from the shell commands recorded in the codex rollouts — the agent's store and the human emulator's, kept apart by FR-BENCH-SWE.ISOLATION and audited alike, since `--sandbox read-only` blocks the emulator's writes and not the network — in the same harvest-pass discipline as FR-BENCH-SWE.COST (`call_id` dedupe, malformed lines counted loudly, capture immediately after the session — rollouts are purged by the OS within days). **Under codex the shell is the whole audit surface:** the sandbox has no `WebFetch`/`WebSearch` tools, so the network is reached through `exec_command` (field `cmd`) and `shell_command` (field `command`), whose arguments carry the command text verbatim — 33465 and 5588 records respectively across every rollout on the maintainer's host, all string-valued. Consequence stated, not hidden: a search the model performs internally, without a shell command, leaves no trace here. The retired Claude reader (WebFetch URLs, WebSearch queries, `Bash`-command URLs, `toolu_*` dedupe) went with the Claude subject arm on 2026-08-09. Accesses persist to `<runDir>/<arm>/<instance>/<instance>.webaudit.json`. **Oracle-adjacent flagging** (`isOracleAdjacent`): a target referencing the instance's own repo `pull/commit/issues` paths on GitHub, or combining the repo's short name with the instance's ticket number, is flagged for human review — flags are DISCLOSURE, not disqualification (false positives acceptable and stated; no automatic exclusion). `report` renders a per-arm "Web access" section with totals and every flagged access verbatim. Harvest failure logs loudly (`[webaudit] FAILED`) but never fails the instance — same deliberate fail-fast exception as COST.
- **Tasks:** [bench-swe-fix-problems](tasks/2026/07/bench-swe-fix-problems.md)
- **Scenario:** During a baseline session the agent runs `curl https://github.com/<repo>/pull/<n>.diff` and `pip download foo -i https://pypi.org/simple` → `webaudit.json` records both and flags only the own-repo PR fetch as oracle-adjacent; nothing is excluded automatically.
- **Acceptance:** `deno test -A scripts/benchmark/webaudit_test.ts` (URL extraction from both codex shell-tool shapes with `call_id` dedupe; oracle-adjacent flagging; harvest across both session stores, fail-fast naming an absent sessions dir) — pass; live-run smoke (the same single `pool2-run --arm baseline --rep 1 --instance <id>` session as FR-BENCH-SWE.COST writes `<id>.webaudit.json`): manual — korchasa.
- **Status:** [x]

#### FR-BENCH-SWE.POOL2: Fresh frozen pool via gated admission funnel [ANC:fr:bench-swe-pool2]

- **Description:** A 20-instance frozen pool of POST-CUTOFF tasks replacing the contaminated SWE-bench Verified pool (its newest task is 2023-08 — inside training data; that pool and its `pool.json` were removed 2026-08-04, see `documents/benchmarks/retired-approaches.md`). Source: `nebius/SWE-rebench-leaderboard` monthly splits (2025_08–2026_03 fetched; 463 candidates as of 2026-07-22), fetched via the HF datasets-server rows API into `pool2_candidates.json`, ordered fresh-first. **Vintage rule:** admitted instances must have `created_at` strictly after the pinned agent-model snapshot's training cutoff; the exact snapshot id + cutoff are pinned in provenance at selection time. **Grading path (user 1A, 2026-07-22):** the STOCK princeton harness cannot grade these repos (no per-repo specs), so pool2 grading goes through SWE-rebench's own SWE-bench fork (based on swebench Release 4.0.3, reads `install_config` from each row) at a pinned commit in `.venv-rebench` — this AMENDS the parent FR's "official `swebench.harness.run_evaluation`" wording to "the dataset's official Python evaluation path in Docker"; grading is still never reimplemented in TS. **Containers (user 2A):** prebuilt amd64 images (`swerebench/sweb.eval.x86_64.*`, per-row `image_name`) under Rosetta on the arm64 host — probe 2026-07-22: gold grade of `tox-dev__tox-3904` (2026_03) resolved 1/1 in 23 s via the fork; numeric stack (pgmpy/numpy) clean under emulation. **Admission funnel, cheapest-gates-first:** (1) no-LLM gold gate — image pulls and the gold patch grades `resolved` k=3 consecutive times with distinct run_ids (flaky screen, SWE-bench-Live issue #47 method; one failed rep or harness error rejects, recorded with a note, never silently skipped); (2) tiered baseline measurement on the NEW symmetric harness (FR-BENCH-SWE.SYMMETRY) — rep 1 for all gate-passers, early-reject at 2 solves, complete 3 reps for the rest; keep-rule = Sonnet 0–1/3 ∧ someone-solves (single-Opus ceiling probe on Sonnet-0/3). **Honesty rules (all three mandatory):** selection uses baseline behavior ONLY (never flowai results); pool + baseline frozen by checksum BEFORE any flowai run; every report labels the delta "headroom-conditional — mechanism finder, not a general-effect claim". Per-candidate gate evidence persists incrementally to `pool2_provenance.json` (committed, the data of record); the frozen pool lands in `pool2.json` (≤20 keepers, cheapest-first) + the full per-instance funnel in `pool2_headroom.json` (committed data of record — every eligible instance with `{sonnet_reps 0–3, opus_resolved, verdict∈{keeper,reject_no_headroom,reject_no_ceiling,excluded}}`, incl. the rejected variants). **Measured result (2026-07-24, effort=high):** over 66 eligible (67 gate-passers − 1 unfetchable), per-rep Sonnet resolved 31/30/31 (~46% pass@1), Opus ceiling **0/26** — Opus produced a real patch for every Sonnet-0/3 but none passed F2P (verdict on the merits: all 26 finished in 1 of 3 turns, none hit the step cap or timeout, so the scaffold was not the bottleneck). Funnel: **keeper 8**, reject_no_headroom 32 (Sonnet 2–3/3), reject_no_ceiling 26 (Sonnet 0/3 ∧ Opus fail), excluded 1. The pool froze at **8** (not 20): on fresh SWE-rebench tasks the maxSteps=3 scaffold is bimodal — Sonnet either solves reliably or nobody (even Opus) solves — so the flowai-can-help headroom band is thin. **Harness honesty hardening (4 "never fairly attempted → false miss" bug classes fixed, all TDD):** `system_health` abort (exit 75), ACP token expiry (`isAuthFailure`), transient clone/DNS blip (`isTransientSetupFailure`), and a dead HUMAN EMULATOR (`isEmulatorOutage`) each now leave the instance PENDING for a retry instead of banking an empty patch as a genuine miss. The emulator case was added 2026-07-30: the emulator is a separate `claude -p` process, so its failure never reaches ACP and `isAuthFailure` could not see it — when the account's OAuth refresh token was revoked server-side (`OAuth refresh token is no longer valid` in the CLI's own debug log), every emulator call died and 14 of 15 flowai sessions banked an empty patch as an honest miss. The detector keys on the wrapper's `Claude CLI failed (exit N)` phrasing rather than on auth text, because the CLI's result JSON is truncated in the session log and an emulator that dies for ANY reason leaves the same hole; the caller still requires an empty patch, so a session that did real work before the emulator died stays a genuine measurement. **Re-measurement grading id (`resolveRunAttempt`, 2026-07-30):** swebench caches each verdict under `logs/run_evaluation/<runId>` and SKIPS any instance already there, so a rep discarded and re-run under the same id inherits the discarded run's verdicts — measured the same day, the regrade printed `14 instances already run, skipping...` and stamped `resolved: true` onto predictions whose patch was 0 bytes. The attempt is now resolved from state, not from an operator flag: an attempt pinned in `<repDir>/run-meta.json` wins outright (a resume never moves its id), a rep dir that already holds predictions but no pinned attempt keeps attempt 1 (its graded logs live there), and a FRESH rep dir whose id already has graded logs on disk advances to the first free attempt (`-a2`, `-a3`, …). Attempt 1 keeps every historical id byte-identical. **Health backoff (2026-07-25, user decision):** leaving a health-aborted instance pending and moving straight to the next one turns the queue into a hot loop — the next instance meets the same overloaded host, and the clone-per-abort churn heats it further (measured: 45 of 51 instances aborted within eight minutes, load 52 on 10 CPU; a repeat at concurrency 1 aborted 24 while another workload held the machine). `withHealthBackoff` now waits and retries the SAME instance — 1 min doubling to a 15 min cap, 8 attempts ≈ 1 h — and only then leaves it pending. The guard is never bypassed; only the driver's reaction to it changed. **Arm-scoped measurement (2026-07-27):** `pool2-run --arm baseline|flowai` drives EITHER arm over pool2 (`runArmBatch`; predictions at `<repDir>/<arm>.jsonl`), and `--pool <frozen.json>` runs the frozen pool from `cells-select` instead of every gate-passer — aborting when a frozen id carries no gate evidence, since without a gold gate there is nothing to grade it against. The arm joins the campaign key everywhere it can otherwise leak: the grading run id (`pool2-flowai-<ide>-<model>-<effort>-rep<N>`), swebench's `model_name_or_path`, the rep-dir ownership guard, and the cell key — a baseline id is left byte-identical so the completed campaigns keep their graded logs. Without the id segment a flowai rep would find the baseline's cached `report.json` files and REPLAY them, the same class of bug as the rep-scoped id fixed in `4e27bebc`. The flowai cell's `framework` component is the git TREE hash of `framework/` (`-dirty` when the worktree differs), not the harness commit: the two move independently, and a run off an uncommitted tree must not claim the last commit's identity. **Defects the first flowai rep exposed, all fixed 2026-07-28 (rep 1 discarded — the harness it measured no longer exists):** (1) the flowai arm seeded only the SRS + Index stubs, so the SDS role resolved to a `documents/design.md` that was never written and the plan skill halted on it before reading the issue — `renderDocStubs` now returns a stub for EVERY role the rendered `AGENTS.md` resolves, and the test asserts that correspondence rather than one filename; (2) a timed-out session returned the `[TIMEOUT]` marker ALONE, since `AcpAgent.run()` hands its log back only when it returns — 4 of 15 instances left a 41-byte file with no turns and no commands, so `timeoutLog` + `AcpAgent.getPartialLog()` now keep the partial transcript and append the marker last; (3) lock files (`uv.lock` 392 KB on `pdm-3759`, plus poetry/pdm/pipenv/npm/yarn/pnpm) rode along in the model patch — same class as `venv/` and the IDE config dirs, now in `DIFF_EXCLUDES`. **Sandbox dependencies (2026-07-28, user decision):** grading runs in the dataset's Docker image where the project is installed, but the AGENT worked in a bare clone — no importable package, no runnable suite. That gap is not neutral: flowai's RED → GREEN discipline needs the suite, so where it cannot run the discipline turns into refusing to work while the bare arm just writes code (`smolvm-172` "Cargo has no configured Rust toolchain", `virtualizarr-979` "missing `h5py`" — both banked an empty patch). `install_env.ts` now replays each row's own `install_config` into `<sandbox>/.venv` and puts that venv first on the agent's PATH, identically in BOTH arms, so `python`/`pytest` resolve to the installed project without the agent being told anything. The recipes were written for the graders' Debian images, so an `apt-get` step cannot run on the macOS host: a failing step STOPS the recipe and is reported in `<instance>/install.log` and on the console (`env: PARTIAL — stopped at: …`) rather than throwing — a partial environment beats a bare one and the gap stays on the record. A row without a recipe leaves the sandbox bare rather than guessing one; a conda `packages` spec is logged as unsupported, never silently dropped. Measured over the frozen 15-instance pool: 13 recipes complete, 2 (`pygeoapi-2338`, `nicegui-5914`) stop at their trailing `apt-get` yet still collect their target test file; 9–46 s per instance with a shared pip cache, venvs 0.2–0.8 GB, hidden from git via `.git/info/exclude` on top of the diff excludes.
- **Tasks:** [bench-swe-fix-problems](tasks/2026/07/bench-swe-fix-problems.md)
- **Scenario:** Maintainer runs `deno task benchmark setup --rebench`, `pool2-fetch` (writes candidates fresh-first), `pool2-gate --target 67` (pull image → k=3 gold grades → PASS/REJECT recorded per candidate); the baseline tier runs over gate-passers via `pool2-run --rep {1,2,3}` (resumable, hardened) and the Opus ceiling probe via `pool2-run --model opus --instance <0/3 id>…`; `pool2-select --freeze` assembles `pool2_headroom.json` (gated on a complete Opus probe) and freezes the keepers into `pool2.json`.
- **Acceptance:** `deno test -A scripts/benchmark/rebench_test.ts scripts/benchmark/pool2_fetch_test.ts scripts/benchmark/pool2_gate_test.ts scripts/benchmark/pool2_measure_test.ts scripts/benchmark/pool2_select_test.ts scripts/benchmark/pool2_headroom_test.ts scripts/benchmark/run_test.ts` (fork args; row→candidate mapping + pagination + fresh-first; gate k-discipline + provenance round-trip; resume/health-abort/auth-fail/setup-fail pending logic; sonnet-rep assembly + keep-rule verdicts + cheapest-first freeze; **headroom + pool2 integrity — every `pool2.json` member is a keeper in `pool2_headroom.json`, summary/eligible/opus-completeness invariants, cheapest-first order**; effort pin + auth/setup transient detectors) — pass (56 tests, 2026-08-10); fork gold-grade smoke on `tox-dev__tox-3904` returns `reps [true,true,true], pass: true` — verified live 2026-08-10. Run it as `deno eval --no-check "import { runGoldGate } from './scripts/benchmark/pool2_gate.ts'; …"` on the candidate row, NOT as `pool2-gate --instance <id>`: the CLI skips any candidate that already has a provenance record (`gated 0 new candidate(s)`, exit 0) so the subcommand cannot re-prove a passer, and forcing it would mean deleting committed evidence. `runGoldGate` grades and returns without writing provenance.
- **Status:** [x]

#### FR-BENCH-SWE.IDE: Codex is the IDE under test [ANC:fr:bench-swe-ide]

- **Description:** The harness drives codex so a flowai effect is not confounded with "flowai helps Claude". Codex began as a SECOND IDE and became the only one on 2026-08-09, when the Claude subject arm was retired to stop maintaining two implementations of cost capture and the human emulator: `BENCH_SUBJECT_IDES` in `benchmark.ts` accepts codex alone and refuses anything else with a message naming the retirement, while the acceptance-test runner's `SUPPORTED_IDES` stays wide because framework primitives are tested on every IDE. Both arms of one campaign MUST use the same IDE (it is a harness variable, flowai is the measured one). **Transport:** codex-cli has NO `acp` subcommand (verified 0.144.6 — the former `codex acp` registry row started the interactive TUI with `acp` as the prompt, so the codex path could never have worked); ACP is reached through the pinned external bridge `@agentclientprotocol/codex-acp@1.1.7`, which supports ChatGPT-subscription login, so no API key is provisioned. `INITIAL_AGENT_MODE=agent-full-access` is pinned in the launch env — a read-only default would let a session "finish" having written nothing and score as an honest miss. **Isolation** (`prepareAcpCodexHome`, the codex twin of FR-ACCEPT-ISOLATION): the bench `CODEX_HOME` is built EMPTY inside the existing bench-home and only `auth.json` is symlinked back, because the maintainer's `~/.codex/skills/` holds user-level skills that would shadow the sandbox pack and `~/.codex/config.toml` globally sets `model` + `model_reasoning_effort` — the same operator-shell leak the FR-BENCH-SWE.SYMMETRY effort invariant forbids. Codex seeds its OWN bundled `.system` skills there; those are part of codex itself and identical in both arms. **Effort/model pin:** `codexAgentEnv` emits `CODEX_CONFIG` (the bridge's documented session-config override, which wins over the file). **Skill-invocation prefix (flowai arm):** IDE-dependent and load-bearing — the codex bridge REJECTS `/plan <args>` outright (`Command "/plan" requires no arguments.`, measured 2026-07-24), so the Claude arm's slash turn would silently degrade the codex flowai arm to a bare session. `commandPrefixFor` returns `$` for codex and `/` for everything else; `planTurn`/`reviewTurn`/`implementTurnWithVerdict` take the prefix and vary ONLY the prefix, since differing argument text would mean the two IDEs were measured on different prompts. Verified on codex: `$plan …` fires the skill ("I'm using the `plan` skill because you explicitly requested `$plan`", followed by reading `.codex/skills/plan/SKILL.md`). **Human emulator:** one referee for both arms — it is the referee, not the subject, so a fixed judge keeps campaigns comparable. It runs over `codex exec` since 2026-08-09 (`codexChatCompletion`), its model is pinned separately from the agent's (`--human-emulator-model`, default `gpt-5.6-sol`) and its reasoning effort is fixed at `medium` by `humanEmulatorConfig` rather than inherited from the agent, so moving the subject's operating point does not move the judge. It runs from a temp cwd outside the developer's home and under the bench's isolated config root, so no personal memory file can leak into emulator replies. `assertModelForIde` rejects a cross-IDE model at the CLI edge (`--ide codex --model sonnet`) instead of failing deep inside a paid session. **Grading run id is campaign-scoped (`campaignRunId`, 2026-07-25):** swebench caches each verdict at `logs/run_evaluation/<runId>/<model>/<instance>/report.json` and skips any instance already there, and every pool2 campaign grades under model name `baseline` — so the original rep-only id (`pool2-baseline-rep<N>`) made the codex campaign REPLAY the Sonnet campaign's verdicts: its first grade reported 31/67 with 64 of 67 instances never actually evaluated ("64 instances already run, skipping..."). The id now carries the full campaign (`pool2-<ide>-<model>-<effort>-rep<N>`); claude/sonnet@high keeps the historical id, since the pool2 freeze was derived from those logs. **Known limitations, stated not hidden:** (1) the pinned ACP client lib (0.4.5) rejects the bridge's newer `session_info_update` notifications — status metadata only, no message or tool-call content is lost; (2) `pool2.json` was selected by a **Sonnet** keep-rule, so a codex campaign over it is a mechanism finder for codex, never a recalibrated pool — every codex report must say so.
- **Tasks:** [bench-codex-arm](tasks/2026/07/bench-codex-arm.md)
- **Scenario:** Maintainer runs `deno task benchmark pool2-run --arm baseline --ide codex --model gpt-5.6-sol --instance <id> --pool <frozen.json> --rep 1` → the bridge launches under the isolated `CODEX_HOME`, the session authenticates by subscription, the run records `reasoning_effort: high` (NOT the machine's `ultra`), the working-tree diff lands in `<repDir>/baseline.jsonl`, and the console prints the harvested session cost and the web-access audit for the run.
- **Acceptance:** `deno test -A scripts/acceptance-tests/lib/acp/registry_test.ts scripts/acceptance-tests/lib/acp/auth_test.ts scripts/benchmark/run_test.ts scripts/benchmark/operator_test.ts` (bridge pinned + never a codex subcommand + subscription auth; codex bench-home isolates user skills AND user config, links `auth.json`, still carries the `HOME` the harness needs, and the emulator gets a SEPARATE root (FR-BENCH-SWE.ISOLATION); `codexAgentEnv` pins effort+model, `assertModelForIde` refuses a cross-IDE model; `commandPrefixFor` maps codex→`$`/claude→`/` and the turn builders vary only the prefix) — pass; CLI guard smoke `deno run -A scripts/benchmark.ts run --arm baseline --ide codex --model sonnet --limit 1` exits 1 with the mismatch message; live codex session smoke (bridge + subscription auth + write/exec permissions + pinned effort observed in the rollout): manual — korchasa. **Verified live 2026-07-24/25:** one pool2 instance on the codex baseline arm ended exit 0 with a 3131-byte patch touching `src/anyio/_backends/_asyncio.py`; the bridge sustains a multi-turn session (2 turns, both artefacts written); and the codex FLOWAI turn 1 ran the `plan` skill at full fidelity — it spawned the `surface_scout` subagent and wrote `documents/tasks/2026/07/add-verbose-output.md`, then re-checked its own frontmatter and sections.
- **Status:** [x]

#### FR-BENCH-SWE.CELLS: One self-describing record per measurement cell [ANC:fr:bench-swe-cells]

- **Description:** A measurement is stored as a **cell** keyed by `(ide, arm + flowai fingerprint, model, effort, session budget, prompt hash, human emulator)` — user decision 2026-07-26, budget added 2026-08-01, referee added 2026-08-09. The framework fingerprint sits IN the key, so "bare codex" and "codex + flowai@`<sha>`" are different cells by construction and can never be blended. Today the same measurement is scattered across `solves.json`, `baseline.jsonl`, `run-meta.json`, swebench's `report.json` and the driver log, tied by nothing; two shipped-bad-number incidents were invisible in the stored data (rep-scoped grading id replaying another campaign's verdicts; a health-abort storm whose 45 un-run instances simply vanished from the predictions file). **Status trichotomy — the core rule:** every task in a cell carries `measured | pending | excluded`. An absent task is not a miss; a pass rate computed while tasks are `pending` is refused unless the caller explicitly asks for a partial one. **Per-task record:** verdict re-read from swebench's own report (F2P/P2P decomposition via `classifyReport` — TS never re-derives test outcomes), exit code, turns, wall-clock, patch size, and for an empty patch the CAUSE (`agent-gave-up | timeout | health-abort | auth-fail | setup-fail`), plus paths to the patch and the emulator transcript. **Cell header:** task set (dataset, split, fork commit, ids + checksum), agent (model snapshot, IDE version, ACP bridge version), human emulator (model, effort), harness (maxSteps, step timeout, prompt hash, and the harness commit that produced the numbers), environment (host, arch, CPUs, RAM, Docker version, Rosetta), and per-rep timing with the health-abort/backoff counts that describe the conditions. Fields an older run never captured are `null`, never invented. Selection and reports read cells; they hold no truth of their own. **Session budget in the key (2026-08-01, user decision 1A):** the budget was a header field while it looked like a mere condition, and that let one record hold two measurements — the flowai cell was written at 20 min, 11 of its 45 tasks were re-measured at 40 and appended over the originals, and the header was then stamped 2400000 for all of them, so neither number described what was actually run. The budget now sits in the key; `cellId` OMITS the segment for the legacy 20 min (`LEGACY_CELL_STEP_TIMEOUT_MS`) so every directory already on disk answers to its own name, and appends `-t<N>m` otherwise — the same idiom as `campaignRunId`, which suffixes only attempts after the first. The blended cell was split accordingly: the 20-minute record keeps its 45 measured tasks (10 resolved, verdicts re-read from the original grading run), and `…-t40m` holds the 11 that were actually re-run (2 resolved) with the other 34 `pending` and a reason saying they finished inside the smaller cap and were deliberately not re-run. The two cells reproduce the blended reading exactly — 7 untouched solves + 2 = the 9/45 that was quoted — without any single record having to claim both budgets. **Prompt hash in the key (2026-08-02, user decision A):** the harness's own wording moves results, so a rewritten turn is a new measurement. `promptHashFor` was also measuring the wrong thing — it hashed only the bare arm's task text, so the flowai arm's `plan`/`implement`/`review` turns and the operator system prompt could be rewritten end to end while every cell went on claiming the same hash (that is exactly what the review-turn bound did). It is now arm-aware: baseline hashes its task text (value unchanged, `946da8d8dd51fcad`), flowai hashes the whole turn sequence plus the operator prompt that authors it. The hash joins the key as `-p<12 hex>`, omitted when absent — a key with no hash is saying it does not know its wording, which is the honest state of every record written earlier and of every import from the pre-cell layout. Consequence, stated not hidden: the next run of either arm lands in a new directory rather than extending the imported one, because an import cannot prove it shared today's wording. **Human emulator in the key (2026-08-09):** the referee decides what a session was allowed to hear, so two campaigns judged by different emulators are not one measurement — yet it lived only in the header, and a re-run at the same operating point with a new referee would have appended its rows to the old cell with nothing in the directory name to say so. `emulatorSegment` appends `-e<model>-<effort>` (the effort too: since the referee stopped tracking the agent it is an independent property, and a judge moved to high judges differently under the same name) and OMITS the segment for the legacy `sonnet` — `LEGACY_CELL_EMULATOR_MODEL`, the same compatibility anchor idiom as the budget, so every directory already on disk keeps its name. That the move to `gpt-5.6-sol` happened to coincide with a changed framework fingerprint and budget was luck, not protection.
- **Tasks:** [bench-result-cells](tasks/2026/07/bench-result-cells.md)
- **Scenario:** Maintainer resumes a killed campaign, then asks for its pass rate → the un-run instances are `pending`, so the rate is refused rather than silently computed over a partial set; after the resume completes, the same call returns `resolved/measured` with every task explaining itself.
- **Acceptance:** `deno test -A scripts/benchmark/cells_test.ts scripts/benchmark/cells_import_test.ts` (cell id carries the full key; pass rate refuses un-measured tasks; a task row names an empty patch's cause and lands un-run sessions as pending; the header pins task set + agent + human emulator + harness + env; the importer emits nulls for what old runs never captured). Live smoke 2026-07-26: `pool2-run --rep 9 --ide codex --model gpt-5.6-terra --effort medium --instance agronholm__anyio-1121` wrote the header (bridge 1.1.7, promptHash 946da8d8dd51fcad, harness commit ca432e92, host env, rep timing) plus the measured row (exit 0, 4125-byte patch, 1 turn, 240 s) and then the same row folded with swebench's verdict (resolved, F2P 1/1, P2P 32/0).
- **Status:** [x]

---

## 4. Non-functional requirements


- **Reliability:** Benchmarks must use isolated sandboxes and evidence-based verification. Execution must be protected by timeouts (e.g., 60s per step) to ensure system stability.
- **Scalability:** The benchmarking system must support multiple evaluation modes (Quality, Selection, Comparison).
- **Usability:** Commands must be intuitive (e.g., `/commit`). Benchmark reports must be human-readable and provide actionable feedback via `trace.md`.

## 5. Interfaces

- **APIs and integrations:**
  - AI IDE Chat (Cursor, Claude Code, OpenCode): Primary interface for user-agent interaction.
  - File System: Storage for rules, commands, and documentation. Symlinks for multi-IDE distribution.
  - Git: Version control operations.
  - MCP: Integration with external tools (GitHub, etc.).
- **Protocols and data formats:** Markdown (`.md`, SKILL.md, RULE.md).
- **UI/UX constraints:** Text-based chat interface.

## 6. Acceptance criteria

- The system is considered accepted if the following are met:
  - All defined commands are executable by agents in supported IDEs.
  - Rules are correctly loaded and applied by agents.
  - Dev resources in `.claude/` are accessible to Claude Code.
  - Framework resources installable via flowai (`flowai sync`).
  - Documentation accurately reflects the project state.
