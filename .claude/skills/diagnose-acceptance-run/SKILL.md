---
name: diagnose-acceptance-run
description: Where this repo keeps the artifacts of a failed acceptance run, what they are called, and the commands that read them. Use with the `diagnose-benchmark-failure` skill when a flowai acceptance scenario fails.
---

# Diagnose an Acceptance Run — flowai layout

The method — evidence before hypothesis, the transcript over the judge's
rendering, the interview before a wording fix — lives in the shipped skill
`diagnose-benchmark-failure`. Load that skill for the procedure. This file
carries only what is true of THIS repository: the paths, the file names, the
field names and the commands.

Scope note: this is the acceptance-test runner, not the SWE-rebench A/B. The
two are different systems and the bare word "benchmark" in this repo means the
A/B.

## The four artefacts, in this repo

Run directory: `acceptance-tests/runs/latest/<scenario-id>/run-1/`. `latest` is
a symlink the runner maintains; if it is missing, list `acceptance-tests/runs/`
and take the most recent timestamped directory holding `<scenario-id>`. A
retried scenario has `run-2`, `run-3`; diagnose each failed run, not just the
first.

- **Judge's rendering** — `<run-dir>/judge-evidence.md`. Three sections:
  `<user_query>`, `<agent_logs>`, `<file_diffs>`. Tool calls appear as
  `## Tool: <name>` lines. Treat that list as provisional — the rendering can
  omit calls.
- **Raw transcript** — under `<run-dir>/bench-home/`, in the layout of the IDE
  the run used:
  - codex: `bench-home/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-<ts>-<uuid>.jsonl`
  - claude: `bench-home/.claude/projects/<slug>/<uuid>.jsonl`

  Every rollout under a bench-home is the AGENT's. Since 2026-09-15 the judge
  writes none at all: it runs on a codex app-server with `ephemeral: true`, and
  its `CODEX_HOME` is one temp directory per run, outside every bench-home.
  Find the transcript with `find <run-dir>/bench-home -name '*.jsonl'`.
- **The primitive as the agent saw it** — `<run-dir>/sandbox/.codex/skills/<primitive>/SKILL.md`
  (a claude run uses `.claude/skills/`, Cursor `.cursor/skills/`, OpenCode
  `.opencode/skills/`). Compare it against the live source at
  `framework/<pack>/{skills,commands}/<primitive>/SKILL.md`. Do NOT read
  `.claude/skills/<primitive>/SKILL.md` at the repo root and call that the
  sandbox copy — it is the installed current source and says nothing about
  what the failing agent read.
- **Scenario definition** — `framework/<pack>/{skills,commands,agents}/<primitive>/acceptance-tests/<scenario>/mod.ts`,
  found with `find framework -path "*/acceptance-tests/<scenario>/mod.ts"`.
  Fields that matter: `userQuery`, `userPersona`, `checklist[]` (`id`,
  `description`, `critical`), `interactive`, `setup()`, `agentsTemplateVars`.

## Commands

Tool-call histogram, to be printed before any hypothesis:

```sh
# codex rollout
jq -r 'select(.type=="response_item") | .payload | select(.type=="function_call" or .type=="custom_tool_call") | .name' <file> | sort | uniq -c | sort -rn
# claude transcript
jq -r 'select(.message.content|type=="array") | .message.content[] | select(.type=="tool_use") | .name' <file> | sort | uniq -c | sort -rn
```

In a codex rollout the arguments sit in `.payload.arguments` / `.payload.input`;
the agent's own text is a `response_item` of type `message` with role
`assistant`, its reasoning a line of type `reasoning`. In a claude transcript
both are `assistant` lines whose content blocks are `text` / `thinking`.

Resume the failed session to interview it. The sandbox outlives the run:

```sh
# codex
cd "$(readlink <run-dir>/sandbox)" && CODEX_HOME="$(readlink <run-dir>/bench-home)/.codex" codex exec resume <uuid> "<question>"
# claude
cd "$(readlink <run-dir>/sandbox)" && HOME="$(readlink <run-dir>/bench-home)" claude -p --resume <uuid> "<question>"
```

`readlink` is for the runner's symlinked run dirs; on a plain directory use the
path itself. On codex, open the question with "Do not invoke any skill; answer
from memory" — a bare question about a reflect-shaped situation routes the
resume into the `reflect` skill and returns a skill run instead of an answer.

The judge's verdict — which checklist items failed and why — is in the runner's
stdout, not in `judge-evidence.md`. To regenerate it:
`deno task acceptance-tests -f <scenario-id> --no-cache`.

## Taxonomy codes that point at our runner

The shipped skill carries the full taxonomy. These three resolve to files and
messages that exist only here:

- **STALE-SKILL-IN-SANDBOX** — a cache hit on a scenario whose primitive was
  edited after the cached run. Re-run with `--no-cache`; if it persists, check
  the cache-key inputs in `scripts/acceptance-tests/lib/cache.ts` against what
  changed.
- **SKILL-NOT-MOUNTED** — `Agent finished with exit code 0` with `0 agent
  steps`, or the judge reporting an unknown skill. Check the `Copying packs:`
  line in the runner's stdout and confirm `scenario.skill` names an existing
  primitive. Fix the runner or the scenario, never the SKILL.md.
- **CROSS-PACK-REFERENCE-MISSING** — the primitive's text names another
  primitive that the scenario's packs do not include. Usually drop the
  reference rather than widen the packs.

**COMPOSITE-DELEGATION-BYPASS** has its rules in `framework/AGENTS.md`, section
"Composite Skill Authoring": the wrapper's description must not name its source
atoms, and the body must carry the no-delegation rule.

## Simulated-user marker

A simulated user's reply appears in the trace as `[USER INPUT] <reply>`. A
reply that does not fit the question the agent asked is PERSONA-MISMATCH, not
an agent defect.
