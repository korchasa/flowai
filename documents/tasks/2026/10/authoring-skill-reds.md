---
date: 2026-10-18
status: done
---
# Three red scenarios of the plugin and command authoring skills

## Goal

The claude-arm sweep of 2026-10-18 must not carry reds that come from stale or contradictory guidance in the authoring skills. Each red either gets its defect fixed in the layer it lives in, or stops on a product decision the user owns.

## Overview

### Context

Sweep `acceptance-tests/runs/2026-10-18T14-45-21/` (agent and judge `claude-sonnet-5-5`, one run per scenario) left three reds in the authoring skills:

- `engineer-ai-ide-plugin-codex-subagents-as-skills`, item `codex_apps_manifest`. The agent recommended the Codex root `plugin.json` with `extensions.com.openai.apps` pointing at "the app file", and drew `<app file>` in the layout instead of `.app.json`.
- `engineer-plugin-marketplace-basic`, item `related_skills_links`. The agent found `engineer-skill` and the other devtools skills missing from the sandbox and left them out of the related-skills list.
- `engineer-command-create`, item `skill_md_created`. The agent wrote a flat `.claude/commands/docker-compose.md` (and later a `.cursor/commands/` copy) instead of a SKILL.md package.

### Current State

- **Codex manifest.** The Codex build guide (https://developers.openai.com/codex/plugins/build) now describes two formats. Six sessions of the sweep fetched it independently; three of them quote the same facts: a portable root `plugin.json` with Codex settings under `extensions.com.openai`, `"apps": "./.app.json"` inside that object, a root `mcp.json` (no dot), and `.codex-plugin/plugin.json` kept as "a compatibility fallback". `engineer-ai-ide-plugin/SKILL.md` step 6 names `.app.json` and `apps` only for `.codex-plugin/plugin.json`, and the Host Anchors say "plugins use `.codex-plugin/plugin.json`". The failed agent, resumed and interviewed, said it read the skill's file and field names as belonging to the legacy format only, so it left the app file unnamed in the portable one; the skill would have had to say that `.app.json` and `apps` hold in both formats. The checklist item `codex_mcp_manifest` (non-critical) names only the legacy `.mcp.json` + `mcpServers` wiring.
- **Cross-pack links.** `engineer-plugin-marketplace/references/related-skills.md` links the devtools skills as `../../../../devtools/skills/<name>/SKILL.md`. That path resolves nowhere: in the sandbox the skills are flattened into `.claude/skills/<name>/`, and in the rendered marketplace the pack is `plugins/flowai-devtools/`, not `plugins/devtools/`. The scenario mounts `core` + `engineering` only. The interviewed agent said "Prefer these existing skills" read as "installed here", and the file would have had to say to list those skills by name even when their pack is not installed.
- **Commands.** `engineer-command/SKILL.md` contradicts itself: its IDE table places commands as flat `.md` files under `.{ide}/commands/`, while its "Anatomy of a Command", `init_command.ts`, `validate_command.ts` and `package_command.ts` all build a SKILL.md directory. The agent therefore asked the user which form to use, and the persona's pick decided the verdict. The project vocabulary (AGENTS.md §Terminology) defines a command as the flat file, and `engineer-skill` says "Not for user-invoked slash commands". Which artefact this skill produces was a product decision; on 2026-10-18 the user chose "a command is ONE Markdown file in the IDE's commands directory" (over keeping SKILL.md, accepting both forms, or deleting the skill).

### Results

Pass rates, claude arm, agent and judge `claude-sonnet-5-5`:

- `engineer-ai-ide-plugin-codex-subagents-as-skills`: sweep 0/1; HEAD resample 3/3 (`2026-10-18T17-28-58`) with one warning (`codex_mcp_manifest` failed because the agent used the documented root `mcp.json`); after the fix 3/3, no warnings (run `2026-10-18T17-45-25`).
- `engineer-plugin-marketplace-basic`: sweep 0/1; HEAD resample 1/3 (`2026-10-18T17-33-37`); after the fix 3/3 with `engineer-skill` linked in every run (run `2026-10-18T17-57-24`, each sandbox verified to hold the new file). A first post-fix batch (`2026-10-18T17-50-38`) is void: its run-3 sandbox held the HEAD version of `related-skills.md`, restored by a parallel session for a few minutes.
- `engineer-command-create` (checklist rewritten for the chosen form): HEAD resample 2/3 on the old checklist (`2026-10-18T17-40-27`), and 3 of the 6 runs on the old skill (sweep, resample, RED) built `.claude/skills/docker-compose/SKILL.md`; RED on the new checklist 1/2 (`2026-10-18T17-49-34`, run 2 failed `command_file_created`); GREEN 2/3 (`2026-10-18T17-54-06`), with `command_file_created` and `format_matches_ide` passing 3/3. The failed run broke `qa_format_compliant` by writing questions as `**1. …**` bold lines; interviewed, the agent said the rule was clear and it carried the bold style over from the option labels. That block is shared by six skills and is outside this task. The three trigger scenarios pass after the description change (`2026-10-18T17-57-20`).

### Constraints

- No test-fitting: the checklist may only be widened where the current official format makes the old wording wrong.
- Do not touch `framework/core/assets/AGENTS.template.md` or `scripts/acceptance-tests/lib/` — they key every scenario's cache.
- Mounting `devtools` into the marketplace scenario would hide the not-installed case that real installs of the engineering plugin alone hit.

## Definition of Done

- [x] Codex wiring in `engineer-ai-ide-plugin` names `.app.json` + `apps` for both manifest formats, and the root `mcp.json` for the portable one.
  - Test: `Benchmark: engineer-ai-ide-plugin-codex-subagents-as-skills`
  - Evidence: `grep -cF 'extensions.com.openai' framework/engineering/skills/engineer-ai-ide-plugin/SKILL.md` prints 2 or more, and `deno task acceptance-tests -f engineer-ai-ide-plugin-codex-subagents-as-skills -n 3 --lock reds-authoring.lock` passes 3/3.
- [x] `related-skills.md` carries no relative link into another pack and tells the agent to list cross-pack skills by name with their pack.
  - Test: `Benchmark: engineer-plugin-marketplace-basic`
  - Evidence: `! grep -nF '../../../../devtools' framework/engineering/skills/engineer-plugin-marketplace/references/related-skills.md` and `deno task acceptance-tests -f engineer-plugin-marketplace-basic -n 3 --lock reds-authoring.lock` passes 3/3.
- [x] `engineer-command` writes one Markdown file per IDE in `.<ide>/commands/`; the SKILL.md scaffolding scripts are gone and the validator checks a single command file.
  - Test: `framework/devtools/skills/engineer-command/scripts/validate_command_test.ts` (20 tests), `Benchmark: engineer-command-create`
  - Evidence: `deno test -A framework/devtools/skills/engineer-command/scripts/` passes; `deno task acceptance-tests -f engineer-command-create -n 3 --lock reds-authoring.lock` passes the runner's 2/3 threshold with `command_file_created` 3/3.
- [x] Every `deno task check` step that covers these files passes.
  - Evidence: `deno task check > check.log 2>&1; grep '^=== FAIL' check.log | grep -v 'deno eval'` lists only `check-traceability.ts`, which fails on another session's task file (`plan-claude-arm-reds.md` implements an FR not yet in the SRS).

## Solution

1. Resample all three scenarios on HEAD with `-n 3` to get the baseline pass rate.
2. Codex: rewrite step 6's Codex bullet and the Codex host anchor to describe both formats (portable root `plugin.json` + `extensions.com.openai.apps` → `.app.json` + root `mcp.json`; legacy `.codex-plugin/plugin.json` `apps` → `.app.json` + `mcpServers` → `.mcp.json`). Widen `codex_apps_manifest` and `codex_mcp_manifest` to accept either format, since the old wording names only the fallback.
3. Marketplace: replace the cross-pack relative links with backticked names plus the pack (`devtools`, `flowai-devtools` as a plugin), and add one sentence: list them by name even when the pack is not installed, and say which pack provides them. Keep intra-pack links.
4. Commands (user chose the single file): rewrite the checklist for one command file in the agreed IDE's directory and in that IDE's format (RED on the old skill); rewrite SKILL.md around one file per IDE, with IDE detection that does not treat `.claude/skills/` as proof of Claude Code; replace the validator with a single-file, per-IDE one (code TDD) and delete `init_command.ts` / `package_command.ts`; update the README line.
5. Re-run each scenario `-n 3`, then `deno task check`.
