## Summary

All 4 tasks from the design implemented. Project checks pass (fmt, lint, test, skill compliance, agent check, sync check, pack refs, naming prefix).

### Files changed

- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/SKILL.md`
  - Added flowai to Step 4.1 AI CLI tools multi-select (line 72)
  - Added flowai subsection to AI CLI Setup Reference (lines 279-289)
  - Added post-setup note for flowai in Step 8 (lines 173-175)
- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/references/dockerfile-patterns.md`
  - Added flowai Dockerfile pattern under AI CLI Installation (lines 69-73)
- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/references/devcontainer-template.md`
  - Added flowai-cli entry in postCreateCommand example (line 234)
  - Added note about flowai needing no mounts/volumes (line 249)

### Tests added

- `framework/core/skills/flowai-skill-setup-ai-ide-devcontainer/benchmarks/deno-with-flowai/mod.ts` (new)
  - Benchmark scenario for Deno project with flowai CLI
  - 5 checklist items: valid JSON, Deno support, flowai install command, no config volumes, no hardcoded secrets

### Check result

PASS (all 12 parallel check tasks green)
