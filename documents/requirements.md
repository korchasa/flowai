# Software Requirements Specification (SRS)

## 1. Introduction

- **Document purpose:** Define requirements for the AI-First IDE Rules and Commands project.
- **Scope:** A collection of skills, agents, and commands to standardize and enhance development workflows in AI-first IDEs (Cursor, Claude Code, OpenCode).
- **Audience:** Developers and AI agents working in supported AI IDEs.
- **Definitions and abbreviations:**
  - **IDE:** Integrated Development Environment.
  - **MCP:** Model Context Protocol.
  - **MDC:** Markdown Configuration (Cursor rules format).
  - **GODS:** Goal, Overview, Done, Solution (planning framework).
  - **SPOT:** Single Point of Truth.

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
- **Status:** [ ]

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
- **Key capabilities:** Isolated sandbox execution (`SpawnedAgent`), LLM-based Judge, evidence collection, interactive flows (`UserEmulator`), cost/token tracking, HTML tracing, parallel execution protection.
- **Architecture:** Co-located scenarios (`framework/<pack>/skills/<skill>/acceptance-tests/` and `framework/<pack>/commands/<command>/acceptance-tests/`), pack-level scenarios (`framework/<pack>/acceptance-tests/`), pack-scoped sandbox, Claude CLI judge (`cliChatCompletion`), mandatory `agentsTemplateVars` (compile-time enforced).
- **Implementation:** `scripts/acceptance-tests/lib/` (runner, judge, spawned_agent, user_emulator, trace, types, utils).

### FR-ACCEPT-ISOLATION: Sandbox Isolation From User-Level Skills [ANC:fr:accept-isolation]

- **Desc:** `deno task acceptance-tests` MUST judge the sandbox `SKILL.md` (the one written into `<sandbox>/.claude/skills/<name>/`), not the developer's user-level installation at `~/.claude/skills/<name>/`. Without this, framework-source `SKILL.md` edits never reach the model: Claude Code's Skill tool resolves user-level over project-level on collision, so any DIFF skill silently delivers stale text and the Acceptance Test TDD RED→GREEN cycle produces no observable change.
- **Scenario:** A contributor edits `framework/<pack>/skills/<name>/SKILL.md` and runs `deno task acceptance-tests -f <name>`. The model must load the edited body, not whatever the user happened to install via `flowai sync` weeks ago. Constraint: the acceptance-tests runner MUST NOT modify, move, symlink, or delete `~/.claude/skills/`.
- **Mechanism (Claude adapter only):** `ClaudeAdapter.prepareWorkspace(<sandbox>)` builds an isolated `$HOME = <workDir>/bench-home/` (sibling of the sandbox; deliberately outside the sandbox cwd so `git status` does not see it as untracked) containing an empty `.claude/skills/` (so user-level resolution finds nothing) plus targeted symlinks back to the real `$HOME` for OAuth/Keychain auth (`Library/Keychains`) and the versioned launcher binary (`.local/share/claude`). `.credentials.json` is intentionally NOT mirrored — letting Keychain win avoids stale-refresh-token 400s. Cursor and Codex adapters do not implement `prepareWorkspace` (no analogous Skill tool resolution path exists).
- **Acceptance:**
  - [x] Programmatic isolation test: `<workDir>/bench-home/.claude/skills/` is created empty by `prepareWorkspace`.
    Evidence: `deno test -A scripts/acceptance-tests/lib/adapters/claude_test.ts --filter "prepareWorkspace isolation: empty user-level skills dir"`.
  - [x] Auth-related symlinks track host: present iff source path exists on host (`Library/Keychains`, `.local/share/claude`).
    Evidence: `deno test -A scripts/acceptance-tests/lib/adapters/claude_test.ts --filter "auth-related symlinks track host"`.
  - [x] `.credentials.json` is never mirrored into `<workDir>/bench-home/.claude/`.
    Evidence: `deno test -A scripts/acceptance-tests/lib/adapters/claude_test.ts --filter "never mirrors .credentials.json"`.
  - [x] `~/.claude/skills/` snapshot (entry names + mtimes) is byte-identical before and after `prepareWorkspace`.
    Evidence: `deno test -A scripts/acceptance-tests/lib/adapters/claude_test.ts --filter "does not touch ~/.claude/skills/"`.
  - [x] Cache key invalidates on any change inside `scripts/acceptance-tests/lib/adapters/` (so old cached verdicts cannot mask the fix on first post-merge run).
    Evidence: `deno test -A scripts/acceptance-tests/lib/cache_test.ts --filter "isolation-key-change"`.
  - [x] `AgentAdapter.prepareWorkspace` is optional in the contract; runner only invokes it when adapter implements it (Cursor/Codex pass through unchanged).
    Evidence: `scripts/acceptance-tests/lib/runner.ts` (`adapter.prepareWorkspace ? ... : {}`); `scripts/acceptance-tests/lib/adapters/types.ts` (declared optional).
