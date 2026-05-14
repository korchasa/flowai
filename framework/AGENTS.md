# Framework (Product)

Source of truth for end-user packs (skills, agents) distributed via [flowai](https://github.com/korchasa/flowai).

## Responsibility

- `<pack>/pack.yaml` — Pack manifest (name, version, description, scaffolds).
- `<pack>/commands/` — **User-only** workflows (`SKILL.md` directories). Names: `flowai-*`, `flowai-setup-*`. Source files MUST NOT declare `disable-model-invocation`; the CLI writer injects it at sync time based on directory placement. Benchmark scenarios co-located in `<pack>/commands/<command>/acceptance-tests/`.
- `<pack>/skills/` — **Agent-invocable** capabilities (`SKILL.md` directories). Names: `flowai-*`. Source files MUST NOT declare `disable-model-invocation`. Benchmark scenarios co-located in `<pack>/skills/<skill>/acceptance-tests/`. Each skill carries TWO categories of scenarios:
  - **Execution scenarios** (1+ per skill): verify the skill produces correct results when triggered.
  - **Trigger scenarios** (FR-ACCEPT.TRIGGER, exactly 3 per skill): verify description-matching correctness. One positive (`trigger-pos-1/mod.ts`) the skill should activate on; one adjacent-negative (`trigger-adj-1/mod.ts`) where a different skill is the right match; one false-use-negative (`trigger-false-1/mod.ts`) inside the skill's domain but with the wrong intent. Coverage gated by `scripts/check-trigger-coverage.ts`. Authoring guidance in `flowai-write-agent-benchmarks` §6.1.
- `<pack>/agents/` — Canonical agent definitions (`<agent-name>.md` files, IDE-agnostic). Each agent has `name` + `description` frontmatter and a shared system prompt body. IDE-specific transformation is handled by flowai at install time. Benchmark scenarios co-located in `<pack>/agents/<agent-name>/acceptance-tests/`.
- `<pack>/assets/` — Shared templates (AGENTS.md templates) used by multiple skills and the acceptance test runner.
- `<pack>/acceptance-tests/` — Pack-level acceptance test scenarios (e.g., AGENTS.md rules verification) with shared fixtures.

### Installation shape

Both `<pack>/commands/` and `<pack>/skills/` install into the **same** target directory `.{ide}/skills/`. The distinction is the `disable-model-invocation: true` flag on commands (injected by the writer, not authored). IDE-level native slash-command directories (`.{ide}/commands/`) are reserved for user-owned primitives managed by `flowai user-sync` — framework commands do not land there.

## Packs

- `core` — Base commands (commit, plan, review, init, etc.) + core agents.
- `devtools` — Skill/agent authoring tools.
- `engineering` — Procedural engineering knowledge (deep-research, fix-tests, etc.).
- `deno` — Deno-specific skills.
- `typescript` — TypeScript-specific setup skills.
- `memex` — Memex: long-term knowledge bank for AI agents (three skills: save, ask, audit).

## Key Decisions

- Scripts in `<pack>/skills/*/scripts/` and `<pack>/commands/*/scripts/` must be standalone-runnable (use `jsr:` specifiers, no import maps).
- Skills and commands follow [agentskills.io](https://agentskills.io/home) standard; the `commands/` vs `skills/` directory is the framework-level classifier for user-only vs agent-invocable intent.
- Agent format is canonical (IDE-agnostic); flowai adds IDE-specific frontmatter during distribution.
- Scaffolded artifact mapping declared in `pack.yaml` `scaffolds:` field (primitive-name → artifact paths; resolves the same whether the primitive lives under `commands/` or `skills/`).

## IDE Behavior Notes

- **Claude Code skill routing has two surfaces**: the model's preloaded skill catalog (frontmatter `description`) AND a runtime directory listing of `.claude/skills/` that the agent can read mid-conversation. The latter lets the agent invoke a `Skill` tool call by directory name even when the description does not match the query. Implications: (1) skill descriptions cannot fully suppress activation; the directory name is also a routing key. (2) Trigger acceptance tests (FR-ACCEPT.TRIGGER) must treat "agent reads `SKILL.md` to answer a meta-question about the skill" as a positive, not a false-use trap. (3) Description quality controls *preference* among installed skills, not absolute *availability*.

## Composite Skill Authoring

A composite skill inlines step_by_step blocks from 2+ standalone skills (kept in sync by `scripts/check-skill-sync.ts`). Without the rules below, the agent invokes the source skills via the Skill tool and silently bypasses the composite's gate logic — fixed once in this project (commit history: no-delegation rule + verdict gate hardening).

1. **No delegation**: SKILL.md MUST contain a `**No delegation**` rule in `<rules>`: "Phase N is FULLY INLINED below. Execute the steps directly. Do NOT invoke `<source-skill-name>` via the Skill tool — it would re-enter without the composite's gate logic."
2. **No standalone-skill names in description**: Frontmatter `description:` MUST NOT name the source skills (e.g., write "two-phase review-and-commit workflow", not "combines flowai-review and flowai-commit"). Naming source skills in the description prompts the model classifier to invoke them via Skill tool.
3. **Self-contained marker**: Description MUST include the phrase "Self-contained — execute the inlined steps directly" so the agent reliably treats the composite as terminal.
4. **Verdict Gate explicitness**: If the composite has a phase gate, the gate text MUST tell the agent what to do on EACH verdict, including the success case (e.g., "Approve → DO NOT commit yet. Phase 2 below is MANDATORY"). Implicit success paths get skipped under cognitive load.
5. **Source skills must contain exactly ONE `<step_by_step>` block.** `scripts/check-skill-sync.ts` `extractStepByStep` returns the FIRST `<step_by_step>` match only — it is not a global regex, by design, for simplicity. A multi-block source (notably another composite like `flowai-review-and-commit`, which has two `<step_by_step>` blocks for Phase 1 and Phase 2) would silently lose sync coverage of everything after the first block. To inline behaviour from an existing composite, point `SYNC_CHECKS` at the original primitive sources of that composite (e.g. `flowai-review` + `flowai-commit-beta`), NOT at the composite itself.
6. **Token budget**: SKILL.md MUST stay under 500 lines. The 5000-token cap from `FR-UNIVERSAL.DISCLOSURE` is relaxed for composites (see `scripts/composite-skills.ts` `COMPOSITE_SKILLS`), since their byte count is dictated mechanically by the inlined sources. Add a new composite name to `COMPOSITE_SKILLS` AND to `SYNC_CHECKS` together — `scripts/composite-skills_test.ts` enforces the agreement.

## Benchmark Fixture deno.json Contract

When an acceptance test scenario invokes `deno task check` (or any project-check command) inside the sandbox, the fixture's `deno.json` MUST exclude the copied framework + bench artefacts from fmt/lint/test:

```json
"fmt":  { "exclude": [".claude/", "documents/", "acceptance-tests/"] },
"lint": { "exclude": [".claude/", "documents/", "acceptance-tests/"] },
"test": { "exclude": [".claude/", "acceptance-tests/"] }
```

Without these, the sandbox's `deno fmt --check` and `deno lint` apply to the copied `framework/`-as-`.claude/` tree, which has formatting/lint drift relative to the sandbox project. Symptoms: a happy-path checklist item like `check_gate_enforced` fails with the agent surfacing an fmt diff against files it never touched. Fix-it-once template lives in `framework/core/commands/flowai-do-with-plan/acceptance-tests/full-cycle/fixture/deno.json`.
