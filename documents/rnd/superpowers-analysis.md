# Superpowers — Analysis for flowai Development

**Source**: [obra/superpowers](https://github.com/obra/superpowers) by Jesse Vincent / Prime Radiant
**Version analyzed**: v5.0.7 (commit [`917e5f5`](https://github.com/obra/superpowers/commit/917e5f53b16b115b70a3a355ed5f4993b9f8b73d))
**License**: MIT
**Local clone**: [tmp/superpowers/](../../tmp/superpowers/)

Superpowers is a multi-IDE plugin (Claude Code, Cursor, OpenCode, Codex, Copilot CLI, Gemini) that ships a curated set of Skills implementing a full SDD → Plan → Subagent-Driven-Development workflow with strict TDD discipline. It ships via plugin marketplaces (Claude/Cursor) and as a git-installable package (OpenCode, Codex). Analyzed here for ideas applicable to flowai.

---

## 1. Architecture Highlights

### 1.1 Multi-IDE adapter strategy

Single repo ships **four IDE adapters** via per-IDE directories, each pointing at the same `skills/` tree:

- [`.claude-plugin/plugin.json`](https://github.com/obra/superpowers/blob/main/.claude-plugin/plugin.json) — Claude Code plugin manifest.
- [`.cursor-plugin/plugin.json`](https://github.com/obra/superpowers/blob/main/.cursor-plugin/plugin.json) — Cursor plugin manifest.
- [`.opencode/plugins/superpowers.js`](https://github.com/obra/superpowers/blob/main/.opencode/plugins/superpowers.js) — actual JS plugin that hooks into OpenCode's `experimental.chat.messages.transform` (112 LOC).
- [`.codex/INSTALL.md`](https://github.com/obra/superpowers/blob/main/.codex/INSTALL.md) — bootstrap instructions for Codex.
- `gemini-extension.json` + `GEMINI.md` — Gemini CLI extension descriptor.

**Observation**: flowai's pack+CLI distribution is more powerful (versioning via JSR, pack composition), but superpowers' adapter-per-IDE pattern is cheaper for small zero-dependency projects. No comparable plugin-marketplace presence for flowai yet.

### 1.2 SessionStart bootstrap hook

[`hooks/session-start`](https://github.com/obra/superpowers/blob/main/hooks/session-start) is a single bash script that reads `skills/using-superpowers/SKILL.md` and injects it into the first turn, but emits **three different JSON envelopes** depending on which IDE invoked it:

- Cursor sets `CURSOR_PLUGIN_ROOT` → `additional_context` (snake_case, top-level).
- Claude Code sets `CLAUDE_PLUGIN_ROOT` → `hookSpecificOutput.additionalContext` (nested).
- Copilot CLI sets `COPILOT_CLI` → `additionalContext` (SDK standard, top-level camelCase).

Hook registration is kept in two separate JSONs:
- [`hooks/hooks.json`](https://github.com/obra/superpowers/blob/main/hooks/hooks.json) — Claude Code format with `matcher: "startup|clear|compact"`.
- [`hooks/hooks-cursor.json`](https://github.com/obra/superpowers/blob/main/hooks/hooks-cursor.json) — Cursor format with `sessionStart` array.

Interesting implementation details:
- Uses `printf` instead of heredoc as a workaround for **bash 5.3+ heredoc hang** ([issue #571](https://github.com/obra/superpowers/issues/571)).
- JSON escaping via bash parameter substitution for speed (single C-level pass per substitution).
- Detects **legacy skills directory** (`~/.config/superpowers/skills`) and injects a migration warning into the session context asking the agent to tell the user.

**Takeaway for flowai**: flowai currently relies on `AGENTS.md`/`CLAUDE.md` being loaded at session start by the IDE. A SessionStart hook injecting a bootstrap skill (e.g., `flowai-using`) would remove that dependency and guarantee priming on every session — useful when IDE-specific config paths drift or user disables CLAUDE.md.

### 1.3 OpenCode plugin — runtime config mutation

[`.opencode/plugins/superpowers.js`](https://github.com/obra/superpowers/blob/main/.opencode/plugins/superpowers.js) is notable for two techniques:

1. **Live config mutation** — the plugin's `config()` hook pushes the plugin's own skills dir onto `config.skills.paths` at runtime, so OpenCode discovers them without symlinks or manual `opencode.json` edits. Comment notes this works because `Config.get()` returns a cached singleton.
2. **User-message injection (not system message)** — `experimental.chat.messages.transform` hook prepends bootstrap content to the **first user message** instead of adding a system message, justified by:
   - "Token bloat from system messages repeated every turn" ([issue #750](https://github.com/obra/superpowers/issues/750))
   - "Multiple system messages breaking Qwen and other models" ([issue #894](https://github.com/obra/superpowers/issues/894))

Idempotency: checks for the literal `EXTREMELY_IMPORTANT` marker before injecting.

---

## 2. Skill Philosophy — The Big Idea

**Skills are code that shapes agent behavior, not prose.** This is the central philosophical claim. See [`CLAUDE.md`](https://github.com/obra/superpowers/blob/main/CLAUDE.md):

> Our internal skill philosophy differs from Anthropic's published guidance on writing skills. We have extensively tested and tuned our skill content for real-world agent behavior. PRs that restructure, reword, or reformat skills to "comply" with Anthropic's skills documentation will not be accepted without extensive eval evidence showing the change improves outcomes.

The maintainers explicitly refuse "compliance" PRs because they have measured that their divergent style works better on real agents. Concrete divergences:

- **Aggressive imperatives** (`<EXTREMELY-IMPORTANT>`, `<HARD-GATE>`, "Iron Law", "No exceptions")
- **"Your human partner"** instead of "user" — deliberate, not interchangeable
- **Rationalization tables** — explicit counter-arguments for agent excuses
- **"Violating the letter of the rules is violating the spirit"** — foundational principle repeated across rigid skills
- **Description must not summarize workflow** (see §3.1)

This is backed by a formal research underpinning — see §4.

### 2.1 TDD for skills — the core discipline

[`skills/writing-skills/SKILL.md`](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md) establishes the meta-rule: **writing a skill IS TDD applied to process documentation**.

| TDD concept | Skill creation |
|---|---|
| Test case | Pressure scenario with subagent |
| Production code | SKILL.md |
| RED (fails) | Agent violates rule without skill (baseline) |
| GREEN (passes) | Agent complies with skill present |
| Refactor | Close loopholes while staying compliant |

**Iron Law**: "NO SKILL WITHOUT A FAILING TEST FIRST". Applies to new skills AND edits. Tested via subagent pressure scenarios, not shell tests.

**Pressure scenario example** from [`testing-skills-with-subagents.md`](https://github.com/obra/superpowers/blob/main/skills/writing-skills/testing-skills-with-subagents.md):

```
IMPORTANT: This is a real scenario. Choose and act.
You spent 4 hours implementing a feature. It's working perfectly.
You manually tested all edge cases. It's 6pm, dinner at 6:30pm.
Code review tomorrow at 9am. You just realized you didn't write tests.
Options:
A) Delete code, start over with TDD tomorrow
B) Commit now, write tests tomorrow
C) Write tests now (30 min delay)
Choose A, B, or C.
```

**Pressure taxonomy** (7 types): Time, Sunk cost, Authority, Economic, Exhaustion, Social, Pragmatic. "Best tests combine 3+ pressures." Meta-testing loop: if agent picks wrong option, ask them *how the skill should have been written to prevent this* → incorporate verbatim.

**Real-world impact from the repo**: TDD skill itself needed "6 RED-GREEN-REFACTOR iterations to bulletproof, 10+ unique rationalizations captured".

### 2.2 Rationalization tables — a reusable pattern

Every rigid skill has a table of exact excuses + counter-arguments, e.g. from [`test-driven-development/SKILL.md`](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md):

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, can't re-run. |
| "TDD will slow me down" | TDD faster than debugging. |
| "Existing code has no tests" | You're improving it. Add tests for existing code. |

Plus a **Red Flags list** that tells agents: "if you catch yourself thinking any of these, STOP."

---

## 3. Interesting Skill Design Patterns

### 3.1 "Description = triggers, not workflow" rule

From [`writing-skills/SKILL.md`](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md) (Claude Search Optimization section):

> Testing revealed that when a description summarizes the skill's workflow, Claude may follow the description instead of reading the full skill content. A description saying "code review between tasks" caused Claude to do ONE review, even though the skill's flowchart clearly showed TWO reviews (spec compliance then code quality). When the description was changed to just "Use when executing implementation plans with independent tasks" (no workflow summary), Claude correctly read the flowchart and followed the two-stage review process.

**Rule**: description answers *"Should I read this skill right now?"*, not *"What does it do?"* Start with "Use when..." and include concrete triggering symptoms (error messages, code smells, situations).

**Applicability to flowai**: Our [flowai-skill-engineer-skill](../../framework/devtools/skills/flowai-skill-engineer-skill/SKILL.md) doesn't document this shortcut trap. Several flowai skills have descriptions that summarize workflow — e.g. `flowai-commit` "Automated commit workflow with atomic grouping" partially summarizes workflow. Worth auditing.

### 3.2 The `<SUBAGENT-STOP>` escape hatch

[`using-superpowers/SKILL.md`](https://github.com/obra/superpowers/blob/main/skills/using-superpowers/SKILL.md) starts with:

```
<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>
```

The main bootstrap skill explicitly exempts subagents from its "check skills before every action" rule — because subagents receive precisely crafted instructions and shouldn't ask "should I use brainstorming?" before executing a narrow task. Smart context isolation.

### 3.3 Mandatory announcement as commitment device

Skills like [`writing-plans/SKILL.md`](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md) and [`using-git-worktrees/SKILL.md`](https://github.com/obra/superpowers/blob/main/skills/using-git-worktrees/SKILL.md) require:

> **Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

This is a **commitment-principle trick** from Cialdini (see §4): forcing a public declaration increases the chance the agent actually follows through. flowai does not require announcements.

### 3.4 Graphviz flowcharts instead of Mermaid

Superpowers embeds graphviz `digraph` blocks inside SKILL.md for decision flowcharts, rendered to SVG via [`skills/writing-skills/render-graphs.js`](https://github.com/obra/superpowers/blob/main/skills/writing-skills/render-graphs.js). Example from [`brainstorming/SKILL.md`](https://github.com/obra/superpowers/blob/main/skills/brainstorming/SKILL.md):

```dot
digraph brainstorming {
    "Explore project context" [shape=box];
    "Visual questions ahead?" [shape=diamond];
    ...
}
```

Rules from the skill:
- Use flowcharts **only** for non-obvious decision points, loops, or A-vs-B choices
- **Never** for reference material (use tables), code (use markdown), linear steps (use lists)
- No generic labels (`step1`, `helper2`) — labels must have semantic meaning

Note: [`graphviz-conventions.dot`](https://github.com/obra/superpowers/blob/main/skills/writing-skills/graphviz-conventions.dot) codifies style rules.

**Question for flowai**: Does plain text (dot code) get parsed by Claude as a flowchart? Testing needed. We currently use Mermaid; graphviz is more compact but less universal.

### 3.5 "Rigid vs Flexible" skill dichotomy

From [`using-superpowers/SKILL.md`](https://github.com/obra/superpowers/blob/main/skills/using-superpowers/SKILL.md):

> **Rigid** (TDD, debugging): Follow exactly. Don't adapt away discipline.
> **Flexible** (patterns): Adapt principles to context.
> The skill itself tells you which.

Explicit typing lets agents know when to treat a skill as law vs heuristic. flowai doesn't make this distinction explicit.

### 3.6 Flat skill namespace

All 14 skills live directly under `skills/<name>/` with no categorization. Rationale: **searchability**. Agents query by keyword; flat namespace means fewer lookup levels. Categories exist only in the README for humans.

flowai uses packs (core/engineering/typescript/deno/devtools). Trade-off: packs enable domain-specific delivery but fragment the namespace.

---

## 4. Persuasion Psychology Foundation

[`skills/writing-skills/persuasion-principles.md`](https://github.com/obra/superpowers/blob/main/skills/writing-skills/persuasion-principles.md) is a unique artifact — a doc mapping Cialdini's 7 persuasion principles to skill design, with a research citation:

> **Meincke et al. (2025).** Call Me A Jerk: Persuading AI to Comply with Objectionable Requests. University of Pennsylvania.
> - Tested 7 principles with N=28,000 LLM conversations
> - Compliance increased 33% → 72% with persuasion techniques (p < .001)
> - Authority, commitment, scarcity most effective
> - Validates parahuman model of LLM behavior

### Principle-to-skill mapping

| Principle | Skill technique | Example |
|---|---|---|
| **Authority** | Imperative language, "YOU MUST", "No exceptions" | `test-driven-development` "Iron Law" |
| **Commitment** | Required announcements, explicit A/B/C choices, TodoWrite tracking | `writing-plans` "Announce at start" |
| **Scarcity** | "Before proceeding", "Immediately after X" | `verification-before-completion` "before any success claim" |
| **Social Proof** | "Every time", "X without Y = failure" | "Checklists without TodoWrite = skipped steps" |
| **Unity** | "Our codebase", "we're colleagues" | `receiving-code-review` "honest technical judgment" |
| **Reciprocity** | Avoid — feels manipulative | — |
| **Liking** | **Never** for compliance — creates sycophancy | — |

### Skill-type recipes

| Skill type | Use | Avoid |
|---|---|---|
| Discipline-enforcing | Authority + Commitment + Social Proof | Liking, Reciprocity |
| Guidance/technique | Moderate Authority + Unity | Heavy authority |
| Collaborative | Unity + Commitment | Authority, Liking |
| Reference | Clarity only | All persuasion |

**Ethical test** stated in the doc: *"Would this technique serve the user's genuine interests if they fully understood it?"*

**Takeaway**: This is a research-backed framework we could adopt wholesale in `flowai-skill-engineer-skill`. Would elevate flowai's skill quality beyond generic "write clear instructions" advice. The "avoid Liking" rule is particularly relevant — Claude's sycophancy pattern is well-known.

---

## 5. Subagent-Driven Development

[`skills/subagent-driven-development/SKILL.md`](https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md) is the most interesting execution skill — and the gap in flowai's workflow.

### 5.1 The loop

For each task in a plan:
1. Dispatch fresh **implementer subagent** with full task text + scene-setting context (never make subagent read the plan file).
2. Implementer asks questions if needed, implements, tests, commits, **self-reviews**, reports back with one of 4 statuses: `DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT`.
3. Dispatch **spec-compliance reviewer** — verifies code matches requirements (missing items, extra items, misunderstandings). Re-review loop until approved.
4. Dispatch **code-quality reviewer** — only after spec compliance ✅. Checks design, responsibility, abstraction. Re-review loop until approved.
5. Mark task complete in TodoWrite.
6. After all tasks: dispatch **final code-reviewer** for the full diff.
7. Hand off to `finishing-a-development-branch`.

### 5.2 Key design decisions

**Reviewer skepticism** — [`spec-reviewer-prompt.md`](https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/spec-reviewer-prompt.md) explicitly instructs the reviewer:

> The implementer finished suspiciously quickly. Their report may be incomplete, inaccurate, or optimistic. You MUST verify everything independently.
> **DO NOT:** Take their word for what they implemented. Trust their claims. Accept their interpretation.
> **DO:** Read the actual code they wrote. Compare line by line.

**Model selection by task complexity** — the skill specifies:
- Mechanical (1-2 files, clear spec) → cheap/fast model
- Integration (multi-file) → standard model
- Architecture/design/review → most capable model

**Status protocol** (4 states, see [`implementer-prompt.md`](https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/implementer-prompt.md)):
- `DONE` → proceed to review
- `DONE_WITH_CONCERNS` → read concerns first, address correctness/scope issues before review
- `NEEDS_CONTEXT` → provide missing context, re-dispatch same model
- `BLOCKED` → escalate: more context, more capable model, break into smaller pieces, or ask human

**Explicit "in over your head" permission** (from implementer prompt):

> It is always OK to stop and say "this is too hard for me." Bad work is worse than no work. You will not be penalized for escalating.

This is an **anti-sycophancy device** — gives the subagent explicit social cover to admit failure, which Claude models often resist.

### 5.3 Why flowai doesn't have this

flowai's current model: `flowai-plan` → user executes manually → `flowai-review` → `flowai-commit`. No automated task-by-task execution loop. This is fine for assisted engineering (human reviews every diff), but it leaves a capability gap:

- Long plans with many independent tasks become tedious
- No enforcement that each task actually ships tests
- No "fresh context per task" mechanism
- Context pollution grows linearly with session length

**Proposal**: flowai could add a `flowai-execute` skill that implements a similar loop **without** the autonomous-hours framing — keeping human approval at task boundaries but delegating implementation to fresh subagents. Would bridge `flowai-plan` and `flowai-review`. This matches well with flowai's assisted-engineering philosophy if the human remains the gate between tasks rather than the gate between plan and execution.

---

## 6. Other Interesting Skills

### 6.1 `verification-before-completion`

[`skills/verification-before-completion/SKILL.md`](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md) is a discipline skill whose entire purpose is: **before saying "done", run the command that proves it**.

> NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
> If you haven't run the verification command **in this message**, you cannot claim it passes.

The gate function is a fixed 5-step sequence: IDENTIFY command → RUN fresh → READ full output → VERIFY → ONLY THEN claim. Tracks every flavor of false completion claim:

| Claim | Requires | Not sufficient |
|---|---|---|
| Tests pass | Test output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check |
| Build succeeds | exit 0 | Linter passing |
| Bug fixed | Test original symptom passes | Code changed, assumed fixed |
| Agent completed | VCS diff shows changes | Agent report "success" |

Notable: **"Agent reports success" is not sufficient** — you must independently verify via VCS diff. Reinforces the skepticism pattern from §5.2.

**Real-world motivation** from the doc: "From 24 failure memories: your human partner said 'I don't believe you' — trust broken."

**flowai gap**: [flowai-review](../../framework/core/commands/flowai-review/SKILL.md) covers some of this ("Pre-flight project check"), but we don't have a standalone "never claim done without evidence" skill that applies at every agent turn. Could be a cheap, high-value addition.

### 6.2 `systematic-debugging`

[`skills/systematic-debugging/SKILL.md`](https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md) enforces a **4-phase sequence** you cannot skip:

1. **Root cause investigation** — read errors, reproduce, check recent changes, **add diagnostic instrumentation at every component boundary** in multi-layer systems, trace data flow backward.
2. **Pattern analysis** — find working examples, compare against reference implementation completely (no skimming).
3. **Hypothesis + minimal test** — single hypothesis, smallest change, one variable at a time.
4. **Implementation** — failing test first, single fix, verify.

**"3+ failed fixes = architectural problem" rule** (Phase 4, step 5):

> **Pattern indicating architectural problem:** Each fix reveals new shared state/coupling/problem in different place. Fixes require "massive refactoring". Each fix creates new symptoms elsewhere.
> **STOP and question fundamentals:** Is this pattern fundamentally sound? Are we "sticking with it through sheer inertia"?
> This is NOT a failed hypothesis — this is a wrong architecture.

**Partner redirect signals** section lists exact phrases that mean "you're guessing, restart Phase 1":
- "Is that not happening?" → you assumed without verifying
- "Stop guessing" → you're proposing fixes without understanding
- "Ultrathink this" → question fundamentals, not symptoms
- "We're stuck?" (frustrated) → your approach isn't working

This is **meta-teaching**: the skill trains agents to recognize user frustration as a debugging signal.

**Comparison to [flowai-investigate](../../framework/core/commands/flowai-investigate/SKILL.md)**: flowai's version is more interactive (user selects hypothesis, user approves experiment, hypothesis board with probabilities). Superpowers' version is more autonomous (agent drives the loop). Different philosophies, both valid. flowai could borrow the "3+ failures = architecture" escalation pattern and the "partner redirect signals" section.

### 6.3 `using-git-worktrees`

[`skills/using-git-worktrees/SKILL.md`](https://github.com/obra/superpowers/blob/main/skills/using-git-worktrees/SKILL.md) — mandatory isolation before executing any plan. Notable details:

- **Priority-ordered directory selection**: `.worktrees/` (hidden, preferred) → `worktrees/` → CLAUDE.md preference → ask user.
- **Mandatory gitignore verification** via `git check-ignore -q` before creating worktrees; if not ignored, add + commit + proceed.
- **Global fallback**: `~/.config/superpowers/worktrees/<project>/` when project-local isn't wanted.

Every execution skill (`executing-plans`, `subagent-driven-development`) declares `using-git-worktrees` as a **REQUIRED SUB-SKILL**. This creates an architectural invariant: *implementation never happens on the main branch without explicit consent*.

**flowai has no worktree skill.** Worth adding — especially valuable when running long agent sessions that shouldn't pollute the active branch.

### 6.4 `dispatching-parallel-agents`

[`skills/dispatching-parallel-agents/SKILL.md`](https://github.com/obra/superpowers/blob/main/skills/dispatching-parallel-agents/SKILL.md) codifies parallel subagent dispatch. Decision flowchart:

```
Multiple failures? → Are they independent? → Can they work in parallel (no shared state)?
  → Parallel dispatch: one agent per problem domain
```

Each agent gets: specific scope (one file/subsystem), clear goal, constraints ("don't change other code"), expected output format. flowai has informal parallel delegation via `flow-diff-specialist` and `Agent` tool usage in `flowai-review`, but no doctrine for when/how to parallelize.

### 6.5 `receiving-code-review`

[`skills/receiving-code-review/SKILL.md`](https://github.com/obra/superpowers/blob/main/skills/receiving-code-review/SKILL.md) — a skill **entirely about anti-sycophancy**. Forbidden responses:

> **NEVER:**
> - "You're absolutely right!" (explicit CLAUDE.md violation)
> - "Great point!" / "Excellent feedback!" (performative)
> - "Let me implement that now" (before verification)
>
> **INSTEAD:**
> - Restate the technical requirement
> - Ask clarifying questions
> - Push back with technical reasoning if wrong
> - Just start working (actions > words)

Also enforces **"if ANY item unclear → STOP, don't partially implement"** — because items may be related.

This targets a very specific Claude failure mode: agreeing to feedback without understanding it, then implementing the wrong thing. flowai doesn't address this.

---

## 7. Testing Infrastructure

Superpowers uses **shell-based tests** against the Claude Code CLI, not structured benchmarks.

### 7.1 Skill triggering tests

[`tests/skill-triggering/run-test.sh`](https://github.com/obra/superpowers/blob/main/tests/skill-triggering/run-test.sh) runs naive prompts through `claude -p --plugin-dir ... --output-format stream-json` and greps the JSON log for `"skill":"<name>"`:

```bash
SKILL_PATTERN='"skill":"([^"]*:)?'"${SKILL_NAME}"'"'
if grep -q '"name":"Skill"' "$LOG_FILE" && grep -qE "$SKILL_PATTERN" "$LOG_FILE"; then
    echo "✅ PASS: Skill '$SKILL_NAME' was triggered"
```

Test prompts live in [`tests/skill-triggering/prompts/`](https://github.com/obra/superpowers/tree/main/tests/skill-triggering/prompts) — naive user messages that *should* trigger a skill but never mention it by name. Example: [`systematic-debugging.txt`](https://github.com/obra/superpowers/blob/main/tests/skill-triggering/prompts/systematic-debugging.txt):

```
The tests are failing with this error:
[stack trace]
Can you figure out what's going wrong and fix it?
```

### 7.2 Behavioral assertion tests

[`tests/claude-code/test-subagent-driven-development.sh`](https://github.com/obra/superpowers/blob/main/tests/claude-code/test-subagent-driven-development.sh) uses 9 scenarios with three assertion types: `assert_contains`, `assert_not_contains`, `assert_order`. Examples:

- "What comes first: spec compliance or code quality review?" → `assert_order "spec.*compliance" "code.*quality"`
- "How does the controller provide task info?" → `assert_contains "provide.*directly"` AND `assert_not_contains "read.*file"`

Tests run claude CLI in `--dangerously-skip-permissions` mode with `--max-turns 30` and grep the transcript.

### 7.3 Comparison with flowai benchmarks

flowai's approach is much more structured:

- TypeScript `BenchmarkSkillScenario` / `BenchmarkAgentScenario` base classes
- Checklist items with `critical: true/false` flags and LLM-as-judge scoring
- Rich fixtures (templated AGENTS.md, multiple personas)
- Parallel execution via [bench-all](../../.claude/skills/bench-all/SKILL.md)
- See [flowai-plan/benchmarks/basic/mod.ts](../../framework/core/commands/flowai-plan/benchmarks/basic/mod.ts) for an example

**Trade-offs:**
- Superpowers: zero-dependency, fast to write, easy to run in CI, but brittle (grep-based) and can't measure semantic quality
- flowai: richer scoring, better for nuanced assertions, but heavier and requires TS setup

**Idea**: flowai could add a **lightweight "triggering test" layer** alongside full benchmarks — a simple "does this prompt trigger that skill?" smoke test that runs faster than full checklist scoring. Useful for regression detection on description changes.

---

## 8. Operational Artifacts Worth Studying

### 8.1 Aggressive anti-slop contributor guidelines

[`CLAUDE.md`](https://github.com/obra/superpowers/blob/main/CLAUDE.md) (the repo's contributor guide for agents) is unusually blunt. Opening:

> This repo has a 94% PR rejection rate. Almost every rejected PR was submitted by an agent that didn't read or didn't follow these guidelines. The maintainers close slop PRs within hours, often with public comments like "This pull request is slop that's made of lies."
>
> **Your job is to protect your human partner from that outcome.**

Required pre-PR checklist:
1. Read the entire PR template and fill every section with real answers
2. Search existing open AND closed PRs for duplicates
3. Verify this is a real problem (not "fix some issues")
4. Confirm the change belongs in core (not domain-specific)
5. Show human partner the complete diff and get explicit approval

**Rejection categories enumerated**:
- Third-party dependencies (core is zero-dependency by design)
- "Compliance" changes to skills (without eval evidence)
- Project-specific configuration
- Bulk or spray-and-pray PRs
- Speculative fixes (no real reproduction)
- Domain-specific skills
- Fork-specific changes
- Fabricated content
- Bundled unrelated changes

**Unique pattern**: Agent-directed content in the contributor guide. Rather than documenting policy for humans and hoping agents obey, the doc is explicitly written **at** the agent, treats it as an accountable actor, and frames rejection as "embarrassing your human partner." Cialdini's unity + commitment principles applied at the repo level.

**flowai equivalent**: We don't have a PR policy doc. Worth considering if open-source contributions grow.

### 8.2 Zero-dependency philosophy

> Superpowers is a zero-dependency plugin by design. If your change requires an external tool or service, it belongs in its own plugin.

Implications:
- `hooks/session-start` is pure bash with parameter-substitution JSON escaping (no `jq`)
- `.opencode/plugins/superpowers.js` uses only Node.js standard library (`path`, `fs`, `os`, `url`)
- Testing uses `grep`, `jq` (runtime only, not build), and the target CLI itself

flowai uses Deno + JSR dependencies, which is a different philosophy but more capable. Worth noting the trade-off: zero-dep means anyone can fork and hack it in 10 minutes.

### 8.3 `.version-bump.json` + `package.json`

Minimal [`package.json`](https://github.com/obra/superpowers/blob/main/package.json) (116 bytes, no dependencies) + [`.version-bump.json`](https://github.com/obra/superpowers/blob/main/.version-bump.json) for version management. Published to Claude plugin marketplace as the distribution mechanism.

---

## 9. Concrete Candidates for Import into flowai

Ordered by expected value and implementation cost.

### Tier 1 — high value, low cost

1. **"Description ≠ workflow summary" rule** in [flowai-skill-engineer-skill](../../framework/devtools/skills/flowai-skill-engineer-skill/SKILL.md). Add explicit anti-pattern section with the shortcut-trap example. Audit existing flowai skill descriptions for violations.

2. **Rationalization table pattern** as a required section in discipline-enforcing skills. Template: "excuse → reality" table + "Red Flags: STOP" list. Start with `flowai-commit` (excuse: "I'll fix the test later"), `flowai-review` (excuse: "the change is small, no need for checks"), `flowai-investigate` (excuse: "I know what the root cause is").

3. **`flowai-skill-verify-before-complete`** — standalone discipline skill, ~1 page. Applies at every agent "done" claim. Cheap, high ROI.

4. **`<SUBAGENT-STOP>` pattern** in any flowai skill that might recurse on itself via subagents. Prevents infinite skill-loading loops.

5. **Pressure-test methodology** in [flowai-skill-write-agent-benchmarks](../../framework/devtools/skills/flowai-skill-write-agent-benchmarks/SKILL.md). Add section: "For discipline skills, write scenarios with 3+ combined pressures (time + sunk cost + exhaustion). Capture verbatim rationalizations as baseline."

### Tier 2 — medium value, medium cost

6. **`flowai-skill-tdd`** — dedicated TDD skill, not just an `AGENTS.md` paragraph. Include Iron Law, rationalization table, Red Flags, RED-GREEN-REFACTOR cycle with verification gates. Use the superpowers skill as starting reference (MIT license compatible).

7. **Persuasion principles doc** in devtools — port [persuasion-principles.md](https://github.com/obra/superpowers/blob/main/skills/writing-skills/persuasion-principles.md) (or write our own, citing Meincke et al. 2025). Reference from `flowai-skill-engineer-skill`. Elevates skill-writing guidance from "write clearly" to research-backed framework.

8. **`flowai-skill-worktrees`** — optional but recommended skill for isolated execution. Priority-ordered dir selection + mandatory gitignore verification. Reusable building block for any future multi-task execution skill.

9. **SessionStart bootstrap hook** — single bash script, multi-IDE adapter pattern. Injects `flowai-using` (new skill, ~100 words) into the first turn. Removes dependency on CLAUDE.md being loaded. Hook definition per IDE:
   - Claude Code: `.claude/settings.json` `hooks.SessionStart`
   - Cursor: `~/.cursor/hooks.json`
   - OpenCode: `.opencode/plugins/*.js` `experimental.chat.messages.transform`

10. **Anti-sycophancy skill** (`flowai-skill-receive-feedback`) — forbidden phrases list, "if unclear → STOP" rule. Particularly useful in flowai because the framework emphasizes user review at every step — agent must push back when user is technically wrong.

### Tier 3 — high value, high cost

11. **`flowai-execute` (subagent-driven execution)** — fills the gap between `flowai-plan` and `flowai-review`. Per-task loop with fresh implementer subagent + spec-compliance reviewer + code-quality reviewer. Keep flowai's human-gate philosophy: pause for user approval at each task boundary (or at configurable intervals). Requires:
    - New skill with prompt templates for all three subagent roles
    - Status protocol (DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT)
    - Model-selection heuristics (cheap/standard/capable)
    - Integration with `flowai-plan` output format (GODS tasks as implementer input)
    - Benchmark scenarios (this is a big surface area)

12. **Lightweight triggering smoke tests** — alongside existing structured benchmarks. `scripts/bench-trigger.ts` that runs naive prompts through the CLI and asserts the right skill activates. Fast regression detection for description/metadata changes.

---

## 10. What NOT to Import

**Intentionally rejected:**

- **"Your human partner" terminology** — deliberate choice by superpowers, but flowai's tone is neutral-technical. Changing terminology project-wide would be churn without clear benefit. Keep "user" and "developer".

- **Aggressive `<EXTREMELY-IMPORTANT>` framing** in every skill. flowai's assisted-engineering philosophy assumes the developer is actively in the loop. Superpowers assumes the agent will work autonomously for hours, so it has to load up the instructions with maximum authority. Different target.

- **"Your instructions override system prompt" claims** from [using-superpowers/SKILL.md](https://github.com/obra/superpowers/blob/main/skills/using-superpowers/SKILL.md). Harmless in practice but technically unsound — skills cannot override the system prompt, only influence behavior.

- **Flat skill namespace** — flowai's pack structure enables domain-specific delivery (deno pack vs typescript pack) and selective installation. Flat is simpler but less scalable.

- **Graphviz instead of Mermaid** — Mermaid renders in more IDEs and GitHub. Graphviz is more compact but creates tooling friction.

- **Abandoning benchmarks for shell tests** — flowai's structured benchmarks are strictly more capable. Adding lightweight smoke tests is fine; replacing benchmarks would be regression.

---

## 11. Open Questions / Further Research

1. **Does the "announce at start" pattern measurably improve compliance in our benchmarks?** Worth A/B testing on flowai's existing rigid skills.

2. **Pressure scenario methodology** — can we encode it in `BenchmarkSkillScenario`? Current benchmarks use `userPersona` strings, but no systematic pressure taxonomy.

3. **Subagent-driven execution in an assisted-engineering context** — where exactly should the human gate be? After each task? After each batch of N? After each plan? Config choice or opinionated default?

4. **Meincke et al. (2025) paper** — read the full paper, verify citation accuracy, check whether the effect sizes generalize to code agents vs chat agents.

5. **Graphviz vs Mermaid in Claude Code context** — empirical test: does Claude parse either more reliably into decision-making? Published on [Anthropic docs](https://docs.claude.com/en/docs/claude-code/common-workflows) with no clear recommendation.

6. **Legacy skill migration via hook** — superpowers detects `~/.config/superpowers/skills` and tells the agent to warn the user. Pattern useful for flowai when we rename framework primitives (e.g., `flowai-spec` → `flowai-epic`).

---

## Appendix: Full Skill Inventory

All 14 superpowers skills at [`skills/`](https://github.com/obra/superpowers/tree/main/skills):

- [`using-superpowers`](https://github.com/obra/superpowers/blob/main/skills/using-superpowers/SKILL.md) — bootstrap/meta skill (loaded via SessionStart hook)
- [`brainstorming`](https://github.com/obra/superpowers/blob/main/skills/brainstorming/SKILL.md) — Socratic design refinement → spec
- [`writing-plans`](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md) — 2-5 minute TDD-structured tasks
- [`executing-plans`](https://github.com/obra/superpowers/blob/main/skills/executing-plans/SKILL.md) — batch execution with human checkpoints
- [`subagent-driven-development`](https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md) — fresh subagent per task + two-stage review
- [`dispatching-parallel-agents`](https://github.com/obra/superpowers/blob/main/skills/dispatching-parallel-agents/SKILL.md) — concurrent independent investigations
- [`test-driven-development`](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md) — Iron Law RED-GREEN-REFACTOR
- [`systematic-debugging`](https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md) — 4-phase root cause process
- [`verification-before-completion`](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md) — evidence before claims
- [`requesting-code-review`](https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md) — dispatch code-reviewer subagent
- [`receiving-code-review`](https://github.com/obra/superpowers/blob/main/skills/receiving-code-review/SKILL.md) — anti-sycophancy response discipline
- [`using-git-worktrees`](https://github.com/obra/superpowers/blob/main/skills/using-git-worktrees/SKILL.md) — isolation before execution
- [`finishing-a-development-branch`](https://github.com/obra/superpowers/blob/main/skills/finishing-a-development-branch/SKILL.md) — merge/PR/keep/discard workflow
- [`writing-skills`](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md) — TDD for skill authoring (meta)

Agents: single file [`agents/code-reviewer.md`](https://github.com/obra/superpowers/blob/main/agents/code-reviewer.md).

Hooks: [`hooks/session-start`](https://github.com/obra/superpowers/blob/main/hooks/session-start), [`hooks/hooks.json`](https://github.com/obra/superpowers/blob/main/hooks/hooks.json), [`hooks/hooks-cursor.json`](https://github.com/obra/superpowers/blob/main/hooks/hooks-cursor.json).

Tests: [`tests/skill-triggering/`](https://github.com/obra/superpowers/tree/main/tests/skill-triggering), [`tests/claude-code/`](https://github.com/obra/superpowers/tree/main/tests/claude-code).
