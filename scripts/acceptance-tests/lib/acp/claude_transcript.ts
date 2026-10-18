/**
 * Claude Code's own session transcript (FR-ACCEPT.ACP), read for one fact the
 * ACP stream does not carry: whether the model still owes an answer to a
 * background task's completion notice.
 *
 * The claude bridge (claude-agent-acp 0.81.0, `settleOrDefer`) holds a turn
 * open only while a subagent it spawned is still live. When the last one ends
 * during the parent's current model call, the next result settles the turn
 * with `end_turn` — while the CLI has that subagent's notice queued and is
 * about to answer it on its own. Ending the session there kills the CLI before
 * the model reads the notice (sweep 2026-10-18T14-45-21,
 * `maintenance-detects-doc-health-issues`: the coverage worker ended at
 * 15:48:25.319, the turn settled at 26.714, the notice was dequeued at
 * 26.725). The transcript records the notice's whole life — queued, dequeued,
 * answered — so it is the one place the runner can see that work is still due.
 */
import { join } from "@std/path";

/**
 * How many background notices the model has not answered yet, from the text
 * of a Claude Code session transcript (`<config>/projects/<slug>/<id>.jsonl`).
 *
 * A notice is owed from its `queue-operation` enqueue until an assistant
 * message with a terminal stop reason follows its dequeued `user` entry
 * (`origin.kind: "task-notification"`). `tool_use` and a missing stop reason
 * are not terminal: the model is still working on it. One terminal answer
 * settles every notice before it, because the CLI answers notices queued
 * together with one model call. A line that does not parse — the tail of a
 * write still in progress — is skipped; the next read sees it whole.
 */
export function unansweredTaskNotifications(jsonl: string): number {
  let queued = 0;
  let unanswered = 0;
  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry["type"] === "queue-operation") {
      // The queue carries the user's own prompts too; those are dequeued
      // before their turn even starts, so only notices stay counted here.
      if (entry["operation"] === "enqueue") queued++;
      else if (
        entry["operation"] === "dequeue" || entry["operation"] === "remove"
      ) queued = Math.max(0, queued - 1);
    } else if (entry["type"] === "user") {
      const origin = entry["origin"] as { kind?: unknown } | undefined;
      if (origin?.kind === "task-notification") unanswered++;
    } else if (entry["type"] === "assistant") {
      const message = entry["message"] as { stop_reason?: unknown } | undefined;
      const stop = message?.stop_reason;
      if (typeof stop === "string" && stop !== "tool_use") unanswered = 0;
    }
  }
  return queued + unanswered;
}

/**
 * The transcript file of `sessionId` under a Claude config dir, or null.
 * The project slug is Claude Code's spelling of the cwd, so it is searched
 * for rather than rebuilt.
 */
export async function findClaudeTranscript(
  configDir: string,
  sessionId: string,
): Promise<string | null> {
  const projects = join(configDir, "projects");
  try {
    for await (const dir of Deno.readDir(projects)) {
      if (!dir.isDirectory) continue;
      const path = join(projects, dir.name, `${sessionId}.jsonl`);
      try {
        await Deno.lstat(path);
        return path;
      } catch { /* not this project */ }
    }
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
  }
  return null;
}