- **Non-acceptance (explicit trade-offs):**
  - macOS-first: the symlink set targets macOS auth (Keychain). On Linux/CI without `~/Library/Keychains`, those symlinks are skipped — auth then relies on whatever Linux mechanism the developer has set up. CI workflows that already export `ANTHROPIC_API_KEY` are unaffected.
  - First post-merge run pays ~120 fresh executions: the cache key changes (adapter source touched), invalidating the prior `[CACHED]` verdicts.
  - **Container-based isolation is incompatible with subscription auth.** The reason this scheme works silently is a chain that exists ONLY on the macOS host: (1) the Claude Pro/Max OAuth token lives in macOS Keychain, not on disk; (2) the keychain item carries an ACL granting "Always Allow" to the `claude` binary by code-signing identity; (3) the bench reuses the SAME signed binary with `HOME=<bench-home>` whose `Library/Keychains` symlinks back to the host DB → kernel matches code signature → token released without prompts. None of these hold inside a Linux container: no Keychain Services API, the Linux `claude` binary expects `~/.claude/.credentials.json` (file not present on macOS hosts), and extracting the token to a file requires a one-time interactive Keychain approval of the `security` CLI. A previous Docker isolation attempt (commit `ce1d4c1`, removed in `9e30ab7`) was abandoned for this reason — there is no path to subscription-auth inside a container without a manual approval step. Resource isolation is therefore handled in userspace on the host instead — see FR-ACCEPT-GUARDS.
- **Open (follow-up):**
  - [ ] `~/.local/share/claude/versions/<v>/` PID-lock contention under parallel scenarios is a pre-existing concern — not introduced by isolation, but worth a separate fix.

### FR-ACCEPT-GUARDS: Resource Guards For Spawned Agents [ANC:fr:accept-guards]

- **Desc:** `SpawnedAgent` MUST defend the host against two failure modes observed on 2026-05-09 that escalated to multi-reboot system hangs: (1) **fork-loop** — a benchmarked skill recursively spawns subprocesses (incident at 02:43: a `configure-deno-commands` scenario produced a `deno test -A` chain that grew to ~720 descendants in 90 s); (2) **bloat-OOM** — a single agent process leaks/holds memory until the kernel VM compressor saturates (incident at 07:50: `compressor_size = 7.18 GiB`, `compression_ratio = 14`, kernel found "no eligible processes" to jetsam, `SystemUIServer` froze in TCC checks, host hung until forced reboot at 08:53). Container-based isolation is unavailable (see FR-ACCEPT-ISOLATION trade-offs), so guards run in userspace on the host.
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
  - [x] When `assertHealthy` throws, `SpawnedAgent.start` catches `SystemUnhealthyError`, logs `[health] aborting spawn: ...`, and surfaces exit code 75 without spawning.
    Evidence: `deno test -A scripts/acceptance-tests/lib/system_health_test.ts` (covers threshold-trip path).
  - [ ] Watchdog publishes the `trip` object BEFORE killing (so consumers reading `watchdog.trip()` after `child.status` resolves on SIGTERM see the verdict, not `null`).
    Evidence: `process_watchdog.ts:tripNow` sets `trip` before awaiting `killTree`.
