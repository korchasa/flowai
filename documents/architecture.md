# Architecture

Describe the system architecture.

## Discovered Structure

```
.cursorignore
.DS_Store
Dockerfile
af-engineer-hook.skill
deno.json
README.md
deno.lock
.gitignore
.env
AGENTS.md
project_info.json
catalog/agents/skill-executor.md
catalog/skills/af-qa/SKILL.md
catalog/skills/af-plan/SKILL.md
catalog/skills/af-skill-write-dep/SKILL.md
catalog/skills/af-engineer-hook/SKILL.md
catalog/skills/af-engineer-hook/references/hooks_api.md
catalog/skills/af-engineer-hook/assets/hook_template.sh
catalog/skills/af-reflect/SKILL.md
catalog/skills/af-skill-write-prd/SKILL.md
catalog/skills/af-do/SKILL.md
catalog/skills/af-init/SKILL.md
catalog/skills/af-init/scripts/generate_agents.py
catalog/skills/af-init/scripts/analyze_project.py
catalog/skills/af-init/assets/AGENTS.template.md
catalog/skills/af-maintenance/SKILL.md
catalog/skills/af-skill-engineer-prompts-for-instant/SKILL.md
catalog/skills/af-skill-write-agent-benchmarks/SKILL.md
catalog/skills/af-skill-write-agent-benchmarks/examples/scenario-example.md
catalog/skills/af-skill-write-agent-benchmarks/reference/PROMPTS.md
catalog/skills/af-commit/SKILL.md
catalog/skills/af-skill-manage-github-tickets-by-mcp/SKILL.md
catalog/skills/af-skill-draw-mermaid-diagrams/SKILL.md
catalog/skills/af-skill-draw-mermaid-diagrams/SPEC.md
catalog/skills/af-skill-draw-mermaid-diagrams/scripts/validate.py
catalog/skills/af-answer/SKILL.md
catalog/skills/af-execute/SKILL.md
catalog/skills/af-investigate/SKILL.md
catalog/skills/af-skill-conduct-qa-session/SKILL.md
catalog/skills/af-skill-debug-by-playwright/SKILL.md
catalog/skills/af-skill-write-in-informational-style/SKILL.md
catalog/skills/af-skill-fix-tests/SKILL.md
catalog/skills/af-skill-engineer-prompts-for-reasoning/SKILL.md
catalog/skills/af-engineer-command/SKILL.md
catalog/skills/af-engineer-command/references/workflows.md
catalog/skills/af-engineer-command/references/output-patterns.md
catalog/skills/af-engineer-command/scripts/validate_command.py
catalog/skills/af-engineer-command/scripts/init_command.py
catalog/skills/af-engineer-command/scripts/package_command.py
catalog/skills/af-engineer-command/scripts/__pycache__/validate_command.cpython-314.pyc
catalog/skills/af-skill-write-gods-tasks/SKILL.md
benchmarks/.DS_Store
benchmarks/config.json
benchmarks/af-plan/scenarios/context/mod.ts
benchmarks/af-plan/scenarios/context/fixture/AGENTS.md.orig
benchmarks/af-plan/scenarios/context/fixture/documents/requirements.md
benchmarks/af-plan/scenarios/basic/mod.ts
benchmarks/af-plan/scenarios/basic/fixture/AGENTS.md.orig
benchmarks/af-plan/scenarios/db-feature/mod.ts
benchmarks/af-plan/scenarios/db-feature/fixture/AGENTS.md.orig
benchmarks/af-plan/scenarios/db-feature/fixture/prisma/schema.prisma
benchmarks/af-plan/scenarios/db-feature/fixture/src/user.service.ts
benchmarks/af-plan/scenarios/interactive/mod.ts
benchmarks/af-plan/scenarios/interactive/fixture/AGENTS.md.orig
benchmarks/af-plan/scenarios/interactive/fixture/documents/whiteboard.md
benchmarks/af-plan/scenarios/migration/mod.ts
benchmarks/af-plan/scenarios/migration/fixture/AGENTS.md.orig
benchmarks/af-plan/scenarios/migration/fixture/src/data-loader.js
benchmarks/af-plan/scenarios/variants-obvious/mod.ts
benchmarks/af-plan/scenarios/variants-obvious/fixture/AGENTS.md.orig
benchmarks/af-plan/scenarios/variants-obvious/fixture/documents/whiteboard.md
benchmarks/af-plan/scenarios/refactor/mod.ts
benchmarks/af-plan/scenarios/refactor/fixture/AGENTS.md.orig
benchmarks/af-plan/scenarios/refactor/fixture/src/UserManager.ts
benchmarks/af-plan/scenarios/variants-complex/mod.ts
benchmarks/af-plan/scenarios/variants-complex/fixture/AGENTS.md.orig
benchmarks/af-plan/scenarios/variants-complex/fixture/documents/whiteboard.md
benchmarks/af-plan/runs/af-plan-basic/trace.html
benchmarks/af-plan/runs/af-plan-basic/sandbox/index.js
benchmarks/af-plan/runs/af-plan-basic/sandbox/AGENTS.md
benchmarks/af-plan/runs/af-plan-basic/sandbox/documents/requirements.md
benchmarks/af-plan/runs/af-plan-basic/sandbox/documents/design.md
benchmarks/af-reflect/scenarios/process-loop/mod.ts
benchmarks/af-reflect/scenarios/process-loop/fixture/transcript.txt
benchmarks/af-init/scenarios/vision-integration/mod.ts
benchmarks/af-init/scenarios/greenfield/mod.ts
benchmarks/af-init/scenarios/brownfield/mod.ts
benchmarks/af-init/scenarios/brownfield/fixture/deno.json
benchmarks/af-init/scenarios/brownfield/fixture/README.md
benchmarks/af-init/scenarios/brownfield/fixture/src/main.ts
benchmarks/af-maintenance/scenarios/basic/mod.ts
benchmarks/af-maintenance/scenarios/basic/fixture/src/main.ts
benchmarks/af-commit/scenarios/check-fail/mod.ts
benchmarks/af-commit/scenarios/check-fail/fixture/AGENTS.md.orig
benchmarks/af-commit/scenarios/check-fail/fixture/deno.json
benchmarks/af-commit/scenarios/check-fail/fixture/file.ts
benchmarks/af-commit/scenarios/basic/mod.ts
benchmarks/af-commit/scenarios/basic/fixture/AGENTS.md.orig
benchmarks/af-commit/scenarios/basic/fixture/utils.ts
benchmarks/af-commit/scenarios/basic/fixture/README.md
benchmarks/af-commit/scenarios/atomic-hunk/mod.ts
benchmarks/af-commit/scenarios/atomic-hunk/fixture/AGENTS.md.orig
benchmarks/af-commit/scenarios/atomic-hunk/fixture/code.ts
benchmarks/af-commit/scenarios/sync-docs/mod.ts
benchmarks/af-commit/scenarios/sync-docs/fixture/AGENTS.md.orig
benchmarks/af-commit/scenarios/sync-docs/fixture/src.ts
benchmarks/af-commit/scenarios/sync-docs/fixture/documents/README.md
benchmarks/af-commit/scenarios/atomic-docs/mod.ts
benchmarks/af-commit/scenarios/atomic-docs/fixture/AGENTS.md.orig
benchmarks/af-commit/scenarios/atomic-docs/fixture/main.ts
benchmarks/af-commit/scenarios/atomic-docs/fixture/README.md
benchmarks/af-commit/scenarios/atomic-refactor/mod.ts
benchmarks/af-commit/scenarios/atomic-refactor/fixture/AGENTS.md.orig
benchmarks/af-commit/scenarios/atomic-refactor/fixture/math.ts
benchmarks/af-commit/scenarios/deps/mod.ts
benchmarks/af-commit/scenarios/deps/fixture/AGENTS.md.orig
benchmarks/af-commit/scenarios/deps/fixture/mod.ts
benchmarks/af-commit/scenarios/deps/fixture/deno.json
benchmarks/af-commit/scenarios/check/mod.ts
benchmarks/af-commit/scenarios/check/fixture/AGENTS.md.orig
benchmarks/af-commit/scenarios/check/fixture/deno.json
benchmarks/af-commit/scenarios/check/fixture/file.ts
benchmarks/af-commit/runs/af-commit-basic/trace.html
benchmarks/af-commit/runs/af-commit-basic/sandbox/utils.ts
benchmarks/af-commit/runs/af-commit-basic/sandbox/README.md
benchmarks/af-commit/runs/af-commit-basic/sandbox/AGENTS.md
benchmarks/af-answer/scenarios/basic/mod.ts
benchmarks/af-answer/scenarios/basic/fixture/documents/requirements.md
benchmarks/af-answer/scenarios/basic/fixture/documents/design.md
benchmarks/af-answer/scenarios/basic/fixture/src/auth.service.ts
benchmarks/af-investigate/scenarios/basic/mod.ts
benchmarks/af-investigate/scenarios/basic/fixture/src/math.ts
scripts/task-check.test.ts
scripts/.DS_Store
scripts/test-assert.ts
scripts/task-test.ts
scripts/task-test.test.ts
scripts/utils.ts
scripts/task-check.ts
scripts/check-skills.ts
scripts/task-dev.test.ts
scripts/task-bench.ts
scripts/task-dev.ts
scripts/benchmarks/lib/usage.ts
scripts/benchmarks/lib/trace.test.ts
scripts/benchmarks/lib/types.test.ts
scripts/benchmarks/lib/spawned_agent.test.ts
scripts/benchmarks/lib/judge.ts
scripts/benchmarks/lib/spawned_agent.ts
scripts/benchmarks/lib/utils.ts
scripts/benchmarks/lib/user_emulator.ts
scripts/benchmarks/lib/types.ts
scripts/benchmarks/lib/llm.ts
scripts/benchmarks/lib/llm.test.ts
scripts/benchmarks/lib/runner.test.ts
scripts/benchmarks/lib/AGENTS.md
scripts/benchmarks/lib/config.test.ts
scripts/benchmarks/lib/integration.test.ts
scripts/benchmarks/lib/runner.ts
scripts/benchmarks/lib/trace.ts
documents/requirements.md
documents/benchmarking.md
documents/whiteboard.md
documents/vision.md
documents/.gitignore
documents/design.md
documents/rnd/rnd-control-primitives-comparison.md
documents/rnd/rnd-speckit-ideas.md
documents/rnd/skeleton.md
.vscode/settings.json
tmp/skills_af-init_assets_AGENTS.template.md.diff
tmp/skills_af-create-vision-doc_SKILL.md.missing_in_catalog
tmp/skills_af-init_SKILL.md.diff
tmp/skills_af-execute_SKILL.md.diff
tmp/skills_af-init_scripts_generate_agents.py.diff
tmp/skills_af-skill-write-agent-benchmarks_examples_scenario-example.md.diff
tmp/agents_skill-executor.md.diff
tmp/agents_planner.md.missing_in_catalog
tmp/skills_af-skill-write-agent-benchmarks_SKILL.md.diff
tmp/skills_af-skill-write-agent-benchmarks_reference_PROMPTS.md.diff
tmp/skills_af-engineer-command_scripts___pycache___validate_command.cpython-314.pyc.not_found
tmp/integ-86e8496b/AGENTS.md
tmp/integ-797a191e/AGENTS.md
tmp/integ-d19fdc9d/test-skill.md
tmp/integ-d19fdc9d/integration-test-basic/trace.html
tmp/integ-d19fdc9d/integration-test-basic/sandbox/AGENTS.md
tmp/integ-d19fdc9d/integration-test-basic/sandbox/hello.txt
tmp/integration-traces/integration-test-interactive/trace.html
tmp/integration-traces/integration-test-interactive/sandbox/AGENTS.md
tmp/integration-traces/integration-test-basic/trace.html
tmp/integration-traces/integration-test-basic/sandbox/AGENTS.md
tmp/coverage/66159665-8808-4acc-9d2c-14f41d817302.json
tmp/coverage/aaab15db-0beb-4aec-87a9-40aea291360e.json
tmp/coverage/471d6bd8-cdc8-4062-9682-87ca36a12c5d.json
tmp/coverage/dd58894f-8411-44aa-b612-d1a15a5a2b3a.json
tmp/coverage/ab16042c-8de1-4b0f-9a12-fa94ef9a87e6.json
tmp/coverage/8cc1f77a-1869-4448-b1a8-de564e324e52.json
tmp/coverage/21161e39-ebc0-4c7c-b092-b3cf5de5918e.json
tmp/coverage/0dffa159-37d8-420b-8ff2-2f5d59beea67.json
tmp/coverage/a8432498-efa1-4b63-8874-d3e85d223aa6.json
```

## README Summary

# AssistFlow

A collection of Cursor skills and agents, designed to standardize work across
various software development contexts.

!!!WARNING!!! DO NOT USE THIS FILES AS IS. YOU MUST MODIFY THEM TO FIT YOUR
PROJECT AND YOUR STYLE OF WORK.

## Developer Workflow

This section provides clear instructions on when and what tools to use during
the development lifecycle.

### 1. Start of Project

**Goal**: Ensure the environment is ready and the project base is solid.

- **Initialize Project**: Use `af-init` skill to set up the project structure
  and initial documentation if starting fresh.

### 2. For Each Task

**Goal**: Implement features or fixes with high quality and documentation
coverage.

1. **Plan**: Use `af-plan` skill to analyze the request, break it down into
   steps, and create a plan.
2. **Execute**: Use `af-do` (or `af-execute`) skill to write code. This
   ensures adherence to TDD and documentation updates.
3. **Verify**:
   - Run `deno task test` to check specific tests.

...