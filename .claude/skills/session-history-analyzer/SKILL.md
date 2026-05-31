---
name: session-history-analyzer
description: >-
  Analyzes past AI IDE sessions (Claude Code, OpenAI Codex, OpenCode) for LLM
  behavior errors: hallucinated diagnostics, context decay, format loss,
  language leakage, and excessive reading. Use when the user asks to inspect
  session history, find agent errors, or build a session error index.
---

# Session History Analysis

Use this skill when you need to inspect past AI IDE sessions and find model behavior errors.

## IDE Selection

This skill supports three of the IDEs flowai targets: **Claude Code**, **OpenAI Codex**, **OpenCode**. (Cursor stores sessions inside SQLite with no per-session file and is out of scope for now.)

Before analyzing, fix the IDE scope:

1. If the user named an IDE, analyze only that IDE.
2. If the user gave an explicit path, infer the IDE from the path (match against the source layouts below) and use only that path.
3. If the user named no IDE, detect which IDEs have history on this machine (run the listing script per IDE — see "Listing Sessions") and ask the user to choose one or more. Do not silently default to a single IDE.
4. Always record the IDE next to every analyzed session and in the index — sessions from different IDEs are never merged into one row.

Each IDE stores history differently (Claude Code and Codex as per-session JSONL files, OpenCode as JSON shards). Use the matching extraction method per IDE; do not assume the Claude Code JSONL shape elsewhere.

## History Sources

History lives at the user level. Do not look inside the project directory unless the user gives an explicit path.

### Claude Code
- Sessions: `~/.claude/projects/{project-path-with-dashes}/*.jsonl` — one JSONL file per session, one event per line.
- Global prompt index: `~/.claude/history.jsonl`.
- Project path is the cwd with `/` replaced by `-` (e.g. `/Users/x/www/proj` → `-Users-x-www-proj`).

### OpenAI Codex
- Sessions: `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` — one JSONL rollout file per session.
- Archived: `~/.codex/archived_sessions/`.
- First line is a `session_meta` event carrying `payload.id`, `payload.cwd`, `payload.cli_version`; subsequent lines are `response_item` events (`message`/`function_call`/`function_call_output`). Filter by `cwd` to scope to a project.

### OpenCode
- NOT single-file JSONL. Storage root: `~/.local/share/opencode/storage/`.
  - Session metadata: `session/<project-hash>/ses_*.json` (id, title, timestamps, directory).
  - Messages: `message/ses_<id>/msg_*.json` (one JSON file per message; role, tokens, cost).
  - Message parts (text, tool calls/results): `part/<msg-id>/` shards keyed by message id.
- Index DB: `~/.local/share/opencode/opencode.db` (SQLite; WAL files alongside).
- To reconstruct one session: read its `ses_*.json`, then aggregate its `message/ses_<id>/*.json` and matching `part/<msg-id>/` shards. "Session size" = message JSON bytes + their part bytes (what the listing script reports). The session "path" is the absolute `message/ses_<id>/` directory.

## Listing Sessions

Use the bundled script to enumerate candidate sessions per IDE instead of globbing by hand. It returns **absolute paths** (OpenCode: the absolute `message/ses_<id>/` directory), already filtered by size and by the analyzed-set in the YAML index.

```sh
# absolute paths, one per line, largest first
python3 scripts/list_sessions.py --ide claude
python3 scripts/list_sessions.py --ide codex
python3 scripts/list_sessions.py --ide opencode

# with size, as JSON objects {ide, path, size_bytes}
python3 scripts/list_sessions.py --ide opencode --json

# override the size floor (bytes) and the index used for the analyzed-set
python3 scripts/list_sessions.py --ide claude --min-bytes 204800 \
  --index ~/.claude/session-analysis/llm-session-errors-index.yaml
```

- `--ide` (required): `claude` | `codex` | `opencode`.
- `--min-bytes` (default 102400 = 100 KiB): skip sessions below this size.
- `--index` (default `~/.claude/session-analysis/llm-session-errors-index.yaml`): any session whose id (path) already appears under an `id:` key in the index is skipped, so reruns only surface new sessions. A missing index means "nothing analyzed yet".
- Stdlib-only Python 3; no third-party dependencies.

## Algorithm

1. Determine the analysis scope:
   - first fix the IDE scope (see "IDE Selection");
   - enumerate candidate sessions with `scripts/list_sessions.py --ide <ide>` (see "Listing Sessions") — it already returns absolute paths filtered by size and by the analyzed-set;
   - if the user gave a path, use only that path;
   - if the user asked for random sessions, choose a reproducible sample and report the seed;
   - if the user did not specify a size, keep the script default (sessions larger than 100 KB).
2. Filter empty and service sessions:
   - the listing script applies the size floor; treat its output as the substantive set;
   - exclude the current session if it is still being written.