- **Non-acceptance (explicit trade-offs):**
  - Userspace, not kernel-enforced. Sub-`intervalMs` (default 2000) reaction window: a fork bomb that produces 1000+ children in < 4 s can still cause a brief CPU spike before the second confirm sample fires. Acceptable because the host stays alive and the watchdog catches the next sample.
  - Per-agent guards do not cap the AGGREGATE across N parallel agents. If `task-bench.ts` ever spawns concurrent scenarios, each agent's 6 GiB cap multiplies → an N-agent run can consume `N × 6` GiB before any individual trip. Not addressed in this FR; if/when concurrency lands, add an aggregate accumulator in the runner orchestrator.
  - `assertHealthy` is macOS-only (Linux returns neutral). Linux/CI runs rely on the kernel's own OOM-killer.
  - Setting `BENCH_MAX_RSS_GB` too low (< ~1.5 GiB for `claude`) will trip during normal long-context turns. Default 6 GiB is calibrated against observed peaks; lower with care.
- **Deferred (not blocking — root cause fixed in `configure-deno-commands` SKILL.md rules 13–14, which prevents the agent from generating the fork-bomb pattern at source; userspace guards remain as defense-in-depth):**
  - Aggregate RSS accumulator across all live `SpawnedAgent` instances. Activate only when `task-bench.ts` adds concurrent scenario execution; current runner is sequential.
  - End-to-end re-validation on a low-memory host with the original fork-loop scenario re-introduced. Verified indirectly on 2026-05-09: re-ran `configure-deno-commands-trigger-pos-{1,2,3}` (the `-2`/`-3` scenarios were later consolidated into `-1` on 2026-05-10), `-basic`, `setup-ai-ide-devcontainer-{deno-claude,feature-discovery}` after the SKILL.md fix — six previously-dangerous scenarios passed without tripping the watchdog and without measurable swap pressure.

### FR-ACCEPT-CACHE: Acceptance Test Result Cache [ANC:fr:accept-cache]

- **Desc:** Commit per-scenario acceptance test verdicts to the repo; re-run only when a cache-key input changes. Makes `deno task acceptance-tests` an incremental operation.
- **Scenario:** Contributor runs `deno task acceptance-tests`; unchanged scenarios hit the cache and return instantly with zero LLM calls. A touched primitive or fixture forces re-execution. `--cache-check` is a CI gate that fails when the cache is stale.
- **Acceptance:**
  - [x] Cache files live under `acceptance-tests/cache/<pack>/<scenario-id>/<ide>.json`, tracked by git (directory not excluded in `.gitignore`).
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
- **Tasks:** [remove-flowai-prefix-from-primitives](tasks/2026/05/remove-flowai-prefix-from-primitives.md)
- **Scope:** Only `framework/<pack>/skills/`. Commands (`framework/<pack>/commands/`) carry `disable-model-invocation: true` (injected at sync) and are triggered by explicit `/name` — out of scope.
- **Shape:** Regular `AcceptanceTestScenario` with one `userQuery` and one critical checklist item evaluated by the LLM judge against the trace. No new infra.
- **Layout:** Sibling folders inside the skill's existing `acceptance-tests/`:
  - `trigger-pos-1/mod.ts` — query the skill SHOULD activate on
  - `trigger-adj-1/mod.ts` — query an ADJACENT skill is correct for; this skill should stand down
  - `trigger-false-1/mod.ts` — query in this skill's domain but wrong intent (e.g., asking *about* the skill, not asking *to do* the skill's job)
- **Naming:** Scenario `id` follows `<skill-id>-trigger-<pos|adj|false>-1`; directory name matches the scenario id's tail (`trigger-<type>-1`). The trailing `-1` is preserved for backward compatibility with existing scenario ids and trace tooling, but only `n=1` is permitted.
- **Checklist contract:**
  - Positives: id `skill_invoked`, critical: true — judge confirms the trace contains a `Skill` tool call or `SKILL.md` read for the target skill, AND the agent acted on it.
  - Negatives (adjacent + false): id `skill_not_invoked`, critical: true — judge confirms the trace does NOT contain a `Skill` tool call or `SKILL.md` read for the target skill (the agent invoked a different skill or responded directly).
