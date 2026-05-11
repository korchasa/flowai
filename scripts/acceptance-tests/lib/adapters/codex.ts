// [FR-ACCEPT](../../../../documents/requirements.md#fr-accept-benchmarking) — OpenAI Codex acceptance test adapter
/**
 * Adapter for the OpenAI Codex CLI (`codex` binary, tested against 0.118.0).
 *
 * Non-interactive mode: `codex exec [OPTIONS] [PROMPT]`.
 * Streaming JSONL: `--json` (one NDJSON event per line on stdout).
 * Resume: `codex exec resume [SESSION_ID]` (nested subcommand, NOT a `--resume`
 * flag on the top-level `exec` — verified against `codex exec --help`).
 * Sandbox: `--sandbox workspace-write | read-only | danger-full-access`.
 * Approval: NO `--ask-for-approval` on `exec`; use `--full-auto` for the
 * convenience alias (on-request approval + workspace-write sandbox) or
 * `--dangerously-bypass-approvals-and-sandbox` for non-interactive full auto.
 *
 * Event shapes observed from probe (2026-04-11):
 * - `{"type":"thread.started","thread_id":"<uuid>"}` — first event, carries session ID.
 * - `{"type":"item.started",...}` — tool / message lifecycle.
 * - `{"type":"item.completed","item":{"id":"item_N","type":"agent_message","text":"..."}}` — assistant messages.
 * - `{"type":"item.completed","item":{"id":"item_N","type":"command_execution",...}}` — shell commands.
 * - `{"type":"turn.completed","usage":{"input_tokens":N,...}}` — end of turn.
 * - `{"type":"error","message":"..."}` — warnings / errors.
 *
 * Codex does NOT emit a `result` event like Claude Code. The final assistant
 * text is the last `item.completed` with `item.type === "agent_message"`.
 */

import { join } from "@std/path";
import type { AgentAdapter, ParsedAgentOutput } from "./types.ts";
import type { SessionUsage } from "../usage.ts";
import { probeCliVersion } from "./version.ts";

interface CodexEvent {
  type?: string;
  thread_id?: string;
  message?: string;
  item?: {
    id?: string;
    type?: string;
    text?: string;
    command?: string;
    aggregated_output?: string;
    exit_code?: number | null;
    status?: string;
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cached_input_tokens?: number;
  };
  error?: { message?: string };
}

/** Adapter for the OpenAI Codex CLI. */
export class CodexAdapter implements AgentAdapter {
  readonly ide = "codex" as const;
  readonly configDir = ".codex";
  readonly command = "codex";
  readonly outputFormat = "stream-json" as const;

  getEnv(): Record<string, string> {
    // Unset CODEX session markers so a nested acceptance test run doesn't inherit
    // the outer session ID (parallels ClaudeAdapter zeroing CLAUDECODE).
    return { CODEX_THREAD_ID: "" };
  }

  buildArgs(opts: {
    model: string;
    workspace: string;
    prompt: string;
    sessionId?: string;
    /** Codex has no equivalent of Claude's `--name`; this field is ignored. */
    name?: string;
  }): string[] {
    // Resume takes a completely different argv shape than initial: it is a
    // nested subcommand `codex exec resume [SESSION_ID] [PROMPT]`, and the
    // caller (acceptance test runner) spawns `codex` directly, so we prepend the
    // full subcommand chain here.
    if (opts.sessionId) {
      const args: string[] = [
        "exec",
        "resume",
        "--json",
        "--skip-git-repo-check",
        "--dangerously-bypass-approvals-and-sandbox",
        "--model",
        opts.model,
      ];
      args.push(opts.sessionId);
      if (opts.prompt) args.push(opts.prompt);
      return args;
    }

    // Initial turn: `codex exec [OPTIONS] [PROMPT]`.
    const args: string[] = [
      "exec",
      "--json",
      "--cd",
      opts.workspace,
      "--skip-git-repo-check",
      // Non-interactive: bypass approvals entirely. The benchmark runner
      // already sandboxes the workspace at the sandbox-path level, so we
      // don't need Codex's own seatbelt on top.
      "--dangerously-bypass-approvals-and-sandbox",
      "--model",
      opts.model,
    ];

    if (opts.prompt) {
      args.push(opts.prompt);
    }

    return args;
  }

