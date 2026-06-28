import { assert, assertEquals } from "@std/assert";
import {
  baselineTask,
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

Deno.test("planTurn: planner-only gate — carries the issue, forbids source edits, stops for a human decision", () => {
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
  // Variant A: the gate. Plan must NOT code, and must stop for the human.
  assert(/do not modify/i.test(t), "must forbid source/test edits in planning");
  assert(/variant/i.test(t), "must ask for variants");
  assert(
    /stop|wait/i.test(t),
    "must stop and wait for the human's decision",
  );
  // The plan turn must NOT carry the autonomy line that nullifies the gate.
  assert(
    !/never stop to ask/i.test(t),
    "plan turn must not tell the agent to never stop (collapses the gate)",
  );
});

Deno.test("implementTurn / reviewTurn: separate follow-up commands", () => {
  assert(implementTurn().startsWith("/implement"));
  assert(reviewTurn().startsWith("/review"));
});

Deno.test("baseTask: neutral shared framing — repo + issue + no-commit, NO autonomy line", () => {
  const b = baseTask("psf/requests", "Some bug");
  assert(b.includes("psf/requests"));
  assert(b.includes("Some bug"));
  assert(/commit/i.test(b), "must forbid commit/push");
  // Autonomy wording is arm-specific now; it must not live in the shared base.
  assert(
    !/never stop to ask/i.test(b),
    "base framing must stay neutral (no autonomy line)",
  );
});

Deno.test("baselineTask: single-shot arm keeps the full-autonomy wording", () => {
  const b = baselineTask("psf/requests", "Some bug");
  assert(b.includes("psf/requests"));
  assert(b.includes("Some bug"));
  assert(/never stop to ask/i.test(b), "baseline must instruct full autonomy");
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