- **Enforcement:** `scripts/check-trigger-coverage.ts` fails `deno task check` on missing/misnamed scenarios. Stray `trigger-{pos,adj,false}-{2,3,...}` directories are reported as misnamed (the previous 3+3+3 layout was reduced to 1+1+1 on 2026-05-10; see `documents/tasks/2026/05/trigger-n1-retry.md`).
- **Cost note:** Full sweep adds N×3 scenarios to `deno task bench` (was N×9). The result cache (FR-ACCEPT-CACHE) absorbs unchanged scenarios; refreshes are scoped to skill-description edits.
- **Retry:** Judge-level retry-on-error (`scripts/acceptance-tests/lib/judge.ts:103`) absorbs transient judge failures. Agent-level retry on result is intentionally NOT performed — re-running a "skill not invoked" scenario until it passes would mask real description regressions. Suspected agent variance is investigated by manual re-run (`deno task bench -f <scenario-id>`); if empirical flake rate at N=1 proves > 5% per scenario, add a scenario-level `retryOnFail` field as a separate FR.
- **Acceptance verified by acceptance tests:** every `framework/*/skills/*/acceptance-tests/trigger-{pos,adj,false}-1/mod.ts` (verified by `scripts/check-trigger-coverage.ts`).
- **Acceptance:** `deno test scripts/check-trigger-coverage_test.ts` passes; `find framework -type d -path '*/skills/*/acceptance-tests/trigger-*' | wc -l` equals (skill count) × 3.
- **Status:** [x]

### FR-ACCEPT.OPENCODE: OpenCode Adapter for Acceptance Test Runner [ANC:fr:accept.opencode]

- **Desc:** The acceptance-test runner MUST ship a working `OpencodeAdapter` (`scripts/acceptance-tests/lib/adapters/opencode.ts`) implementing the full `AgentAdapter` interface for the `opencode` CLI. Project docs (README, SDS §2, `documents/ides-difference.md`) list four supported IDEs — Cursor, Claude Code, OpenCode, OpenAI Codex — but the runner currently exposes adapters for only three; `"opencode"` sits in the `AgentAdapter.ide` union as a dead enum value. Closing this gap restores capability parity across the four declared IDEs and lets pack-level scenarios (FR-ACCEPT.RULES, FR-ACCEPT.TRIGGER) execute against OpenCode without per-call special-casing.
- **Tasks:** [opencode-acceptance-adapter](tasks/2026/06/opencode-acceptance-adapter.md)
- **Scope:** Runner-side only. Plugin distribution to OpenCode (skill / agent emit, frontmatter transform) is already covered by FR-DIST.* + `cli-internals.ts`; this FR does NOT duplicate that contract — it consumes the existing transform and exposes its output to the benchmark sandbox.
- **Cross-Implementation Symmetry contract:** Parity with `ClaudeAdapter`, `CodexAdapter`, `CursorAdapter` for: `ide`, `configDir`, `command`, `outputFormat`, `buildArgs`, `parseOutput`, `getEnv`, `setupMocks`, `calculateUsage`, `cliVersion`. `prepareWorkspace` remains optional — implement only if a user-level skill collision analogous to `~/.claude/skills/` shadowing exists for OpenCode.
- **Acceptance:** `deno test scripts/acceptance-tests/lib/adapters/opencode_test.ts` (to be authored together with the implementation) passes AND at least one existing benchmark scenario runs green against `--ide opencode`. Per-step DoD (file existence, registration in `mod.ts`, unit-test coverage) is tracked in the linked task file.
- **Status:** [ ]

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

