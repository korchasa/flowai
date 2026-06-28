import { assert, assertEquals } from "@std/assert";
import {
  baseTask,
  implementTurn,
  planTurn,
  reviewTurn,
  ScriptedOperator,
} from "./operator.ts";

Deno.test("ScriptedOperator: yields the fixed turn sequence then null, ignoring messages", async () => {
  const op = new ScriptedOperator(["/implement", "/review"]);
  // Content of the conversation must NOT affect the deterministic script.
  const msgs = [{ role: "assistant", content: "anything at all?" }];
  assertEquals(await op.getResponse(msgs), "/implement");
  assertEquals(await op.getResponse(msgs), "/review");
  assertEquals(await op.getResponse(msgs), null);
  assertEquals(await op.getResponse(msgs), null);
});

Deno.test("ScriptedOperator: empty script returns null immediately", async () => {
  const op = new ScriptedOperator([]);
  assertEquals(await op.getResponse([]), null);
});

Deno.test("planTurn: first turn is a /plan invocation carrying the issue, WITHOUT the implement/review sequence", () => {
  const issue = "Fixed offset timezones lose their offset name.";
  const t = planTurn("django/django", issue);
  assert(
    t.startsWith("/plan"),
    `expected leading /plan, got: ${t.slice(0, 20)}`,
  );
  assert(t.includes(issue), "must carry the issue text");
  // The full workflow sequence must NOT be pre-loaded into turn 1.
  assert(!/\/implement/.test(t), "turn 1 must not mention /implement");
  assert(!/\/review/.test(t), "turn 1 must not mention /review");
});

Deno.test("implementTurn / reviewTurn: separate follow-up commands", () => {
  assert(implementTurn().startsWith("/implement"));
  assert(reviewTurn().startsWith("/review"));
});

Deno.test("baseTask: shared issue framing carries repo + autonomy + no-commit", () => {
  const b = baseTask("psf/requests", "Some bug");
  assert(b.includes("psf/requests"));
  assert(b.includes("Some bug"));
  assert(/autonomous/i.test(b), "must instruct autonomy");
  assert(/commit/i.test(b), "must forbid commit/push");
});

/**
 * Faithful reproduction of the Claude Agent SDK slash-command name parser
 * (`cQ4`/`byY` in cli.js): the command name is everything from index 1 up to the
 * FIRST space, and must match `[A-Za-z0-9:_-]+` only. A turn whose name token
 * contains a newline (e.g. `/plan\n\n…`) fails to resolve and the skill never
 * fires. This test guards every operator turn against that regression.
 */
function sdkCommandName(turn: string): string {
  const q = turn.trim();
  if (!q.startsWith("/")) return "";
  return q.slice(1).split(" ")[0];
}
const isCleanCommandName = (name: string) => /^[A-Za-z0-9:_-]+$/.test(name);

Deno.test("operator turns resolve as slash commands: clean name token + space separator", () => {
  const turns = [
    planTurn("django/django", "Some multi\nline\nissue body"),
    implementTurn(),
    reviewTurn(),
  ];
  const expected = ["plan", "implement", "review"];
  turns.forEach((t, i) => {
    const name = sdkCommandName(t);
    assertEquals(name, expected[i], `turn ${i} command name`);
    assert(
      isCleanCommandName(name),
      `turn ${i} name "${name}" must be a clean SDK command token (no newline)`,
    );
    // The char right after the command name must be a space — the SDK splits on
    // it. A newline there is the exact bug this guards against.
    assert(
      t.charAt(name.length + 1) === " ",
      `turn ${i} must put a SPACE after /${name}, got ${
        JSON.stringify(t.charAt(name.length + 1))
      }`,
    );
  });
});
