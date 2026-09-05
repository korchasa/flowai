/**
 * Codex subagent events recovered from the rollout files under `CODEX_HOME/sessions`.
 *
 * The codex ACP bridge reports a `spawn_agent` dispatch as a tool call titled
 * `Start subagent <task_name>` whose rawInput carries only thread ids, and it
 * reports the subagent's reply as nothing at all: the reply reaches the parent as
 * a `response_item` of type `agent_message` (`Message Type: FINAL_ANSWER`) that
 * never becomes a session update. The judge therefore saw a dispatch under the
 * agent's ad-hoc task name and no findings, and failed `scout_result_obtained`
 * / `no_fabricated_verbatim` on a run whose rollout held the full scout report
 * (`plan-uses-scout-findings`, 2026-09-05). This module reads the ground truth
 * back out of the rollouts so the trace names the `agent_type` and quotes the
 * reply.
 */
import { join } from "@std/path";
import { walk } from "@std/fs";

export type CodexAgentEvent =
  | { kind: "spawn"; taskName: string; agentType: string; forkTurns: string }
  | { kind: "message"; author: string; recipient: string; text: string };

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Parses one rollout (JSONL) into the subagent events it carries, in file order. */
export function parseCodexRollout(jsonl: string): CodexAgentEvent[] {
  const events: CodexAgentEvent[] = [];
  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    let item: { type?: string; payload?: Record<string, unknown> };
    try {
      item = JSON.parse(line);
    } catch {
      continue;
    }
    const p = item.payload;
    if (item.type !== "response_item" || !p) continue;
    if (p.type === "function_call" && p.name === "spawn_agent") {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(str(p.arguments));
      } catch {
        // malformed arguments: still record the dispatch
      }
      events.push({
        kind: "spawn",
        taskName: str(args.task_name),
        agentType: str(args.agent_type),
        forkTurns: str(args.fork_turns),
      });
    } else if (p.type === "agent_message") {
      const content = Array.isArray(p.content) ? p.content : [];
      const text = content
        .map((c) => str((c as Record<string, unknown>).text))
        .filter((t) => t.length > 0)
        .join("\n");
      events.push({
        kind: "message",
        author: str(p.author),
        recipient: str(p.recipient),
        text,
      });
    }
  }
  return events;
}

/** Renders the events as a `[codex-agents]` trace block; empty string when there are none. */
export function renderCodexAgentTrace(
  events: readonly CodexAgentEvent[],
): string {
  if (events.length === 0) return "";
  const lines = events.map((e) =>
    e.kind === "spawn"
      ? `spawn_agent -> ${
        e.agentType || "?"
      } (task_name=${e.taskName}, fork_turns=${e.forkTurns})`
      : `message ${e.author} -> ${e.recipient}:\n${
        e.text.split("\n").map((l) => `    ${l}`).join("\n")
      }`
  );
  const header =
    "recovered from the codex rollouts; the bridge omits these from the tool-call trace. " +
    "Each dispatch happened at its `Start subagent` tool call, and each message reached the parent " +
    "when the parent's `wait` tool call for it completed — i.e. BEFORE every tool call listed after that `wait`.";
  return `\n[codex-agents] (${header})\n               ${
    lines.join("\n               ")
  }\n`;
}

/** Reads every `sessions/**\/rollout-*.jsonl` under `codexHome` and renders their subagent events. */
export async function collectCodexAgentTrace(
  codexHome: string,
): Promise<string> {
  const root = join(codexHome, "sessions");
  const files: string[] = [];
  try {
    for await (
      const e of walk(root, {
        includeDirs: false,
        match: [/rollout-.*\.jsonl$/],
      })
    ) {
      files.push(e.path);
    }
  } catch {
    return "";
  }
  files.sort();
  const events: CodexAgentEvent[] = [];
  for (const f of files) {
    events.push(...parseCodexRollout(await Deno.readTextFile(f)));
  }
  return renderCodexAgentTrace(events);
}
