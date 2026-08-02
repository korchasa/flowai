import { assert, assertEquals } from "@std/assert";
import {
  baselineTask,
  baseTask,
  commandPrefixFor,
  planTurn,
  replanTurn,
  reviewTurn,
  ScriptedOperator,
} from "./operator.ts";

/** The human's own words, which every follow-up turn now carries. */
const FEEDBACK = "Take another look at the diff against the issue.";
import { implementTurnWithVerdict } from "./human_emulator.ts";

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

/**
 * The command prefix is IDE-dependent, and getting it wrong silently disables
 * the whole flowai arm. Measured on the codex ACP bridge (2026-07-24): a
 * `/plan <args>` turn is REJECTED outright with `Command "/plan" requires no
 * arguments.` — the skill never runs. The documented codex form `$plan <args>`
 * does fire it (transcript: "I'm using the `plan` skill because you explicitly
 * requested `$plan`", followed by reading `.codex/skills/plan/SKILL.md`).
 * Claude keeps `/` — its Agent SDK parses the name up to the first space.
 */
Deno.test("commandPrefixFor: codex invokes skills with $, claude with /", () => {
  assertEquals(commandPrefixFor("codex"), "$");
  assertEquals(commandPrefixFor("claude"), "/");
  // Unknown IDEs keep the historical slash rather than guessing a new syntax.
  assertEquals(commandPrefixFor("cursor"), "/");
});

Deno.test("planTurn/reviewTurn: carry the IDE's prefix, args unchanged", () => {
  const issue = "Boom on empty input";
  const claudePlan = planTurn("django/django", issue);
  const codexPlan = planTurn("django/django", issue, "$");
  assert(claudePlan.startsWith("/plan "), "claude keeps the slash form");
  assert(codexPlan.startsWith("$plan "), "codex needs the dollar form");
  // Only the prefix differs — the arm's instructions must stay identical, or
  // the two IDEs would be measured on different prompts.
  assertEquals(codexPlan.slice(1), claudePlan.slice(1));

  assert(reviewTurn(FEEDBACK).startsWith("/review "));
  assert(reviewTurn(FEEDBACK, "$").startsWith("$review "));
  assertEquals(
    reviewTurn(FEEDBACK, "$").slice(1),
    reviewTurn(FEEDBACK).slice(1),
  );
});

Deno.test("reviewTurn: bounds the fix to the issue instead of inviting a wider diff", () => {
  const turn = reviewTurn(FEEDBACK);
  // Still a review that fixes what the issue actually requires.
  assert(
    /review/i.test(turn) && /fix/i.test(turn),
    "still asks to review and fix",
  );
  // The open invitation that produced the doubling is gone. Measured over three
  // reps: `review` edited code in 91% of sessions and twice turned a patch that
  // passed into one that did not — SWE-bench grades against a hidden suite, so a
  // change the issue never asked for can only cost P2P tests.
  assert(
    !/fix any gaps you find/i.test(turn),
    "the unbounded 'fix any gaps' invitation must be gone",
  );
  assert(
    /still pass|keep .*passing|currently pass/i.test(turn),
    "must say the repository's other tests have to keep passing",
  );
  assert(
    /nothing else|beyond what the issue|the issue does not ask/i.test(turn),
    "must forbid changes the issue does not ask for",
  );
  assert(/do not commit or push/i.test(turn), "no-commit rule survives");
});

Deno.test("follow-up turns: separate commands, each carrying the human's words", () => {
  assert(implementTurnWithVerdict("Go ahead.").startsWith("/implement"));
  const review = reviewTurn(FEEDBACK);
  assert(review.startsWith("/review"));
  assert(review.includes(FEEDBACK), "the human's words reach the engineer");
  // The old constant told the agent to "proceed without further questions"
  // while the seeded AGENTS.md tells it to STOP and ask on a broken
  // environment — the arm was issuing both instructions at once.
  assert(
    !/without further questions/i.test(review),
    "no canned no-questions line",
  );
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

Deno.test("baselineTask: symmetric human availability — reviewer reachable, no autonomy line", () => {
  const b = baselineTask("psf/requests", "Some bug");
  assert(b.includes("psf/requests"));
  assert(b.includes("Some bug"));
  // implements [FR-BENCH-SWE.SYMMETRY](../../documents/requirements.md#fr-bench-swe.symmetry-one-human-emulator-for-both-arms-equal-human-availability-ancfrbench-swe-symmetry):
  // the arms must share one human-availability policy; the old "make every
  // decision yourself and never stop to ask" line made baseline's conditions
  // differ beyond flowai itself.
  assert(
    !/never stop to ask/i.test(b),
    "autonomy line removed — equal human availability in both arms",
  );
  assert(
    /ask/i.test(b),
    "must tell the agent a reviewer is available for questions",
  );
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
    implementTurnWithVerdict(
      "Go ahead with Variant 1.\nAlso cover the edge case.",
    ),
    replanTurn("No variants were presented for the issue itself."),
    reviewTurn(FEEDBACK),
  ];
  const expected = ["plan", "implement", "plan", "review"];
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
