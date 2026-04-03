---
variant: "Variant A: Parallel to existing CLI tools"
tasks:
  - desc: "Add flowai CLI section to SKILL.md (Step 4 multi-select + AI CLI Setup Reference table)"
    files: ["framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/SKILL.md"]
  - desc: "Add flowai install pattern to references/dockerfile-patterns.md"
    files: ["framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/references/dockerfile-patterns.md"]
  - desc: "Add flowai postCreateCommand and config patterns to references/devcontainer-template.md"
    files: ["framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/references/devcontainer-template.md"]
  - desc: "Create benchmark scenario for flowai CLI integration"
    files: ["framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/benchmarks/deno-with-flowai/mod.ts"]
---

## Exploration Findings

I explored three areas of the codebase:

**Prior art (existing CLI tool patterns):**
- Claude Code, OpenCode, and Cursor CLI already follow a consistent pattern in `SKILL.md` (lines 238-279): each has a table with Install, Config dir, Config volume, Global skills mount, Skills sync, Env vars, Extension.
- `devcontainer-template.md` (lines 56-68) shows `postCreateCommand` object form with per-CLI entries: `<tool>-chown` + `<tool>-cli`.
- `dockerfile-patterns.md` (lines 48-66) has per-tool Dockerfile snippets under "AI CLI Installation".

**Architecture layers:**
- The skill workflow has 8 steps. Step 4 "Determine Capabilities" (SKILL.md line 68) presents the multi-select for AI CLI tools. Step 5 "Generate Configuration" uses the template logic from references.
- flowai is published as `@korchasa/flowai` at JSR (`deno.json` line 2), installed via `deno install -g -A -f jsr:@korchasa/flowai`.
- flowai has no config volume or global skills mount needs -- it reads `.flowai.yaml` from the project workspace (already mounted).

**Integration points:**
- The Deno feature (`ghcr.io/devcontainers-extra/features/deno:latest`) is already in the features table (SKILL.md line 180). For non-Deno stacks choosing flowai, Deno must be added as a feature.
- No VS Code extension exists for flowai (it is CLI-only, like OpenCode).
- Benchmark pattern: `BenchmarkSkillScenario` class with `checklist` array (see `deno-with-claude/mod.ts`).

## Variant A: Parallel to existing CLI tools

**Description:** Add flowai as another entry in every location where Claude Code / OpenCode / Cursor CLI are listed, following the identical pattern. flowai gets its own row in the Step 4 multi-select, its own section in the AI CLI Setup Reference table, its own Dockerfile pattern, and its own `postCreateCommand` entries. When selected on a non-Deno stack, the Deno devcontainer feature is automatically added.

**Affected files:**
- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/SKILL.md` -- Step 4 multi-select list, AI CLI Setup Reference section, AI CLI Extensions table
- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/references/devcontainer-template.md` -- postCreateCommand example, no mounts needed
- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/references/dockerfile-patterns.md` -- flowai Dockerfile snippet
- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/benchmarks/deno-with-flowai/mod.ts` -- new benchmark

**Effort:** S

**Risks:**
- Deno feature auto-injection for non-Deno stacks may confuse users who do not expect Deno in their container.
- flowai has no config volume or auth token persistence needs, which breaks the symmetry with other tools -- implementers may cargo-cult unnecessary mount logic.

## Variant B: Conditional Deno prerequisite with user confirmation

**Description:** Same as Variant A in terms of where flowai appears, but adds an explicit user confirmation step when flowai is selected on a non-Deno stack: "flowai requires Deno runtime. Add Deno feature to your devcontainer?" This prevents silent injection of unexpected runtimes. The Step 4 logic gains a conditional sub-question.

