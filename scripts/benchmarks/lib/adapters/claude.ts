import { join } from "@std/path";
import type { AgentAdapter, ParsedAgentOutput } from "./types.ts";
import type { SessionUsage } from "../usage.ts";

interface ClaudeEvent {
  type?: string;
  subtype?: string;
  session_id?: string;
  result?: string;
  is_error?: boolean;
  total_cost_usd?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  message?: {
    content?: Array<{ type: string; text?: string }>;
  };
}

/** Adapter for Claude Code CLI. Parses stream-json (NDJSON) output and uses settings.local.json for mocking. */
export class ClaudeAdapter implements AgentAdapter {
  readonly ide = "claude" as const;
  readonly configDir = ".claude";
  readonly command = "claude";
  readonly outputFormat = "stream-json" as const;

  getEnv(): Record<string, string> {
    // Unset CLAUDECODE to allow spawning claude inside a claude session
    return { CLAUDECODE: "" };
  }

  buildArgs(opts: {
    model: string;
    workspace: string;
    prompt: string;
    sessionId?: string;
  }): string[] {
    const args = [
      "-p",
      "--verbose",
      "--model",
      opts.model,
      "--output-format",
      "stream-json",
      "--permission-mode",
      "bypassPermissions",
    ];

    if (opts.sessionId) {
      args.push("--resume", opts.sessionId);
    }

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

    // stream-json outputs one JSON event per line (NDJSON)
    const events: ClaudeEvent[] = [];
    for (const line of stdout.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        events.push(JSON.parse(trimmed));
      } catch (_) {
        // Skip malformed lines
      }
    }

    if (events.length === 0) return result;

    result.raw = events;

    // Collect ALL text blocks from assistant messages (for UserEmulator context)
    const assistantTexts: string[] = [];

    // Extract data from events in order
    for (const event of events) {
      if (event.session_id) {
        result.sessionId = event.session_id;
      }

      if (event.type === "result") {
        result.subtype = event.subtype ?? null;
        if (event.result !== undefined) {
          result.result = event.result;
        }
      }

      // Collect text from all assistant messages
      if (event.type === "assistant" && event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === "text" && block.text) {
            assistantTexts.push(block.text);
          }
        }
      }
    }

    // Fallback: use last assistant text if result is missing or empty
    if (!result.result && assistantTexts.length > 0) {
      result.result = assistantTexts[assistantTexts.length - 1];
    }

    result.assistantText = assistantTexts.length > 0
      ? assistantTexts.join("\n\n")
      : null;

    return result;
  }

  async setupMocks(
    sandboxPath: string,
    mocks: Record<string, string>,
  ): Promise<void> {
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

# Return mock response - deny execution and inject mock output
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
          command: `.claude/hooks/mock-${tool}.sh`,
        }],
      });
    }

    const settings = {
      hooks: {
        preToolUse,
      },
    };

    await Deno.writeTextFile(
      join(sandboxPath, this.configDir, "settings.local.json"),
      JSON.stringify(settings, null, 2),
    );
  }

  async calculateUsage(_sessionId: string): Promise<SessionUsage | null> {
    // Claude Code transcript parsing not implemented yet — return null
    await Promise.resolve();
    return null;
  }
}
