import { join } from "@std/path";
import type { AgentAdapter, ParsedAgentOutput } from "./types.ts";
import { calculateSessionUsage, type SessionUsage } from "../usage.ts";

interface CursorAgentOutput {
  session_id?: string;
  result?: string | { subtype: string; result: string };
  subtype?: string;
}

/** Adapter for the cursor-agent CLI. Handles JSON output parsing and Cursor hooks-based mocking. */
export class CursorAdapter implements AgentAdapter {
  readonly ide = "cursor" as const;
  readonly configDir = ".cursor";
  readonly command = "cursor-agent";
  readonly outputFormat = "json" as const;

  getEnv(): Record<string, string> {
    return {};
  }

  buildArgs(opts: {
    model: string;
    workspace: string;
    prompt: string;
    sessionId?: string;
  }): string[] {
    const args = [
      "--model",
      opts.model,
      "--workspace",
      opts.workspace,
      "--force",
      "--approve-mcps",
      "--print",
      "--output-format",
      "json",
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

    let searchIndex = 0;
    while (true) {
      const start = stdout.indexOf("{", searchIndex);
      if (start === -1) break;

      let depth = 0;
      let end = -1;
      for (let i = start; i < stdout.length; i++) {
        if (stdout[i] === "{") depth++;
        else if (stdout[i] === "}") {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }

      if (end === -1) break;

      const potentialJson = stdout.slice(start, end + 1);
      try {
        const obj = JSON.parse(potentialJson) as CursorAgentOutput;

        if (obj.session_id) {
          result.sessionId = obj.session_id;
        }
        if (obj.subtype) {
          result.subtype = obj.subtype;
        }
        if (obj.result !== undefined) {
          if (typeof obj.result === "string") {
            result.result = obj.result;
          } else if (obj.result && typeof obj.result === "object") {
            result.result = obj.result.result;
          }
        }
        result.raw = obj;

        searchIndex = end + 1;
      } catch (_) {
        searchIndex = start + 1;
      }
    }

    return result;
  }

  async setupMocks(
    sandboxPath: string,
    mocks: Record<string, string>,
  ): Promise<void> {
    if (!mocks || Object.keys(mocks).length === 0) return;

    const hooksDir = join(sandboxPath, this.configDir, "hooks");
    await Deno.mkdir(hooksDir, { recursive: true });

    const hookDefinitions: Array<{ command: string; matcher: string }> = [];

    for (const [tool, mockOutput] of Object.entries(mocks)) {
      const hookScriptPath = join(hooksDir, `mock-${tool}.sh`);
      const hookScript = `#!/bin/bash
# Read stdin (JSON with command details)
read -r input

# Return mock response - deny execution and inject mock output
cat <<'MOCK_EOF'
{
  "permission": "deny",
  "agent_message": ${JSON.stringify(mockOutput)}
}
MOCK_EOF
`;
      await Deno.writeTextFile(hookScriptPath, hookScript);
      await Deno.chmod(hookScriptPath, 0o755);

      hookDefinitions.push({
        command: `.cursor/hooks/mock-${tool}.sh`,
        matcher: tool,
      });
    }

    const hooksConfig = {
      version: 1,
      hooks: {
        beforeShellExecution: hookDefinitions,
      },
    };

    await Deno.writeTextFile(
      join(sandboxPath, this.configDir, "hooks.json"),
      JSON.stringify(hooksConfig, null, 2),
    );
  }

  async calculateUsage(sessionId: string): Promise<SessionUsage | null> {
    return await calculateSessionUsage(sessionId);
  }
}
