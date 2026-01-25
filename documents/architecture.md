# Architecture

Describe the system architecture.

## Discovered Structure

```
.cursorignore
interview_data.json
.DS_Store
deno.json
README.md
deno.lock
.gitignore
.env
AGENTS.md
skeleton.md
project_info.json
scripts/task-check.test.ts
scripts/test-assert.ts
scripts/task-test.ts
scripts/task-test.test.ts
scripts/utils.ts
scripts/task-check.ts
scripts/task-dev.test.ts
scripts/task-bench.ts
scripts/task-dev.ts
scripts/benchmarks/work/af-commit-atomic-docs/trace.md
scripts/benchmarks/work/af-commit-atomic-docs/sandbox/main.ts
scripts/benchmarks/work/af-commit-atomic-docs/sandbox/README.md
scripts/benchmarks/work/af-commit-basic/trace.md
scripts/benchmarks/work/af-commit-basic/sandbox/utils.ts
scripts/benchmarks/work/af-commit-basic/sandbox/README.md
scripts/benchmarks/work/af-commit-check-fail/trace.md
scripts/benchmarks/work/af-commit-check-fail/sandbox/deno.json
scripts/benchmarks/work/af-commit-check-fail/sandbox/file.ts
scripts/benchmarks/work/af-commit-atomic-refactor/trace.md
scripts/benchmarks/work/af-commit-atomic-refactor/sandbox/math.ts
scripts/benchmarks/work/af-commit-atomic-refactor/sandbox/utils.ts
scripts/benchmarks/work/af-commit-sync-docs/trace.md
scripts/benchmarks/work/af-commit-sync-docs/sandbox/src.ts
scripts/benchmarks/work/af-commit-sync-docs/sandbox/documents/README.md
scripts/benchmarks/work/interviewer-clarify-feature/trace.md
scripts/benchmarks/work/interviewer-clarify-feature/sandbox/README.md
scripts/benchmarks/work/af-commit-deps/trace.md
scripts/benchmarks/work/af-commit-deps/sandbox/mod.ts
scripts/benchmarks/work/af-commit-deps/sandbox/deno.json
scripts/benchmarks/work/interviewer-bug-report/trace.md
scripts/benchmarks/work/interviewer-bug-report/sandbox/error.log
scripts/benchmarks/work/af-commit-check/trace.md
scripts/benchmarks/work/af-commit-check/sandbox/deno.json
scripts/benchmarks/work/af-commit-check/sandbox/file.ts
scripts/benchmarks/work/interviewer-arch-choice/trace.md
scripts/benchmarks/work/interviewer-arch-choice/sandbox/deno.json
scripts/benchmarks/work/af-commit-atomic-hunk/trace.md
scripts/benchmarks/work/af-commit-atomic-hunk/sandbox/code.ts
scripts/benchmarks/scenarios/interviewer.bench.ts
scripts/benchmarks/scenarios/af-commit.bench.ts
scripts/benchmarks/lib/judge.ts
scripts/benchmarks/lib/types.ts
scripts/benchmarks/lib/llm.ts
scripts/benchmarks/lib/trace.ts
documents/file_structure.md
documents/requirements.md
documents/benchmarking.md
documents/whiteboard.md
documents/vision.md
documents/design.md
documents/rnd/rnd-control-primitives-comparison.md
documents/rnd/rnd-speckit-ideas.md
.vscode/settings.json
tmp/convert-rules-to-skills.ts
tmp/spec-kit/spec-driven.md
tmp/spec-kit/CODE_OF_CONDUCT.md
tmp/spec-kit/LICENSE
tmp/spec-kit/CHANGELOG.md
tmp/spec-kit/.markdownlint-cli2.jsonc
tmp/spec-kit/pyproject.toml
tmp/spec-kit/README.md
tmp/spec-kit/SUPPORT.md
tmp/spec-kit/.gitignore
tmp/spec-kit/CONTRIBUTING.md
tmp/spec-kit/.gitattributes
tmp/spec-kit/AGENTS.md
tmp/spec-kit/SECURITY.md
tmp/spec-kit/memory/constitution.md
tmp/spec-kit/docs/docfx.json
tmp/spec-kit/docs/local-development.md
tmp/spec-kit/docs/quickstart.md
tmp/spec-kit/docs/toc.yml
tmp/spec-kit/docs/README.md
tmp/spec-kit/docs/.gitignore
tmp/spec-kit/docs/index.md
tmp/spec-kit/docs/upgrade.md
tmp/spec-kit/docs/installation.md
tmp/spec-kit/.devcontainer/post-create.sh
tmp/spec-kit/.devcontainer/devcontainer.json
tmp/spec-kit/scripts/bash/common.sh
tmp/spec-kit/scripts/bash/setup-plan.sh
tmp/spec-kit/scripts/bash/check-prerequisites.sh
tmp/spec-kit/scripts/bash/update-agent-context.sh
tmp/spec-kit/scripts/bash/create-new-feature.sh
tmp/spec-kit/scripts/powershell/check-prerequisites.ps1
tmp/spec-kit/scripts/powershell/common.ps1
tmp/spec-kit/scripts/powershell/update-agent-context.ps1
tmp/spec-kit/scripts/powershell/setup-plan.ps1
tmp/spec-kit/scripts/powershell/create-new-feature.ps1
tmp/spec-kit/templates/agent-file-template.md
tmp/spec-kit/templates/vscode-settings.json
tmp/spec-kit/templates/checklist-template.md
tmp/spec-kit/templates/tasks-template.md
tmp/spec-kit/templates/spec-template.md
tmp/spec-kit/templates/plan-template.md
tmp/spec-kit/templates/commands/constitution.md
tmp/spec-kit/templates/commands/implement.md
tmp/spec-kit/templates/commands/analyze.md
tmp/spec-kit/templates/commands/tasks.md
tmp/spec-kit/templates/commands/clarify.md
tmp/spec-kit/templates/commands/checklist.md
tmp/spec-kit/templates/commands/taskstoissues.md
tmp/spec-kit/templates/commands/plan.md
tmp/spec-kit/templates/commands/specify.md
tmp/spec-kit/media/logo_large.webp
tmp/spec-kit/media/bootstrap-claude-code.gif
tmp/spec-kit/media/specify_cli.gif
tmp/spec-kit/media/logo_small.webp
tmp/spec-kit/media/spec-kit-video-header.jpg
tmp/spec-kit/src/specify_cli/__init__.py
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
- **Define Vision**: Use `af-create-vision-doc` skill to create or update the
  project vision in `documents/vision.md`.

### 2. For Each Task

**Goal**: Implement features or fixes with high quality and documentation
coverage.

1. **Plan**: Use `af-plan` skill to analyze the request, break it down into
   steps, and create a plan.
2. **Execute**: Use `af-do` (or `af-execute`) skill to wri
   ...