**Affected files:**
- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/SKILL.md` -- Step 4 with conditional Deno sub-question, AI CLI Setup Reference section
- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/references/devcontainer-template.md` -- postCreateCommand, conditional Deno feature
- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/references/dockerfile-patterns.md` -- flowai Dockerfile snippet
- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/benchmarks/deno-with-flowai/mod.ts` -- new benchmark (Deno stack, flowai already has Deno)
- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/benchmarks/python-with-flowai/mod.ts` -- new benchmark (non-Deno stack, tests Deno feature injection)

**Effort:** M

**Risks:**
- Extra user prompt adds friction. Users selecting flowai likely understand it needs Deno.
- Two benchmarks instead of one increases maintenance surface.

## Variant C: flowai as a postStartCommand hook (not a CLI tool option)

**Description:** Instead of listing flowai alongside Claude Code / OpenCode in the AI CLI multi-select, treat flowai as an infrastructure concern: add a `postStartCommand` entry that runs `flowai sync` on every container start to keep skills up to date. This makes flowai an automatic capability rather than a user-chosen tool.

**Affected files:**
- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/SKILL.md` -- new subsection under Global Skills Mount Rules
- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/references/devcontainer-template.md` -- postStartCommand with flowai sync
- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/references/dockerfile-patterns.md` -- flowai Dockerfile snippet
- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/benchmarks/deno-with-flowai/mod.ts` -- new benchmark

**Effort:** M

**Risks:**
- Conflates flowai (a CLI tool the user may want to run interactively) with an automatic background process.
- The spec explicitly says "offer flowai as an optional tool alongside Claude Code, OpenCode" -- this variant contradicts the spec.
- `flowai sync` on every start adds latency to container startup.

## Critique

**Variant A (Parallel to existing CLI tools):**
- Alignment: Fully matches the spec. flowai becomes an option in the Step 4 multi-select exactly as requested. Deno auto-injection for non-Deno stacks is implied by the spec ("ensuring Deno is available").
- Risk severity: Low. The Deno auto-injection risk is mitigatable by a note in the generated output (Step 8 post-setup notes). Cargo-cult mount risk is low because the reference table explicitly shows "No config volume needed" for flowai.
- Complexity: Small effort, proportional to the change. Not over-engineered.
- Maintainability: Follows existing patterns exactly. Future tool additions follow the same template.
- Testability: One benchmark is sufficient since flowai on a Deno stack covers the core path (Deno already present, no feature injection needed). The non-Deno path is a feature auto-add -- already covered by existing Deno feature logic.

**Variant B (Conditional Deno prerequisite):**
- Alignment: Addresses the spec but adds an unspecified confirmation step. The spec says "flowai becomes another option in that list" -- no mention of conditional sub-questions.
- Risk severity: Low risk, but the extra prompt is unnecessary friction. Users choosing flowai are likely aware it needs Deno.
- Complexity: Medium effort for marginal UX benefit. Two benchmarks for a single tool is disproportionate compared to Claude Code (1 benchmark) and OpenCode (1 benchmark).
- Maintainability: The conditional sub-question adds branching logic to Step 4, making the skill harder to follow.
- Testability: Better coverage but at higher cost. The non-Deno case is a trivial "add Deno feature" operation already proven by existing Deno feature handling.

**Variant C (postStartCommand hook):**
- Alignment: Directly contradicts the spec. The spec says "offer flowai as an optional tool alongside Claude Code, OpenCode." This variant hides flowai as infrastructure.
- Risk severity: High. Users cannot opt out of flowai sync. Startup latency impacts every container start.
- Complexity: Medium effort for the wrong outcome.
- Maintainability: Mixes concerns -- global skills sync is a separate mechanism from tool installation.
- Testability: Harder to validate because the behavior is implicit (runs automatically) rather than explicit (user-selected).

## Decision

I select **Variant A: Parallel to existing CLI tools.**

Justification:
1. It fully aligns with the spec without adding unspecified behavior.
2. It has the smallest effort (S) with the lowest risk.
3. It follows the exact same pattern as Claude Code and OpenCode, making the change predictable and easy to review.
4. The main risk (Deno auto-injection) is mitigated by adding a post-setup note in Step 8 and by the fact that the Deno feature is lightweight.

Mitigations for selected variant's risks:
- Add a clear note in the flowai reference table: "No config volume or auth token persistence needed. `.flowai.yaml` is read from the project workspace."
- For non-Deno stacks, the Deno feature is added silently (same as how Node feature is added for non-Node stacks needing npm). Add a post-setup note mentioning Deno was added for flowai.

## Tasks

1. **Add flowai CLI section to SKILL.md**
   - Add "flowai" as a 5th option in Step 4.1 AI CLI tools multi-select (after Cursor CLI, before "Both/multiple")
   - Add flowai row to the "AI CLI Setup Reference" section with: Install (`deno install -g -A -f jsr:@korchasa/flowai`), Config dir (none -- uses project `.flowai.yaml`), no config volume, no global skills mount, Env vars (none), Extension (none -- CLI only)
   - Add note about Deno prerequisite: "Requires Deno runtime. For non-Deno stacks, the Deno devcontainer feature is added automatically."
   - Add post-setup note in Step 8 for flowai
   - Files: `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/SKILL.md`

2. **Add flowai install pattern to dockerfile-patterns.md**
   - Add a "flowai" subsection under "AI CLI Installation" following Claude Code / OpenCode pattern
   - Pattern: `RUN deno install -g -A -f jsr:@korchasa/flowai` (assumes Deno already installed in earlier layer)
   - Files: `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/references/dockerfile-patterns.md`

3. **Add flowai postCreateCommand to devcontainer-template.md**
   - Add `"flowai-cli": "deno install -g -A -f jsr:@korchasa/flowai"` to the postCreateCommand example
   - Add note that no mounts or volumes are needed for flowai
   - For non-Deno stacks, show how the Deno feature must be added to the features block
   - Files: `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/references/devcontainer-template.md`

4. **Create benchmark scenario for flowai CLI integration**
   - New benchmark: `deno-with-flowai/mod.ts`
   - Scenario: Deno project requesting flowai CLI setup (Deno already present in stack)
   - Checklist items: devcontainer.json created, Deno support present, flowai install in postCreateCommand, no unnecessary config volumes for flowai, no hardcoded secrets
   - Follow the `BenchmarkSkillScenario` pattern from existing benchmarks
   - Files: `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/benchmarks/deno-with-flowai/mod.ts`

## Summary

I selected Variant A (Parallel to existing CLI tools) because it directly follows the established pattern for Claude Code and OpenCode with minimal risk and small effort. The change touches 4 files: the main SKILL.md for Step 4 and reference table additions, two reference files for template/Dockerfile patterns, and one new benchmark. Branch `sdlc/devcontainer-flowai-cli` is created from latest main.
