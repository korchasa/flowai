# Documentation Index

Agent-maintained navigation aggregator across all linkable artifacts (FR / SDS / NFR). Sections appear on first write; never pre-scaffolded. Task ↔ FR navigation lives inline in SRS as `**Tasks:**` back-pointers (FR-DOC-TASK-LINK), not here.

## FR

- [FR-ACCEPT.TRIGGER](requirements.md#fr-bench.trigger-skill-description-matching-verification) — Skill description-matching verified by 3 trigger scenarios per skill — [x]
- [FR-AI-IDE-RUNNER](requirements.md#fr-ai-ide-runner-ai-ide-runner-skill-flowai-ai-ide-runner) — Run prompts in another IDE's CLI; verbatim relay; fan-out comparisons — [x]
- [FR-ATOM-DO](requirements.md#fr-atom-do-tdd-implement-atom-flowai-do) — TDD implement atom — flowai-do (RED→GREEN→REFACTOR→CHECK over a written plan) — [x]
- [FR-ATOM-PUSH](requirements.md#fr-atom-push-git-push-atom-flowai-push) — Git push atom — flowai-push (non-force, upstream-safe, no-auto-PR) — [x]
- [FR-CICD](requirements.md#fr-cicd-cicd-pipeline-security) — CI/CD pipeline follows supply-chain security and least-privilege practices — [x]
- [FR-DIAGNOSE-BENCH](requirements.md#fr-diagnose-bench-benchmark-failure-diagnostic-skill-flowai-diagnose-benchmark-failure) — Benchmark failure diagnostic skill — [x]
- [FR-DIST](requirements.md#fr-dist-global-framework-distribution-flowai) — flowai CLI syncs framework skills/agents into project-local IDE config dirs — [x]
- [FR-DIST.BUNDLE](requirements.md#fr-dist.bundle-bundled-source) — Framework files bundled into the CLI at publish time; zero runtime network dependency — [x]
- [FR-DIST.MARKETPLACE](requirements.md#fr-dist.marketplace-claude-code-plugin-marketplace-pilot) — Claude Code distribution: framework packs as native plugins (pilot: core) — [ ]
- [FR-DO-WITH-PLAN](requirements.md#fr-do-with-plan-full-cycle-workflow-flowai-do-with-plan) — Full-cycle workflow command: plan → implement → review-and-commit (composite, user-only) — [x]
- [FR-DOC-IDS](requirements.md#fr-doc-ids-gfm-link-migration-code-comments-and-documentation-map) — GFM link migration: code comments and documentation map — [x]
- [FR-DOC-INDEX](requirements.md#fr-doc-index-agent-maintained-documentation-index) — Agent-maintained documentation index — [x]
- [FR-DOC-LINKS](requirements.md#fr-doc-links-interconnectedness-principle-for-documentation) — Interconnectedness principle for documentation — [x]
- [FR-DOC-LINT](requirements.md#fr-doc-lint-documentation-health-category-in-maintenance) — Documentation Health category in maintenance — [x]
- [FR-DOC-RESCUE](requirements.md#fr-doc-rescue-reflect-surfaces-decisions-for-task-capture) — Reflect surfaces decision passages for task capture — [x]
- [FR-DOC-TASKS](requirements.md#fr-doc-tasks-first-class-committed-tasks) — First-class committed tasks at documents/tasks/<YYYY>/<MM>/<slug>.md — [x]
- [FR-DOC-TASK-CONTEXT](requirements.md#fr-doc-task-context-plan-skill-loads-related-tasks-into-step-2) — Plan skill loads related tasks into Step 2 — [x]
- [FR-DOC-TASK-LIFECYCLE](requirements.md#fr-doc-task-lifecycle-task-status-derived-from-dod-by-commit-skills) — Task status derived from DoD by commit skills — [x]
- [FR-DOC-TASK-LINK](requirements.md#fr-doc-task-link-srs-inline-tasks-back-pointer) — SRS-inline **Tasks:** back-pointer — [x]
- [FR-IDE-BRIDGE-DELEGATE](requirements.md#fr-ide-bridge-delegate-cross-ide-delegation-skill-wrapper-flowai-delegate-to-ide) — Cross-IDE delegation skill wrapper that invokes the worker subagent — [ ]
- [FR-IDE-BRIDGE-WORKER](requirements.md#fr-ide-bridge-worker-cross-ide-delegation-subagent-flowai-ide-bridge-worker) — Cross-IDE delegation subagent; single-shot, verbatim relay — [ ]
- [FR-MEMEX](requirements.md#fr-memex-memex-pack-memex) — Memex pack — [x]
- [FR-REVIEW-COMMIT](requirements.md#fr-review-commit-review-and-commit-workflow-flowai-review-and-commit) — Composite command: review → gate (Approve only) → commit — [x]
- [FR-SHIP](requirements.md#fr-ship-terminal-full-cycle-workflow-flowai-ship) — Terminal full-cycle workflow — flowai-ship (plan → do → review → commit → push, 4 gates) — [x]
- [FR-SKILL-COMPOSE](requirements.md#fr-skill-compose-generated-composite-skill-assembly) — Generated composite skill assembly from parametrized atomic step_by_step sources — [x]
- [FR-UNIVERSAL](requirements.md#fr-universal-universal-skill-script-requirements) — Universal skill & script requirements — [x]
