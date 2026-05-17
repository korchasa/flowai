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

## Composite Skill Authoring (FR-SKILL-COMPOSE)

Composite and atomic SKILL.md files are **gitignored build artefacts** — never hand-edit, and don't expect to see them in git. Source of truth: `framework/atoms/<name>.md` atom files + `framework/composites/<name>.md` composite wrappers + the `framework/composites.yaml` manifest, all consumed by [scripts/generate-skill-composites.ts](../scripts/generate-skill-composites.ts). Every consumer regenerates first: `deno task check`, `deno task acceptance-tests`, `deno task build-plugins`, and the CI `Build framework tarball` step each run `--write` as a prerequisite before reading SKILL.md, so the rendered output is always current and there is no tracked rendered copy that can drift. Manual regeneration: `deno run -A scripts/generate-skill-composites.ts --write` (idempotent). The 8 generated paths are explicitly listed in `.gitignore`; the generator's `checkGitignoreParity` fails the build if the list goes out of sync with `--list-targets`.

The rules below describe **what the generator emits** and what its canon validator enforces. They are written for the maintainer who edits `framework/atoms/*.md` or `framework/composites/*.md`, not for the agent that runs the SKILL.md.

1. **No delegation** _(machine-enforced)_: Generated SKILL.md MUST contain a `**No delegation**` rule in `<rules>` instructing the agent to execute inlined steps directly and NOT invoke the source primitives via the Skill tool. The wrapper's `<rules>` block supplies this text; the canon validator rejects the composite if it is missing.
2. **No source-skill names in description** _(machine-enforced)_: Frontmatter `description:` MUST NOT name any atom from the manifest. The canon validator greps the description against `framework/composites.yaml` `atoms:` keys and fails the build on any match. Naming source skills in the description prompts the model classifier to invoke them via Skill tool.
3. **Self-contained marker** _(machine-enforced)_: Description MUST include the exact phrase "Self-contained — execute the inlined steps directly" so the agent reliably treats the composite as terminal. Canon validator rejects composites that drop this phrase.
4. **Verdict Gate explicitness** _(machine-enforced)_: Inter-phase verdict gates MUST tell the agent what to do on EACH verdict, including the success case (e.g., "Approve → DO NOT commit yet. Continue with the Commit steps below."). Gate text lives in `<gate after="N">…</gate>` blocks inside the wrapper; the canon validator requires Approve AND a reject path (Request Changes / Needs Discussion / Reject) in the same gate.
5. **One `<step_by_step>` per atom slot**: Each atom source MUST contain exactly one `<step_by_step>` block; the atom canon validator rejects multiple. The composite renderer extracts that single block per phase and emits it under a `### <title>` heading.
6. **Token budget**: SKILL.md MUST stay under 500 lines (canon validator caps this). The 5000-token cap from `FR-UNIVERSAL.DISCLOSURE` is relaxed for composites — the list of exempt skills is derived live from `framework/composites.yaml` via `scripts/lib/composite-list.ts`. Adding a composite to the manifest automatically exempts it; there is no separate list to keep in sync.

To add a new composite: write `framework/atoms/<name>.md` files for any new phases (or extend an existing atom with a new `<param-branch>` value), write a `framework/composites/<name>.md` wrapper (frontmatter + body with `{{PHASES}}` marker + `<inline-phase index="N">` and `<gate after="N">` blocks as needed), add the composite entry to `framework/composites.yaml`, then run the generator and `deno task check`.

## Benchmark Fixture deno.json Contract

When an acceptance test scenario invokes `deno task check` (or any project-check command) inside the sandbox, the fixture's `deno.json` MUST exclude the copied framework + bench artefacts from fmt/lint/test:

```json
"fmt":  { "exclude": [".claude/", "documents/", "acceptance-tests/"] },
"lint": { "exclude": [".claude/", "documents/", "acceptance-tests/"] },
"test": { "exclude": [".claude/", "acceptance-tests/"] }
```

Without these, the sandbox's `deno fmt --check` and `deno lint` apply to the copied `framework/`-as-`.claude/` tree, which has formatting/lint drift relative to the sandbox project. Symptoms: a happy-path checklist item like `check_gate_enforced` fails with the agent surfacing an fmt diff against files it never touched. Fix-it-once template lives in `framework/core/commands/flowai-do-with-plan/acceptance-tests/full-cycle/fixture/deno.json`.
