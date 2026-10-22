// [REF:fr:accept.token-usage | FR-ACCEPT.TOKEN-USAGE]
/**
 * Token usage of a Claude Code agent, recovered from its session transcripts.
 *
 * The ACP transport reports no usage for the agent, so the counts are read
 * back from what the CLI wrote under the run's `HOME`:
 * `<HOME>/.claude/projects/<slug>/<session>.jsonl`, plus one file per subagent
 * at `<slug>/<session>/subagents/agent-*.jsonl`. One reader serves both test
 * systems: the acceptance adapter's `calculateUsage` and the SWE-rebench
 * benchmark's cost harvest (FR-BENCH-SWE.COST), which also needs the API-call
 * and tool-call counts this module returns alongside the tokens.
 *
 * Transcript properties that decide the arithmetic (verified 2026-10-21 on
 * this host's Claude Code transcripts):
 *
 * - one API response spans several `assistant` lines that share `message.id`
 *   and repeat its `usage`, so usage is keyed by id and the LAST line wins —
 *   summing lines would multiply a response by its content-block count;
 * - a subagent's transcript shares no `message.id` with its parent's, so the
 *   files are summed;
 * - `input_tokens` excludes cache reads and cache writes, so the input fields
 *   are already disjoint; `output_tokens` INCLUDES the thinking tokens
 *   reported in `output_tokens_details.thinking_tokens`, so those are
 *   subtracted out of `output` and reported as `reasoning`.
 */
import { join } from "@std/path";
import { walk } from "@std/fs/walk";
import { addTokens, type TokenBreakdown } from "../token_usage.ts";

/** What one transcript file holds. */
export interface ClaudeTranscriptUsage {
  /** Null when no assistant line carried usage. */
  tokens: TokenBreakdown | null;
  /** Unique API responses (distinct `message.id`). */
  apiCalls: number;
  /** Unique `tool_use` blocks (distinct block id). */
  toolCalls: number;
  /** Unparseable non-empty lines, e.g. the torn tail of a killed session. */
  parseErrors: number;
}

/** A field an older CLI may omit reads as 0, never as NaN. */
function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function tokensFromClaudeUsage(u: Record<string, unknown>): TokenBreakdown {
  const details = (u.output_tokens_details ?? {}) as Record<string, unknown>;
  const fresh = num(u.input_tokens);
  const cached = num(u.cache_read_input_tokens);
  const write = num(u.cache_creation_input_tokens);
  const out = num(u.output_tokens);
  const thinking = num(details.thinking_tokens);
  return {
    freshInput: fresh,
    cachedInput: cached,
    cacheWrite: write,
    output: out - thinking,
    reasoning: thinking,
    total: fresh + cached + write + out,
  };
}

/** Parse one transcript file's text. */
export function parseClaudeTranscript(text: string): ClaudeTranscriptUsage {
  const usageById = new Map<string, Record<string, unknown>>();
  const toolIds = new Set<string>();
  let parseErrors = 0;
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    let j: Record<string, unknown>;
    try {
      j = JSON.parse(line) as Record<string, unknown>;
    } catch {
      parseErrors++;
      continue;
    }
    if (j.type !== "assistant") continue;
    const msg = (j.message ?? {}) as Record<string, unknown>;
    const usage = msg.usage;
    if (typeof msg.id === "string" && usage && typeof usage === "object") {
      usageById.set(msg.id, usage as Record<string, unknown>);
    }
    const content = Array.isArray(msg.content) ? msg.content : [];
    for (const block of content) {
      const b = block as Record<string, unknown>;
      if (b.type === "tool_use" && typeof b.id === "string") toolIds.add(b.id);
    }
  }
  let tokens: TokenBreakdown | null = null;
  for (const u of usageById.values()) {
    const one = tokensFromClaudeUsage(u);
    tokens = tokens ? addTokens(tokens, one) : one;
  }
  return {
    tokens,
    apiCalls: usageById.size,
    toolCalls: toolIds.size,
    parseErrors,
  };
}

/** Every transcript under `<home>/.claude/projects`, sorted. Throws when the
 * directory is absent, so each caller decides what a missing store means. */
export async function claudeTranscriptFiles(
  projectsDir: string,
): Promise<string[]> {
  const files: string[] = [];
  for await (
    const e of walk(projectsDir, { includeDirs: false, exts: [".jsonl"] })
  ) {
    files.push(e.path);
  }
  return files.sort();
}

/**
 * Usage of every session under one Claude `HOME` — the agent and its
 * subagents. Null rather than zero when nothing was measured: a missing
 * projects dir is not the same claim as "this run was free".
 */
export async function collectClaudeUsage(
  home: string,
): Promise<TokenBreakdown | null> {
  let files: string[];
  try {
    files = await claudeTranscriptFiles(join(home, ".claude", "projects"));
  } catch {
    return null;
  }
  let total: TokenBreakdown | null = null;
  for (const f of files) {
    const one = parseClaudeTranscript(await Deno.readTextFile(f)).tokens;
    if (!one) continue;
    total = total ? addTokens(total, one) : one;
  }
  return total;
}