3. Distribute analysis across subagents:
   - delegate the actual per-session analysis to the **`session-error-analyzer`** subagent (runs on sonnet, read-only); it returns a structured per-session YAML summary;
   - split selected sessions into batches of 5-20 files, accounting for file size and available context, and hand each batch (with its IDE) to one subagent invocation;
   - do not pass one subagent's conclusions to another before synthesis, to avoid propagating a weak hypothesis;
   - if subagents are unavailable, analyze batches sequentially yourself following the `session-error-analyzer` extraction rules, and state this explicitly in the result.
4. For each session, extract:
   - IDE (one of: Claude Code, OpenAI Codex, OpenCode);
   - session path (file path for Claude Code / Codex; the `message/ses_<id>/` directory for OpenCode);
   - full session size (file bytes for JSONL; summed message/part bytes for OpenCode — as the listing script reports);
   - first user request;
   - title, if available;
   - tool calls and tool errors;
   - final response;
   - signs of loops, dead ends, format violations, language failures, and unsupported claims;
   - for each found error, the size position: line number (Claude Code / Codex JSONL) or message index (OpenCode), approximate byte offset, percentage of the session, and session size at the point where the error appeared.
5. Compare sessions with each other:
   - a recurring error requires a shared root cause, not just a similar symptom;
   - do not classify normal code exploration as an error;
   - do not call an assumption a hallucination if the agent verified it before acting.
6. Produce the result:
   - concise overall conclusion;
   - table by session;
   - table of found errors with each error's size position;
   - recurring patterns;
   - cautious hypotheses separately from proven facts.
7. If the user asks for an index:
   - by default, use the append-only YAML file `~/.claude/session-analysis/llm-session-errors-index.yaml` (the same path `list_sessions.py` reads for its analyzed-set);
   - if the file already exists, append the new batch under `batches:` without rewriting previous batches;
   - if the file is missing, create it with the top-level keys and the first batch.

## Error Taxonomy

- **Hallucinated diagnostics**: the model infers a cause or fact without support from a log, file, or verification.
- **Context decay**: the model forgets a previously established fact, repeats an acknowledged dead end, or acts against a fresh summary.
- **Regression to the mean**: a strong default response pattern overrides a local instruction.
- **Format loss**: the response violates the requested format, such as raw JSON only, exactly two sentences, or no lists.
- **Language leakage**: the response switches away from the user's language or imports forbidden terms from source material.
- **Excessive reading**: the model reads large files in chunks instead of using search, indexes, or targeted extraction.
- **Weak grounding**: incorrect paths, unverified assumptions about project structure, or actions before checking the environment.
- **Premature confidence**: the model presents a conclusion as proven when the evidence is only partial.

## Index Format

When the user asks for an index file, maintain an append-only **YAML** file. New
analysis batches are appended under `batches:`; previous batches are never
rewritten. Every analyzed session is one item under `batches[].sessions` with an
`id:` equal to its absolute path — this is the exact key `list_sessions.py` scans
to skip already-analyzed sessions, so the `id:` MUST match the path the script
emits.

```yaml
# Append-only index of LLM session errors across AI IDE sessions.
# New batches are appended under `batches:`. One batch = one IDE.
title: Append-Only Index of LLM Session Errors
batches:
  - date: YYYY-MM-DD
    ide: claude          # claude | codex | opencode (one IDE per batch)
    source: <root path the sessions came from>
    sample: <how sessions were selected>
    seed: <seed, if a random sample; else null>
    taxonomy: <short definitions, or a reference>
    sessions:
      - id: /abs/path/to/session.jsonl   # absolute path emitted by list_sessions.py
        ide: claude
        size: 234112                      # bytes
        context: <first user request / task>
        errors:
          - type: hallucinated-diagnostics
            signal: <short signal>
            position: "line 320, offset 145000, 62%, session size 234112"
            evidence: hypothesis          # proven | hypothesis
      - id: /abs/path/to/another.jsonl
        ide: claude
        size: 180044
        context: <task>
        errors: []                        # empty list = no clear errors
    patterns:
      - pattern: <recurring pattern>
        sessions: [1, 3]                  # 1-based indices within this batch
```

## Quality Rules

- Record the IDE for every session and every error; never merge sessions from different IDEs into one batch.
- Use the absolute path from `list_sessions.py` as each session's `id` (Claude Code / Codex: the `.jsonl` file; OpenCode: the `message/ses_<id>/` directory) so reruns correctly skip analyzed sessions.
- Include the full size of every session and the size position of every found error.
- Do not quote long log fragments; summarize them and provide short signals.
- Separate proven errors from cautious hypotheses.
- If a session was interrupted or the user rejected a tool, state that directly; do not infer the outcome.
- If the final answer was correct but the path was expensive, classify it as a process error rather than a hallucination.
- In the final response, list any files created or updated.