- **Desc:** Additional native-plugin distribution channel for Claude Code and Codex users. The framework publishes a generated marketplace at downstream repo `korchasa/flowai-plugins`. Surface catalogs (`.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`) and plugin payloads are generated from `framework/<pack>/` by `scripts/build-plugins.ts` on every framework release (CI step inside the existing `release` job, gated on `framework-v*` tag publication). No plugin artefacts are committed to this repo (`dist/` is gitignored). Six marketplace packs ship as separate plugins (`flowai`, `flowai-deno`, `flowai-devtools`, `flowai-engineering`, `flowai-memex`, `flowai-typescript`). flowai CLI distribution (FR-DIST.SYNC) remains supported and is the channel for Cursor / OpenCode.
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
  - `<out>/plugins/<plugin>/agents/<name>.md` — frontmatter passed through the universal → Claude-native mapping from FR-DIST.MAPPING (keeps `name`, `description`, `tools`, `disallowedTools`, `model`, `effort`, `maxTurns`, `background`, `isolation`, `color`; drops `readonly`, `mode`, `opencode_tools`; resolves `model` tier `max|smart|fast|cheap` to `opus|sonnet|haiku|haiku`, drops `inherit`).
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
| `model` (tier) | resolved to IDE-native | resolved to IDE-native | resolved from .flowai.yaml or omitted | dropped (Codex subagents inherit the session model) |
| `effort` | dropped | kept | dropped | dropped |
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
| `model` | yes (tier → resolved) | — | yes (tier → resolved) | Override model (tier: max/smart/fast/cheap/inherit) |
| `effort` | yes | — | — | Reasoning effort level |
| `argument-hint` | yes | — | — | Argument placeholder |

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
- **Use case scenario:** A maintainer edits `framework/atoms/commit.md`. They run `deno task check` — `--write` regenerates the atom's standalone SKILL.md AND every composite SKILL.md that consumes the atom (`review-and-commit`, `ship`), each with phase-specific params. Fresh-clone scenario: developer clones, runs `deno task check`; the generator's `--write` prerequisite materializes all 7 SKILL.md files before any downstream check runs. Adding a new composite: the maintainer edits `framework/composites.yaml`, runs `deno task check`, sees a parity error from `checkGitignoreParity` pointing at the missing `.gitignore` entry; adds it; re-runs.
- **Tasks:** [generate-skills-from-atoms](tasks/2026/05/generate-skills-from-atoms.md), [remove-flowai-prefix-from-primitives](tasks/2026/05/remove-flowai-prefix-from-primitives.md)
- **Acceptance verified by acceptance tests:** `scripts/generate-skill-composites_test.ts` (manifest loading + render + canon validation + gitignore parity); `scripts/check-pack-refs_test.ts` (bundle-leakage detection); plus the full acceptance-test suites for every regenerated primitive (`plan`, `review`, `commit`, `review-and-commit`, `ship`) as semantic-equivalence gate.
- **Evidence:** `deno test -A scripts/generate-skill-composites_test.ts && deno test -A scripts/check-pack-refs_test.ts && deno run -A scripts/generate-skill-composites.ts --check && deno run -A scripts/check-pack-refs.ts --leakage`
- **Status:** [x]

### FR-ATOM-IMPLEMENT: TDD Implement Atom — `implement` [ANC:fr:atom-implement]

