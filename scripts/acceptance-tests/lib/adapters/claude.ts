import { dirname, join } from "@std/path";
import type { AgentAdapter, ParsedAgentOutput } from "./types.ts";
import type { SessionUsage } from "../usage.ts";
import { probeCliVersion } from "./version.ts";

/**
 * Files/dirs under the real `$HOME` that must remain reachable from the
 * isolated bench-home so OAuth/Keychain auth keeps working on macOS:
 *   - `Library/Keychains/`     — default keychain search-path resolution.
 *   - `.local/share/claude/`   — versioned launcher binary + PID lock dir.
 * Symlinked into the bench-home; missing entries are skipped silently
 * (e.g. Linux has no `Library/Keychains`).
 */
const ISOLATED_HOME_LINKS = [
  "Library/Keychains",
  ".local/share/claude",
] as const;

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

  /**
   * Builds an isolated `$HOME` directory adjacent to the sandbox (NOT inside
   * it — placing the bench-home in the sandbox makes it appear as `untracked`
   * in `git status` and trips scenarios that assert a clean working tree).
   * Returns `{ HOME: <bench-home> }` for the spawned `claude` process.
   *
   * The bench-home contains an empty `.claude/skills/` (so user-level skill
   * installations at `~/.claude/skills/` cannot shadow the sandbox-level
   * project skills via the Skill tool resolution path) plus targeted
   * symlinks back to the real `$HOME` for OAuth/Keychain auth and the
   * versioned launcher binary.
   *
   * The real `~/.claude/skills/` is never read or written by this adapter —
   * the symlinks deliberately exclude it. See FR-ACCEPT-ISOLATION (SRS) and
   * SDS §3.4 for the precedence-bug history.
   *
   * `.credentials.json` is intentionally NOT mirrored: when present, Claude
   * reads the plaintext backend instead of Keychain, and the file's
   * refreshToken is typically stale (HTTP 400 from the OAuth token endpoint).
   * Letting Keychain win avoids that footgun.
   */
  // implements [REF:fr:accept-isolation | FR-ACCEPT-ISOLATION]
  async prepareWorkspace(
    sandboxPath: string,
  ): Promise<Record<string, string>> {
    // Sibling of sandbox: <workDir>/bench-home alongside <workDir>/sandbox.
    // Cleaned up automatically when the runner wipes <workDir> on next run.
    const benchHome = join(dirname(sandboxPath), "bench-home");
    await Deno.mkdir(join(benchHome, ".claude", "skills"), { recursive: true });

    const realHome = Deno.env.get("HOME");
    if (realHome) {
      for (const rel of ISOLATED_HOME_LINKS) {
        const src = join(realHome, rel);
        const dst = join(benchHome, rel);
        try {
          await Deno.lstat(src);
        } catch {
          continue; // Source missing (e.g. Linux without Keychains) → skip.
        }
        await Deno.mkdir(dirname(dst), { recursive: true });
        try {
          await Deno.symlink(src, dst);
        } catch (e) {
          if (!(e instanceof Deno.errors.AlreadyExists)) throw e;
        }
      }
    }

    return { HOME: benchHome };
  }

  buildArgs(opts: {
    model: string;
    workspace: string;
    prompt: string;
    sessionId?: string;
    name?: string;
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

    if (opts.name) {
      args.push("--name", opts.name);
    }

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

    // Each hook script is registered under a broad `Bash` matcher (no
    // command prefix filter). The hook itself inspects
    // `tool_input.command` and blocks iff the mocked tool is invoked as a
    // command *head* anywhere in the command — at string start or right
    // after a statement / pipe / group separator, past any leading
    // `VAR=val` env assignments. This is robust to:
    //   - `claude -p "…"`                      (plain)
    //   - `CLAUDECODE="" claude -p "…"`         (env assignment prefix)
    //   - `( CLAUDECODE="" claude -p "…" ) &`   (subshell + background)
    //   - `FOO=1 BAR=2 claude …`                (multiple env prefixes)
    //   - `DIR=… <newline> curl … | deno run …` (later-statement / pipe head)
    // The last shape matters for fetch skills that pipe `curl` into a
    // parser: a first-token-only check missed the `curl` and let the real
    // network through. Claude Code's built-in `Bash(<prefix>:*)` matcher
    // does NOT do this, so filtering inside the hook avoids depending on
    // undocumented matcher semantics.
    for (const [tool, mockOutput] of Object.entries(mocks)) {
      const hookScriptPath = join(hooksDir, `mock-${tool}.sh`);
      const hookScript = `#!/bin/bash
# PreToolUse mock for \`${tool}\`.
# Reads the hook JSON payload on stdin, extracts the Bash command, and
# blocks it with a mock reason iff \`${tool}\` is invoked as a command
# head anywhere in the command (string start or after a statement /
# pipe / group separator, past any env assignments). Otherwise exits 0
# silently so the real command proceeds.
set -u
input=$(cat)

# Extract tool_input.command. Fall back to empty string if jq absent
# or field missing.
if command -v jq >/dev/null 2>&1; then
  cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)
else
  cmd=$(printf '%s' "$input" | sed -n 's/.*"command":"\\([^"]*\\)".*/\\1/p')
fi

# Block iff the mocked tool is invoked as a command HEAD anywhere in the
# command: at string start, or right after a statement / pipeline / group
# separator (\`|\`, \`;\`, \`&\`, \`(\`, \`{\`, backtick), allowing leading
# \`VAR=val\` env assignments. grep is line-oriented, so \`^\` also catches
# the tool as the first token of any newline-separated statement (e.g. a
# skill that sets \`DIR=…\` on its own line, then \`curl … | deno run …\`).
# A bare argument like \`echo curl\` is NOT a head, so it does not match —
# nor is \`grep curl\` inside a pipe segment (the segment head is \`grep\`).
#
# The head may carry an absolute/relative PATH prefix (\`([^space|;&]*/)?\`)
# so \`/opt/homebrew/opt/curl/bin/curl …\` and \`./curl …\` are blocked too —
# otherwise an agent that discovered the binary path could bypass a
# bare-head matcher and hit the real network. A second pattern blocks the
# discovery builtins (\`command -v\` / \`which\` / \`type\` / \`whereis\` / \`hash\`)
# that leak that path, so the tool reads as genuinely unavailable.
head='(^|[|;&(){}\`])[[:space:]]*([A-Za-z_][A-Za-z0-9_]*=("[^"]*"|[^[:space:]]*)[[:space:]]+)*([^[:space:]|;&]*/)?${tool}([[:space:]|;&]|$)'
discover='(^|[|;&(){}\`])[[:space:]]*(command[[:space:]]+-v|which|type|whereis|hash)([[:space:]]+-[A-Za-z]+)*[[:space:]]+([^[:space:]|;&]*/)?${tool}([[:space:]|;&]|$)'
if printf '%s' "$cmd" | grep -Eq "$head" || printf '%s' "$cmd" | grep -Eq "$discover"; then
  cat <<'MOCK_EOF'
{
  "decision": "block",
  "reason": ${JSON.stringify(mockOutput)}
}
MOCK_EOF
fi

# No match → exit 0 silently; Claude Code treats silent 0-exit
# PreToolUse hooks as "no decision", and the command proceeds to the
# next hook (or to actual execution if none matches).
exit 0
`;
      await Deno.writeTextFile(hookScriptPath, hookScript);
      await Deno.chmod(hookScriptPath, 0o755);

      preToolUse.push({
        matcher: `Bash`,
        hooks: [{
          type: "command",
          command: `.claude/hooks/mock-${tool}.sh`,
        }],
      });
    }

    // IMPORTANT: Claude Code settings use PascalCase event names
    // (`PreToolUse`, `PostToolUse`). A camelCase `preToolUse` key is
    // silently ignored with no warning — hooks simply never fire.
    // `claude_test.ts` pins this casing via an explicit assertion.
    const settings = {
      hooks: {
        PreToolUse: preToolUse,
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

  cliVersion(): Promise<string> {
    return probeCliVersion(this.command);
  }
}
