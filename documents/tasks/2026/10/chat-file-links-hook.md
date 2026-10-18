---
date: 2026-10-17
status: done
implements:
  - FR-CHAT-LINKS
  - FR-CHAT-LINKS.HOOK
  - FR-CHAT-LINKS.RULE
---
# Clickable file references in chat replies

## Goal

Every file path the agent hands the user in a chat reply opens with one click. A
link that leads nowhere, or a path the user has to copy and search for by hand,
costs the user a turn and erodes trust in the answer.

## Overview

### Context

OpsBrain already solves this with the `chat-links` check inside its turn-end
guardrail (`ops guardrail stop`, Go, repository `~/www/4ra/cli`, files
`go/internal/guardrail/checks/chatlinks.go` and
`go/internal/guardrail/chatpaths/chatpaths.go`). The check reads the final
answer, extracts the paths written as Markdown link targets or inline code
spans, checks each on disk, and blocks the stop with a short correction request
when one is wrong. OpsBrain calibrated the rules on 120 sessions; its
`format-references` rule records a measurement of 9 sessions (2026-09-10) with
31 broken links, 25 existing paths left unlinked and 24 paths written relative
to the wrong root.

The user asked for the same check in flowai (2026-10-17) and chose:

- placement: the `core` pack, plus a written rule in the shipped
  `AGENTS.template.md`, so IDEs without a blocking turn-end hook still get the
  rule as an instruction;
- scope: all three finding kinds — broken link, existing path not linked,
  path with no base.

### Current State

- flowai ships three hooks: `skill-structure-validate` (devtools,
  `PostToolUse`), `status` (memex, `SessionStart`) and `doc-anchors-validate`
  (beta, `Stop`). `core` ships none, and
  `scripts/build-plugins_test.ts::codex-plugin-manifests emits-codex-plugin-manifests`
  asserts that the core manifest has no hooks component.
- `doc-anchors-validate` is the pattern to follow: a single self-contained
  `run.ts` (no sibling imports), stdin JSON in Claude Code's format,
  `{"decision":"block","reason":...}` on stdout, `stop_hook_active` anti-loop,
  fail-open on any internal error.
- Claude Code's `Stop` input carries `last_assistant_message`, `cwd` and
  `stop_hook_active` (the OpsBrain guardrail reads exactly these fields, see
  `go/internal/guardrail/io.go` in the cli repo).
- A blocking turn-end hook works on Claude Code only (FR-HOOK-RESOURCES.FORMAT:
  Codex `exec` never fires `Stop`, OpenCode `session.idle` cannot block, the
  Cursor CLI runs no hooks).

### Constraints

- `run.ts` is single-file: distribution copies only that file.
- Fail-open: a hook error never disrupts the session.
- The OpsBrain-only rule for clones under `sources/` is not ported.
- No other OpsBrain behaviour is dropped silently: bare prose is out of scope,
  quoted regions (code fences, blockquotes, inline runs of 3+ backticks) count
  for nothing, absolute paths outside the project are checked only when linked.
- The block reason forbids re-sending the answer: the first answer is already
  on screen, and a re-send shows the user two copies.
- `framework/core/assets/AGENTS.template.md`, `AGENTS.md`,
  `documents/requirements.md` and `documents/design.md` carry uncommitted edits
  of a parallel session; touch only this task's lines.

## Definition of Done

- [x] FR-CHAT-LINKS.HOOK: a Markdown link to a missing local file blocks the stop and names the file, with matches found elsewhere in the tree as a hint
  - Test: `framework/core/hooks/chat-links-validate/run_test.ts::broken-link-*`
  - Evidence: `deno test -A framework/core/hooks/chat-links-validate/run_test.ts`
- [x] FR-CHAT-LINKS.HOOK: an existing project path written in backticks blocks the stop and asks for a link
  - Test: `framework/core/hooks/chat-links-validate/run_test.ts::missing-link-*`
  - Evidence: `deno test -A framework/core/hooks/chat-links-validate/run_test.ts`