- **Description:** Model-invocable skill that drives the canonical TDD cycle (RED → GREEN → REFACTOR → CHECK, per [AGENTS.md § TDD Flow](../framework/AGENTS.md)) against a written plan's Solution section. Triggers on "implement under TDD per task plan" prompts without overlapping `plan` (planning), `review` (post-implement review), or `fix-tests` (existing-test repair). Source: `framework/atoms/implement.md`. Generated SKILL.md materialized by [scripts/generate-skill-composites.ts](../scripts/generate-skill-composites.ts) per FR-SKILL-COMPOSE.
- **Tasks:** [generate-skills-from-atoms](tasks/2026/05/generate-skills-from-atoms.md)
- **Acceptance verified by acceptance tests:** `implement-tdd-cycle-completes`, `implement-returns-to-red-on-check-failure`, `implement-trigger-pos-1`, `implement-trigger-adj-1`, `implement-trigger-false-1`. (Implementation deviates from the task's "consolidated mixed-1" plan to keep `check-trigger-coverage.ts` happy without an exemption.)
- **Status:** [x]

### FR-ATOM-PUSH: Git Push Atom — `push` [ANC:fr:atom-push]

- **Description:** User-invoked command (kind=command; CLI writer injects `disable-model-invocation: true` at sync time) that pushes the current branch to its remote with a strict safety contract: (a) `--force` is forbidden; (b) `--force-with-lease` is permitted ONLY with explicit per-push user authorization in chat (not via a session-long flag), **AND ONLY on non-protected branches**; (c) if upstream is unset → run `--set-upstream` automatically AFTER explicit user confirmation that the branch should track; (d) when the remote branch is `main`/`master` AND the remote has commits the local does not have, REFUSE both `--force` and `--force-with-lease` absolutely — explicit per-push authorization does NOT unlock force here (canonical regression: destroying a teammate's commits). The agent asks with exactly two options: pull-rebase or abort. If the user volunteers "force", "overwrite", or similar, the agent restates the refusal; (e) when the local branch is unprotected but the user typed a target other than the current branch, refuse. Post-push verification: `git rev-parse @{u}` matches `HEAD`. Source: `framework/atoms/push.md`.
- **Tasks:** [generate-skills-from-atoms](tasks/2026/05/generate-skills-from-atoms.md), [REF:task:2026-06-push-await-ci | push-await-ci]
- **Acceptance verified by acceptance tests:** `push-happy-path`, `push-sets-upstream-on-first-push`, `push-refuses-force-on-divergence`. No trigger scenario (commands carry no trigger scenarios anywhere in the codebase).
- **Status:** [x]

#### FR-ATOM-PUSH.CI-AWAIT: Await CI then Investigate Failures [ANC:fr:atom-push.ci-await]

- **Description:** When the project's `AGENTS.md` declares a `## CI/CD` section (Provider, Status command, optional Logs command, optional Run URL command), the `push` atom MUST, after a successful local push, poll the declared Status command until terminal state, with the cap of 30 iterations × 60s sleep ≈ 30 minutes. Exit codes: 0=green, 1=red (terminal failure), 2=in-progress (continue polling), other=malformed status command (STOP fail-fast). On red the atom hands off to the `investigate` skill with the failed-run URL and a 12 KB log buffer; on timeout the atom STOPs with a timeout report and does NOT invoke investigate; on absence of the `## CI/CD` section the atom skips silently with a one-line note. The wait is unconditional when CI is declared — there is no per-push opt-out param. Status command MUST be a single-shot status query (NOT a blocking wait like `gh run watch --exit-status`); the iteration cap is what bounds wall-clock. Commands receive the pushed SHA via `$SHA` env. The `## CI/CD` section is user-populated (not scaffolded by `init`) — projects without CI omit it entirely and the atom skips. Source: `framework/atoms/push.md` step 6.
- **Tasks:** [REF:task:2026-06-push-await-ci | push-await-ci]
- **Acceptance verified by acceptance tests:** `push-skips-ci-await-when-not-declared`, `push-awaits-ci-success`, `push-investigates-ci-failure`, `push-stops-on-malformed-ci-block`. The timeout-branch (30-iteration cap) test (`push-stops-on-ci-timeout`) is intentionally deferred — strict assertion needs runner-level `sleep` shimming, which is out of scope here.
- **Status:** [ ]

### FR-SHIP: Terminal Full-Cycle Workflow — `ship` [ANC:fr:ship]

- **Description:** User-invoked composite command: plan → implement → review → commit → push. Five phases, four explicit gates (variant-selection after Plan, green-check before Review, verdict gate before Commit, clean-tree + branch-protection check before Push). Generated from `framework/composites/ship.md` + the five atoms (`plan`, `implement`, `review`, `commit`, `push`) per FR-SKILL-COMPOSE. Composite canon (no delegation, "Self-contained — execute the inlined steps directly" marker, explicit verdict-gate branches, 700-line cap) is machine-enforced by the generator.
- **Tasks:** [generate-skills-from-atoms](tasks/2026/05/generate-skills-from-atoms.md)
- **Acceptance verified by acceptance tests:** `ship-full-cycle-success`, `ship-pauses-for-variant-selection`, `ship-rejects-on-changes-requested`, `ship-refuses-push-on-dirty-tree`. No trigger scenario (command convention).
- **Status:** [x]

### FR-SHIP-TASK: SDLC Continuation from a Ready Task File — `ship-task` [ANC:fr:ship-task]

- **Description:** User-invoked composite command that picks up the SDLC AFTER the planning phase. Takes a path (or identifier) to a task file with a filled `## Solution` section and drives implement → review → commit → push. Four phases, three explicit gates (green-check before Review, verdict gate before Commit, clean-tree + branch-protection check before Push). The Plan atom is intentionally absent; the composite STOPs if the task file is missing or its `## Solution` is empty. Generated from `framework/composites/ship-task.md` + the four atoms (`implement`, `review`, `commit`, `push`) per FR-SKILL-COMPOSE. Composite canon (no delegation, "Self-contained — execute the inlined steps directly" marker, explicit verdict-gate branches, 700-line cap) is machine-enforced by the generator.
- **Acceptance verified by acceptance tests:** `ship-task-full-cycle-success`. No trigger scenario (command convention).
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
  - [x] Metadata (~100 tokens) loaded at startup; full SKILL.md (<5000 tokens, <500 lines) on activation; scripts/references/assets loaded only when required. Enforced by `scripts/check-skills.ts`.
  - [x] **Composite-skill exemption (FR-SKILL-COMPOSE):** the composite roster is derived live from `framework/composites.yaml` `composites:` keys via [scripts/lib/composite-list.ts](../scripts/lib/composite-list.ts); the SKILL.md files for those composites are exempt from the 5000-token cap. Their byte count is mechanically dictated by the atom `<step_by_step>` blocks the generator inlines; the no-delegation canon is machine-enforced by the generator's canon validator (see `framework/CLAUDE.md` § Composite Skill Authoring). Line cap (500) and frontmatter catalog cap (100 tokens) still apply. No separate list to keep in sync — adding a composite to `framework/composites.yaml` automatically exempts it.

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
- **Acceptance verified by acceptance tests:** `adapt-skills-basic`, `adapt-agents-basic`

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

- **Desc:** Compares pack-level templates (`{ide}/assets/`) with project artifacts (AGENTS.md), proposes updates for outdated framework sections.
- **Acceptance:**
  - [ ] Reads asset mapping from `pack.yaml` or uses default mapping.
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
  - [x] `run.ts` uses stdin JSON contract (Claude Code canonical format). Cursor/OpenCode wrappers normalize format. SessionStart hooks output `hookSpecificOutput.additionalContext`.
  - [x] 1 framework hook: `skill-structure-validate` (devtools).

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
- **Tasks:** [plan-variant-archetypes](tasks/2026/06/plan-variant-archetypes.md)
- **Scope:**
  - Non-obvious task → variant set covers quick-fix, architecturally-correct, best-long-term archetypes (judged by intent; labels may vary).
  - Obvious task → exactly one variant (no regression).
  - When two archetypes collapse into one option, the agent states so and still surfaces a distinct third.
  - The `AGENTS.md` `Variant Analysis` bullet contains no plan/archetype-specific tokens; the rule name is retained.
- **Acceptance verified by acceptance tests:** `plan-variants-complex`, `plan-variants-obvious`
- **Status:** [x]

### FR-REFLECT: Reflection with Session History Search and Self-Criticism [ANC:fr:reflect]

- **Description:** Reflection skills (`reflect`, `reflect-by-history`) must search session history for similar errors/mistakes, identify patterns, and include findings in output. Before presenting the final report, the agent must perform self-criticism — validate findings, check for false positives and blind spots, evaluate proportionality of proposed fixes, and revise the report accordingly.
- **Acceptance verified by acceptance tests:** `reflect-session-history-pattern`, `reflect-context-inefficiency`, `reflect-process-loop`, `reflect-self-criticism`, `reflect-by-history-self-criticism`

### FR-CICD: CI/CD Pipeline Security [ANC:fr:cicd]

- **Description:** GitHub Actions workflow (`.github/workflows/ci.yml`) must follow supply chain security and least privilege practices.
- **Tasks:** [extract-cli-to-separate-repo](tasks/2026/05/extract-cli-to-separate-repo.md)
- **Scenario:** Contributor pushes to main or opens PR. CI runs checks with minimal permissions; release steps get elevated permissions only when needed. Third-party actions cannot modify repository files.
- **Acceptance:**
  - [x] **FR-CICD.PIN SHA pinning**: All third-party GitHub Actions pinned to full commit SHA with version comment.
  - [x] **FR-CICD.PRIV Least privilege**: Check job uses `contents: read` only. Write permissions (`contents: write`, `id-token: write`) granted only to release job, gated on `push` to `main`.
  - [x] **FR-CICD.INTEGRITY File integrity**: After third-party setup steps (`checkout`, `setup-deno`) and after `deno task check`, verify no unexpected file modifications via `git diff --exit-code` + untracked file check. Fail pipeline if integrity violated.
  - [x] **FR-CICD.JOBS Job separation**: Pipeline split into `check` (read-only) and `release` (write) jobs. `release` depends on `check` success.
  - [x] **FR-CICD.SPLIT Two-repo topology (post-split)**: After CLI extraction (see FR-DIST.BUNDLE.PIN), CI splits across two repos. Framework repo (`korchasa/flowai`) keeps the `check` job and adds a `release-framework-tarball` step that uploads `framework.tar.gz` + `framework.tar.gz.sha256` as assets of a `framework-v<version>` GitHub release; framework repo no longer publishes to JSR. CLI repo (`korchasa/flowai-cli`) runs its own `check` job (fmt, lint, TS tests; no framework validators, no acceptance tests) on PR/`main` and publishes `@korchasa/flowai` to JSR via OIDC on tag `v*`. OIDC trust binding for `@korchasa/flowai` rebound from `korchasa/flowai` to `korchasa/flowai-cli` exactly once at the Phase 3 cutover.

### FR-WB-CLEANUP: Task File Cleanup on Commit [ANC:fr:wb-cleanup]

- **Description:** `commit` deletes referenced task file after commit when all Definition of Done items are satisfied. If DoD is partially complete, asks user. Prevents stale task files from accumulating.
- **Acceptance verified by acceptance tests:** `commit-task-cleanup`, `commit-task-cleanup-partial`

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
- **Scope:** Lives under `framework/ide-bridge/skills/ai-ide-runner/` (relocated from `framework/engineering/` as part of the `ide-bridge` pack — see FR-IDE-BRIDGE-WORKER, FR-IDE-BRIDGE-DELEGATE). Model-invocable. Triggered by queries like "run in <ide>", "compare <ide> vs <ide>", "try on <model>", "which IDE handles X better".
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
- **Scope:** Lives under `framework/ide-bridge/agents/worker.md`. Invoked via the parent IDE's subagent-dispatch mechanism (Claude Code `Agent`/`Task` tool, OpenCode `@<agent>` mention). Not directly user-invocable; spawned by `delegate-to-ide` (FR-IDE-BRIDGE-DELEGATE).
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
- **Scope:** Lives under `framework/ide-bridge/skills/delegate-to-ide/`. Model-invocable. Triggered by queries like "delegate to <ide>", "have <ide> do <task>", "execute <task> in <ide>", "offload to <ide>". Disambiguation from FR-AI-IDE-RUNNER: that skill is the right fit for one-shot relay / fan-out comparison ("compare X vs Y", "try on <model>"); this skill is for delegating a task whose intermediate work should NOT flood the parent.
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

- **Description:** `commit` and `review-and-commit` derive `status` from `## Definition of Done` checkbox state on every commit that stages a non-superseded `documents/tasks/**/*.md` file with new-shape frontmatter (presence of `date:`). Algorithm: count top-level `- [ ]`/`- [x]` items K of N under `## Definition of Done`; map `K=0 → "to do"`, `0<K<N → "in progress"`, `K=N → "done"`. If the derived value differs from the current frontmatter `status`, rewrite the frontmatter line and `git add` the file as part of the same commit. Idempotent. Never downgrades `done` (manual re-open required). `superseded` is manually set, requires `superseded_by`, and is excluded from DoD derivation because stale original DoD no longer maps to current reality. Warn-only on parse errors / missing DoD section. Legacy flat-path tasks (no `date:`) are skipped — preserves coexistence with unmodified `plan`.
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
