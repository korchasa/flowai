import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import {
  findClaudeTranscript,
  unansweredTaskNotifications,
} from "./claude_transcript.ts";

const jsonl = (...entries: Record<string, unknown>[]) =>
  entries.map((e) => JSON.stringify(e)).join("\n") + "\n";

const enqueue = { type: "queue-operation", operation: "enqueue" };
const dequeue = { type: "queue-operation", operation: "dequeue" };
const notice = { type: "user", origin: { kind: "task-notification" } };
const human = { type: "user", origin: { kind: "human" } };
const answer = (stop: string | null) => ({
  type: "assistant",
  message: { stop_reason: stop },
});

Deno.test("a user turn that is answered owes nothing", () => {
  assertEquals(
    unansweredTaskNotifications(
      jsonl(enqueue, dequeue, human, answer("tool_use"), answer("end_turn")),
    ),
    0,
  );
});

Deno.test("a notice is owed from its enqueue to its terminal answer", () => {
  // The order the sweep run wrote: the turn settled between these lines.
  const head = [enqueue, dequeue, human, answer("end_turn"), enqueue];
  assertEquals(unansweredTaskNotifications(jsonl(...head)), 1);
  assertEquals(
    unansweredTaskNotifications(jsonl(...head, answer("end_turn"))),
    1,
    "an answer to an earlier cycle does not consume a notice still queued",
  );
  const picked = [...head, dequeue, notice];
  assertEquals(unansweredTaskNotifications(jsonl(...picked)), 1);
  assertEquals(
    unansweredTaskNotifications(jsonl(...picked, answer("tool_use"))),
    1,
  );
  assertEquals(unansweredTaskNotifications(jsonl(...picked, answer(null))), 1);
  assertEquals(
    unansweredTaskNotifications(jsonl(...picked, answer("end_turn"))),
    0,
  );
});

Deno.test("one answer settles notices queued together, and remove drops one", () => {
  assertEquals(
    unansweredTaskNotifications(
      jsonl(
        enqueue,
        enqueue,
        dequeue,
        dequeue,
        notice,
        notice,
        answer("end_turn"),
      ),
    ),
    0,
  );
  assertEquals(
    unansweredTaskNotifications(
      jsonl(enqueue, { type: "queue-operation", operation: "remove" }),
    ),
    0,
  );
});

Deno.test("a half-written last line is skipped", () => {
  const text = jsonl(enqueue, dequeue, notice) + '{"type":"assis';
  assertEquals(unansweredTaskNotifications(text), 1);
});

Deno.test("the transcript is found under any project slug", async () => {
  const config = await Deno.makeTempDir({ prefix: "claude-config-" });
  assertEquals(await findClaudeTranscript(config, "s1"), null);
  const dir = join(config, "projects", "-private-tmp-sandbox");
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(join(dir, "s1.jsonl"), "");
  assertEquals(await findClaudeTranscript(config, "s1"), join(dir, "s1.jsonl"));
  assertEquals(await findClaudeTranscript(config, "s2"), null);
});