  parseOutput(stdout: string): ParsedAgentOutput {
    const result: ParsedAgentOutput = {
      sessionId: null,
      result: null,
      subtype: null,
      assistantText: null,
      raw: null,
    };

    const events: CodexEvent[] = [];
    for (const line of stdout.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        events.push(JSON.parse(trimmed));
      } catch (_) {
        // Codex emits some stderr-like lines mixed with JSONL on edge cases;
        // skip anything that isn't valid JSON.
      }
    }

    if (events.length === 0) return result;
    result.raw = events;

    const assistantTexts: string[] = [];
    let sawTurnCompleted = false;
    let sawError = false;

    for (const event of events) {
      if (event.type === "thread.started" && event.thread_id) {
        result.sessionId = event.thread_id;
      }
      if (event.type === "turn.completed") sawTurnCompleted = true;
      if (
        event.type === "error" ||
        (event.type === "turn.failed")
      ) {
        sawError = true;
      }
      if (
        event.type === "item.completed" &&
        event.item?.type === "agent_message" &&
        typeof event.item.text === "string"
      ) {
        assistantTexts.push(event.item.text);
      }
    }

    if (assistantTexts.length > 0) {
      result.result = assistantTexts[assistantTexts.length - 1];
      result.assistantText = assistantTexts.join("\n\n");
    }

    // Subtype: mimic Claude's vocabulary so downstream judges don't fork.
    if (sawError) {
      result.subtype = "error";
    } else if (sawTurnCompleted) {
      result.subtype = "success";
    }

    return result;
  }

  async setupMocks(
    sandboxPath: string,
    mocks: Record<string, string>,
  ): Promise<void> {
    // [FR-DIST.CODEX-HOOKS](../../../../documents/requirements.md#fr-dist.codex-hooks-openai-codex-hook-sync-experimental) — Codex supports hooks via `<repo>/.codex/hooks.json`
    // behind the `codex_hooks` feature gate. Format mirrors Claude Code:
    // nested `{ hooks: { PreToolUse: [{ matcher, hooks: [{ type, command }] }] } }`.
    // Hooks are experimental ("under development") in codex-cli 0.118.0 — this
    // mock path is best-effort and requires `--enable codex_hooks` on the
    // test runner's `codex exec` call (or the enable flag set in config.toml).
    //
    // When the feature is off, the mock simply does nothing and the test
    // falls through to real tool execution. The acceptance test runner already
    // guards against unsandboxed failures at a higher level.
    if (!mocks || Object.keys(mocks).length === 0) return;

    const hooksDir = join(sandboxPath, this.configDir, "hooks");
    await Deno.mkdir(hooksDir, { recursive: true });

    const preToolUse: Array<{
      matcher: string;
      hooks: Array<{ type: string; command: string }>;
    }> = [];

    for (const [tool, mockOutput] of Object.entries(mocks)) {
      const hookScriptPath = join(hooksDir, `mock-${tool}.sh`);
      const hookScript = `#!/bin/bash
# Read stdin (JSON with tool details)
read -r input

# Return mock response — deny execution and inject mock output
cat <<'MOCK_EOF'
{
  "decision": "block",
  "reason": ${JSON.stringify(mockOutput)}
}
MOCK_EOF
`;
      await Deno.writeTextFile(hookScriptPath, hookScript);
      await Deno.chmod(hookScriptPath, 0o755);

      preToolUse.push({
        matcher: `Bash(${tool}:*)`,
        hooks: [{
          type: "command",
          command: `.codex/hooks/mock-${tool}.sh`,
        }],
      });
    }

    const settings = {
      hooks: {
        PreToolUse: preToolUse,
      },
    };

    await Deno.writeTextFile(
      join(sandboxPath, this.configDir, "hooks.json"),
      JSON.stringify(settings, null, 2),
    );
  }

  async calculateUsage(_sessionId: string): Promise<SessionUsage | null> {
    // Codex persists session rollouts under `~/.codex/sessions/` but does
    // not expose a public usage API. Defer until a follow-up task.
    await Promise.resolve();
    return null;
  }

  cliVersion(): Promise<string> {
    return probeCliVersion(this.command);
  }
}