- [x] FR-CHAT-LINKS.HOOK: a backtick path that does not resolve from the root but exists deeper in the tree blocks the stop and lists the full paths
  - Test: `framework/core/hooks/chat-links-validate/run_test.ts::baseless-*`
  - Evidence: `deno test -A framework/core/hooks/chat-links-validate/run_test.ts`
- [x] FR-CHAT-LINKS.HOOK: non-claims produce no finding — quoted regions, URLs, templates, arguments, image tags, tokens without an extension, absolute host paths in backticks
  - Test: `framework/core/hooks/chat-links-validate/run_test.ts::extract-*`
  - Evidence: `deno test -A framework/core/hooks/chat-links-validate/run_test.ts`
- [x] FR-CHAT-LINKS.HOOK: `stop_hook_active`, an empty message and a clean answer exit silently; the block reason forbids repeating the answer
  - Test: `framework/core/hooks/chat-links-validate/run_test.ts::decide-*`, `::main-*`
  - Evidence: `deno test -A framework/core/hooks/chat-links-validate/run_test.ts`
- [x] FR-CHAT-LINKS.HOOK: the `core` plugin emits a `Stop` entry for `chat-links-validate` and copies its `run.ts`
  - Test: `scripts/build-plugins_test.ts::core-pack ships-chat-links-stop-hook`
  - Evidence: `deno test -A scripts/build-plugins_test.ts`
- [x] FR-CHAT-LINKS.RULE: the shipped template states the file-reference rule in its chat section, mirrored in this repository's `AGENTS.md`
  - Test: `Benchmark: agents-rules-file-links`
  - Evidence: `grep -c 'File references' framework/core/assets/AGENTS.template.md AGENTS.md` prints 1 for each file
- [x] FR-CHAT-LINKS: SRS and SDS describe the hook and the rule; FR-HOOK-RESOURCES.FORMAT lists the hook
  - Evidence: `grep -n 'chat-links-validate' documents/requirements.md documents/design.md`
- [x] The project gate is green
  - Evidence: `deno task check` ends with `0 failed`

## Solution

1. SRS: add FR-CHAT-LINKS with sub-clauses `.HOOK` and `.RULE`; add the hook to
   the framework-hooks list of FR-HOOK-RESOURCES.FORMAT.
2. SDS: describe the hook next to `doc-anchors-validate` (§3.1.1 packs list,
   plugin build §, hook transform note "core has zero hooks").
3. RED: write `framework/core/hooks/chat-links-validate/run_test.ts` covering
   extraction (ported from `chatpaths_test.go`), the three finding kinds on a
   temp project tree, the decision rules and a subprocess run of `run.ts`. Run
   it — it fails because `run.ts` does not exist.
4. GREEN: write `hook.yaml` (`event: Stop`) and a single-file `run.ts`, a port
   of `chatpaths.go` + `chatlinks.go` minus the `sources/` rule. The tree index
   for hints comes from `git ls-files --cached --others --exclude-standard`
   inside a work tree (fast, honours `.gitignore`), falling back to a walk that
   skips `.git` and `node_modules`. It is built lazily, only when a path does not
   resolve.
5. Build: update `scripts/build-plugins_test.ts` — the core manifest now has a
   hooks component; add `core-pack ships-chat-links-stop-hook`.
6. Template rule, Acceptance TDD: write scenario
   `framework/core/acceptance-tests/agents-rules-file-links/` (a fixture with
   nested files; the query asks where something is implemented; the checklist
   requires every existing path to be a Markdown link with a target that
   resolves from the project root). Run it on the current template — it must
   fail. Then add a `File references` bullet to `## Chat Output Style` in
   `AGENTS.template.md` and `AGENTS.md`, and run the scenario again — it must
   pass.
7. `deno task check`; hand the full acceptance sweep for `core` to the user.
