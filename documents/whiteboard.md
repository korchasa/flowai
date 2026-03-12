# Create `flow-spec` Skill for Specification-Driven Development of Large Features

## Goal

Enable developers to create structured, decomposed specifications for features that exceed a single AI agent context window (~200K tokens for Claude Opus 4.6 / OpenAI o3, ~1M for Gemini 2.5 Pro). The spec must serve as a persistent, executable artifact that guides multi-session implementation while maintaining architectural coherence.

Dependency: `flow-plan` handles tasks that fit in one context window. `flow-spec` fills the gap for larger features requiring phased, multi-session execution.

## Overview

### Context

Current `flow-plan` produces a single whiteboard.md using GODS framework — sufficient for tasks completable within one agent session. For large features (new subsystems, cross-cutting refactors, multi-component integrations), the plan either becomes too large for context or loses critical details between sessions.

### Industry State (2025-2026)

Spec-driven development (SDD) emerged as a dominant practice:
- **GitHub Spec Kit** (2025): 4-phase model — Specify → Plan → Tasks → Implement
- **Pimzino/claude-code-spec-workflow**: Requirements → Design → Tasks → Implementation with auto-generated per-task commands
- **Thoughtworks analysis**: SDD separates design from implementation, reducing "vibe coding" failures
- **Addy Osmani (O'Reilly)**: Specs must cover 6 areas — Commands, Testing, Project structure, Code style, Git workflow, Boundaries

### What Works for AI Agents

- **Dependency-ordered, testable phases** with bounded scope per phase
- **Atomic task decomposition** — each task implementable and testable in isolation
- **Modular context delivery** — feed only relevant spec sections per task, not entire document
- **Three-tier boundaries** (always/ask-first/never) for agent autonomy control
- **Living document** approach — spec evolves as implementation reveals new information
- **Explicit non-goals** — AI cannot infer from omission; must state what NOT to do
- **~150-200 instruction limit** — frontier LLMs degrade beyond this threshold per session

### What Doesn't Work

- **Monolithic specs** overloading context window → performance degradation, instruction following drops
- **Vague requirements** without concrete inputs/outputs/constraints → hallucination
- **Implementation details in spec phase** → premature coupling, wasted context tokens
- **No validation checkpoints** → spec drift accumulates silently across sessions
- **Over-specification of trivial parts** → wastes context budget on unnecessary instructions

### Risks & Limitations

- **Spec drift**: Non-deterministic code generation means spec and implementation can diverge. Mitigation: validation checkpoints after each phase
- **Multi-file context degradation**: Research shows Pass@1 drops to ~20% for infrastructure code spanning many files. Mitigation: atomic tasks targeting 1-3 files
- **Session boundary loss**: Agent loses context between sessions. Mitigation: persistent spec files with status tracking
- **Hallucination in edge cases**: LLMs generate vulnerable code at 9.8-42.1% rates across benchmarks. Mitigation: explicit security constraints in spec
- **Waterfall trap**: Over-specifying upfront defeats agile feedback. Mitigation: iterative spec refinement, not "freeze and execute"

### Model Capabilities (2026)

- **Claude Opus 4.6**: 200K context, strongest coding (SWE-bench 72.5%), 14.5h autonomous task horizon (METR record), sub-agent spawning
- **Gemini 2.5 Pro**: 1M context (91.5% accuracy at 128K, 83.1% at 1M), WebDev Arena leader, native multimodal
- **OpenAI o3**: 200K context, 100K output tokens, strong reasoning (69.1% SWE-bench)

Implication: Even with 1M context (Gemini), modular spec delivery outperforms monolithic loading due to attention degradation at scale.

### Constraints

- Must follow agentskills.io SKILL.md format
- Must be IDE-agnostic (Cursor, Claude Code, OpenCode)
- Output files only in `documents/` directory (spec files)
- Must integrate with existing `flow-plan` and GODS framework
- Skill is a Command (`flow-spec`), not a sub-skill

## Definition of Done

- [ ] `framework/skills/flow-spec/SKILL.md` created following agentskills.io format
- [ ] Skill produces structured spec document(s) in `documents/` directory
- [ ] Spec format supports decomposition into phases/tasks that fit individual context windows
- [ ] Each phase/task is self-contained with: goal, inputs, outputs, constraints, verification criteria
- [ ] Spec includes explicit non-goals, boundaries, and security constraints
- [ ] Spec tracks status per phase (not-started / in-progress / done)
- [ ] Workflow includes validation checkpoints between phases
- [ ] Skill references existing project skills where appropriate (flow-skill-write-prd, flow-skill-write-dep)
- [ ] Benchmark scenario created for the skill
- [ ] `deno task check` passes
- [ ] Skill tested through benchmark (TDD for skills)

## Solution

**Selected Variant: A — Single-File Phased Spec**

One file `documents/spec-{name}.md` containing all phases. Agent reads header + relevant phase per session.

---

### Phase 1: Design SKILL.md for `flow-spec`

**Goal:** Create `framework/skills/flow-spec/SKILL.md` — the skill definition.

**1.1 Skill Structure**

```
framework/skills/flow-spec/
└── SKILL.md
```

Frontmatter:
```yaml
---
name: flow-spec
description: >-
  Create structured specification for large features using phased decomposition.
  Produces documents/spec-{name}.md with dependency-ordered phases, atomic tasks,
  explicit boundaries, and per-phase status tracking.
disable-model-invocation: true
---
```

**1.1a When to Use**

Add a "When to Use" section at the top of SKILL.md:
- Use `flow-spec` when feature spans >3 files AND requires >2 sessions, OR has >5 phases
- Use `flow-plan` for tasks completable within one agent session
- When unsure: start with `flow-plan`; if it outgrows whiteboard.md → upgrade to `flow-spec`

**1.2 Workflow Steps (in SKILL.md)**

The skill follows a 7-step workflow, extending flow-plan's pattern:

1. **Initialize** — Create todo list, read AGENTS.md rules.
2. **Deep Context & Research** — Analyze prompt, codebase, docs, web. Resolve uncertainties proactively. If gaps remain → ask user, STOP.
3. **Draft Spec Header** — Write to `documents/spec-{name}.md`:
   - Title, Status (Draft), Date
   - Goal (business/user value)
   - Overview (current state, why now, constraints)
   - Non-Goals (explicit exclusions — critical for AI agents)
   - Architecture & Boundaries (three-tier: always/ask-first/never)
   - Definition of Done (measurable acceptance criteria)
   - **DO NOT fill Phases yet.**
4. **Decompose into Phases (Chat Only)** — Present phase breakdown in chat:
   - Each phase: goal, scope (files/components), dependencies, estimated task count
   - Phases ordered by dependency (foundations first)
   - Target: ≤30-50 requirements per phase (within 150-200 instruction limit)
   - Present to user. STOP and wait for approval/adjustments.
5. **Detail Phases** — Write approved phases into spec file. Each phase contains:
   - Phase N: {Name}
     - Status: not-started | in-progress | done
     - Goal: what this phase achieves
     - Prerequisites: which phases must be done first
     - Scope: files/components affected (target 1-5 files per task)
     - Tasks: numbered list of atomic, testable tasks
     - Verification: specific commands/checks to confirm phase completion
     - Notes: implementation hints, gotchas, references
6. **Critique** — Present spec to user in chat. Offer critique for:
   - Missing phases or hidden dependencies
   - Tasks too large (should be split) or too small (should be merged)
   - Vague verification criteria
   - Missing non-goals or boundary gaps
   - Over-specification of trivial parts
7. **Refine & Finalize** — Apply accepted critique points. Update status to "Ready".

**1.3 Rules & Constraints (in SKILL.md)**

- Pure Specification: MUST NOT write code. Only `documents/spec-{name}.md`.
- Chat-First Reasoning: Phase decomposition presented in chat before writing.
- Proactive Resolution: Exhaust codebase/docs/web before asking user.
- Stop-Analysis Protocol: If stuck after 2 attempts → STOP-ANALYSIS REPORT.
- Living Document: Spec status fields are updated during implementation. Implementer MUST update Phase Status (`not-started` → `in-progress` → `done`) when starting/completing a phase.
- Phase Size Guard: Each phase SHOULD contain ≤50 requirements and target ≤5 files per task. If exceeded → split.
- Implementation Hints Only in Notes: Spec describes WHAT and WHY. HOW — only in Notes section as implementation hints (patterns, gotchas, references), not as code.

**1.4 Output Format Template**

```markdown
# Spec: {Feature Name}

| Field   | Value        |
|---------|--------------|
| Status  | Draft/Ready/In-Progress/Done |
| Created | YYYY-MM-DD   |
| Updated | YYYY-MM-DD   |

## Goal
{Why are we building this? Business/user value.}

## Overview
{Current state, why now, relevant context.}

## Non-Goals
<!-- Examples: "No backward compatibility with v1 API", "No UI changes in this phase", "No performance optimization", "No migration of existing data" -->
- {Explicit exclusion 1}
- {Explicit exclusion 2}

## Architecture & Boundaries

### Always (agent autonomy)
- {Things agent can always do}

### Ask First
- {Things requiring user confirmation}

### Never
- {Things agent must never do}

## Definition of Done
- [ ] {Measurable criterion 1}
- [ ] {Measurable criterion 2}

---

## Phase 1: {Name}

**Status:** not-started | **Prerequisites:** none

### Goal
{What this phase achieves.}

### Scope
- {file/component 1}
- {file/component 2}

### Tasks
1. {Atomic, testable task}
2. {Atomic, testable task}

### Verification
- [ ] {Specific check or command}

### Notes
- {Implementation hints, gotchas}

---

## Phase 2: {Name}
...
```

**1.5 Verification (in SKILL.md)**

```
- [ ] ONLY `documents/spec-{name}.md` modified
- [ ] Each phase has: Goal, Prerequisites, Scope, Tasks, Verification
- [ ] Non-Goals section is non-empty
- [ ] Boundaries (always/ask-first/never) are specified
- [ ] No phase exceeds 50 requirements
- [ ] Tasks target ≤5 files each
- [ ] All phases have dependency ordering (no circular deps)
```

---

### Phase 2: Create Benchmark Scenario

**Goal:** TDD for skills — benchmark validates that flow-spec produces correct output.

**2.1 Create scenario file**
- Location: `.dev/benchmarks/scenarios/flow-spec-basic.md` (following existing benchmark patterns)
- Scenario: "Create spec for adding skill versioning to AssistFlow" (uses real project codebase as context)
- Expected: spec file created in documents/, contains all required sections (Goal, Non-Goals, Phases, etc.)
- Validation criteria: file exists, has correct structure, phases are dependency-ordered, non-goals present, references real project files

**2.2 Run benchmark**
- Execute via `deno task benchmark` or equivalent
- Verify scenario passes
- Fix any issues in SKILL.md

---

### Phase 3: Integration & Verification

**3.1 Validate skill format**
- Run `deno task check` — ensures SKILL.md passes skill validation
- Verify no lint/format errors

**3.2 Update project documentation**
- Add flow-spec to skill registry if one exists
- Ensure `deno task link` picks up the new skill

---

### Execution Order

```
Phase 1 (SKILL.md) ──→ Phase 2 (Benchmark) ──→ Phase 3 (Integration)
```

### Estimated Scope

- **New files:** 2 (SKILL.md, benchmark scenario)
- **Modified files:** 0-1 (skill registry if exists)
- **Net file delta:** +2-3
