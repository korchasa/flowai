import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  AnswerEmulatorOperator,
  answerMessages,
  DONE_TOKEN,
  FlowaiOperator,
  implementTurnWithVerdict,
  operatorMessages,
  parseOperatorDecision,
} from "./human_emulator.ts";
import { replanTurn, reviewTurn } from "./operator.ts";

const AUTHORIZE = "DECISION: AUTHORIZE\nGo ahead with Variant 2.";
const REJECT = [
  "DECISION: REPLAN",
  "This isn't a plan — no variants were presented for the issue itself.",
].join("\n");
const REVIEW = "DECISION: REVIEW\nReview your diff against the issue.";

const ISSUE =
  "Fixed offset timezones lose their offset name in _get_timezone_name.";
const PLAN = [
  "## Stated outcomes",
  "1. offset name preserved",
  "### Variant 1 — patch _get_timezone_name (recommended)",
  "### Variant 2 — patch callers",
].join("\n");

Deno.test("operatorMessages: carries the issue and the plan output, no gold fields", () => {
  const msgs = operatorMessages(ISSUE, PLAN);
  const all = msgs.map((m) => m.content).join("\n");
  assert(all.includes(ISSUE), "must carry the issue verbatim");
  assert(all.includes(PLAN), "must carry the plan output verbatim");
  // Honesty: the judge must never receive grading data.
  assert(!/gold|FAIL_TO_PASS|test_patch/i.test(all), "no gold-data leakage");
  const system = msgs.find((m) => m.role === "system");
  assert(system, "must have a system message");
  // Human duties, not solver duties.
  assert(
    /miss|cover|omit/i.test(system!.content),
    "the human must check outcome coverage against the issue",
  );
  assert(
    /variant/i.test(system!.content),
    "the human must authorize a variant",
  );
  assert(
    /do not (write|include) code|no code/i.test(system!.content),
    "the human must not write code",
  );
  // The human cannot see the diff, so assessing the finished work is not theirs
  // to do — they hand the review task to the engineer and step out.
  assert(
    /do NOT check the engineer's work/.test(system!.content),
    "the human must not assess the implementation",
  );
  // The bench agent works in English; user-level language memory must not leak
  // into the gate turn (observed: judge replied in Russian without this).
  assert(
    /in English/.test(system!.content),
    "verdict language pinned to English",
  );
  // The reply drives which turn the agent gets next, so the decision must be
  // stated in a form the harness can read.
  assert(/DECISION:/.test(system!.content), "the reply must carry a decision");
  for (const d of ["AUTHORIZE", "REPLAN", "REVIEW", "ANSWER", "DONE"]) {
    assert(
      system!.content.includes(d),
      `the prompt must offer the ${d} decision the parser accepts`,
    );
  }
});

Deno.test("implementTurnWithVerdict: /implement turn embeds the verdict and keeps the no-commit framing", () => {
  const t = implementTurnWithVerdict("Go ahead with Variant 1. Also cover X.");
  assert(
    t.startsWith("/implement "),
    `expected /implement turn, got: ${t.slice(0, 20)}`,
  );
  assert(t.includes("Go ahead with Variant 1. Also cover X."));
  assert(/do not commit or push/i.test(t), "must keep the no-commit rule");
  assert(/TDD|red/i.test(t), "must keep the TDD framing");
});

/**
 * The human's moves must be machine-readable, because they lead to DIFFERENT
 * turns. Without a decision token the harness sent every reply —
 * authorization and rejection alike — as the `implement` turn, so a rejected
 * plan silently consumed the implementation step (four of eleven logged sessions
 * of the first flowai campaign; three of them produced no patch at all).
 */
Deno.test("parseOperatorDecision: separates the decision from the message it carries", () => {
  const ok = parseOperatorDecision(AUTHORIZE);
  assertEquals(ok.decision, "authorize");
  assertEquals(ok.message, "Go ahead with Variant 2.");
  assert(
    !/DECISION/i.test(ok.message),
    "the token is protocol, not part of what the engineer reads",
  );

  const no = parseOperatorDecision(REJECT);
  assertEquals(no.decision, "replan");
  assert(no.message.startsWith("This isn't a plan"));

  // The emulator is an LLM: accept its formatting habits, not just one spelling.
  assertEquals(
    parseOperatorDecision("**DECISION: authorize**\n\nGo ahead with variant 1.")
      .decision,
    "authorize",
  );

  // Measured on the smoke run of 2026-07-28: the emulator copied the system
  // prompt's example line, gloss and all, onto the decision line. Requiring the
  // line to END at the decision word failed the instance over punctuation.
  const glossed = parseOperatorDecision(
    "DECISION: AUTHORIZE — go ahead with variant 2, and also cover the naive case.",
  );
  assertEquals(glossed.decision, "authorize");
  assertEquals(
    glossed.message,
    "go ahead with variant 2, and also cover the naive case.",
    "text riding on the decision line is the message, not protocol to discard",
  );

  // No token, or an unknown one, is a protocol breach — never guessed at.
  assertThrows(
    () => parseOperatorDecision("Go ahead with Variant 2."),
    Error,
    "DECISION",
  );
  assertThrows(
    () => parseOperatorDecision("DECISION: MAYBE\nnot sure"),
    Error,
    "DECISION",
  );
  // A decision with nothing said to the engineer is useless.
  assertThrows(
    () => parseOperatorDecision("DECISION: REPLAN"),
    Error,
    "said nothing",
  );
});

/**
 * A rejected plan must cost its OWN turn, not the implementation turn: the
 * engineer re-plans, the human looks again, and only then does implementation
 * start. One re-plan is allowed; a human who still objects afterwards sends
 * the objection along with the implement turn rather than starving the session.
 */
Deno.test("FlowaiOperator: a rejected plan buys a re-plan turn, not a lost implement turn", async () => {
  const replies = [REJECT, AUTHORIZE, REVIEW];
  let n = 0;
  const op = new FlowaiOperator(ISSUE, () => {
    return Promise.resolve(replies[n++]);
  });
  const messages = [{ role: "assistant", content: PLAN }];

  const first = await op.getResponse(messages);
  assertEquals(
    first,
    replanTurn(
      "This isn't a plan — no variants were presented for the issue itself.",
    ),
    "a rejection re-invokes the planner, carrying the human's objection",
  );

  const second = await op.getResponse(messages);
  assert(
    second!.startsWith("/implement "),
    "the second look authorizes and implementation finally starts",
  );
  assert(second!.includes("Go ahead with Variant 2."));

  assertEquals(
    await op.getResponse(messages),
    reviewTurn("Review your diff against the issue."),
    "the review task is handed over in the human's own words",
  );
  assertEquals(await op.getResponse(messages), null);
  assertEquals(n, 3, "every turn is authored by the emulator, none replayed");
});

Deno.test("FlowaiOperator: the re-plan budget is one — a second rejection still starts work", async () => {
  const op = new FlowaiOperator(ISSUE, () => Promise.resolve(REJECT));
  const messages = [{ role: "assistant", content: PLAN }];

  assert((await op.getResponse(messages))!.startsWith("/plan "));
  const second = await op.getResponse(messages);
  assert(
    second!.startsWith("/implement "),
    "the session must not spend every turn re-planning",
  );
  assert(
    second!.includes("This isn't a plan"),
    "the standing objection travels with the implement turn",
  );
});

Deno.test("FlowaiOperator: reacts to the LAST assistant message", async () => {
  const seen: Array<{ issue: string; output: string }> = [];
  const op = new FlowaiOperator(ISSUE, (issue, output) => {
    seen.push({ issue, output });
    return Promise.resolve(
      "DECISION: AUTHORIZE\nGo ahead with Variant 2 — it matches the root cause.",
    );
  });
  const messages = [
    { role: "user", content: "/plan ..." },
    { role: "assistant", content: "intermediate noise" },
    { role: "user", content: "(tool result)" },
    { role: "assistant", content: PLAN },
  ];
  const first = await op.getResponse(messages);
  assertEquals(seen.length, 1);
  assertEquals(seen[0].issue, ISSUE);
  assertEquals(
    seen[0].output,
    PLAN,
    "the human must react to the LAST assistant message",
  );
  assert(first!.startsWith("/implement "));
  assert(first!.includes("Go ahead with Variant 2"));
});

/**
 * The human never assesses the work (user decision 2026-07-28). Handing over the
 * review task is the last thing they say: the engineer answers it and the session
 * ends, WITHOUT the emulator being asked to look at a diff it cannot see.
 */
Deno.test("FlowaiOperator: the session ends on the answer to the review turn, emulator not consulted again", async () => {
  let calls = 0;
  const op = new FlowaiOperator(ISSUE, () => {
    calls++;
    return Promise.resolve(REVIEW);
  });
  const messages = [{ role: "assistant", content: "Implementation is in." }];

  const turn = await op.getResponse(messages);
  assert(turn!.startsWith("/review "), `expected a review turn, got: ${turn}`);
  assert(turn!.includes("Review your diff against the issue."));

  assertEquals(
    await op.getResponse([
      ...messages,
      { role: "assistant", content: "Reviewed; fixed two gaps." },
    ]),
    null,
    "no one sits in judgement over the review answer",
  );
  assertEquals(calls, 1, "the emulator is not asked to assess the result");
});

Deno.test("FlowaiOperator: an ANSWER is a plain turn, a DONE ends the session", async () => {
  const answer = new FlowaiOperator(
    ISSUE,
    () =>
      Promise.resolve(
        "DECISION: ANSWER\nInstall the toolchain yourself and continue; nobody else will.",
      ),
  );
  const reply = await answer.getResponse([{
    role: "assistant",
    content: "Rust toolchain is not configured. How should I proceed?",
  }]);
  assertEquals(
    reply,
    "Install the toolchain yourself and continue; nobody else will.",
    "a plain answer carries no command at all",
  );

  const done = new FlowaiOperator(
    ISSUE,
    () => Promise.resolve("DECISION: DONE"),
  );
  assertEquals(
    await done.getResponse([{
      role: "assistant",
      content: "Fix is in place.",
    }]),
    null,
  );
});

Deno.test("FlowaiOperator: emulator failure rejects (fail fast, no silent rubber stamp)", async () => {
  const op = new FlowaiOperator(
    ISSUE,
    () => Promise.reject(new Error("cli down")),
  );
  await assertRejects(
    () => op.getResponse([{ role: "assistant", content: PLAN }]),
    Error,
    "cli down",
  );
});

Deno.test("FlowaiOperator: blank reply rejects", async () => {
  const op = new FlowaiOperator(ISSUE, () => Promise.resolve("   \n"));
  await assertRejects(
    () => op.getResponse([{ role: "assistant", content: PLAN }]),
    Error,
    "blank",
  );
});

Deno.test("FlowaiOperator: no assistant message yet rejects (contract violation)", async () => {
  const op = new FlowaiOperator(ISSUE, () => Promise.resolve("ok"));
  await assertRejects(
    () => op.getResponse([{ role: "user", content: "/plan ..." }]),
    Error,
    "assistant",
  );
});

// --- FR-BENCH-SWE.SYMMETRY: the same judge answers questions in the bare arm ---

const QUESTION =
  "Should I also handle the legacy offset format, or only the tz name path?";

Deno.test("answerMessages: issue + agent message, no gold, DONE protocol, English", () => {
  const msgs = answerMessages(ISSUE, QUESTION);
  const all = msgs.map((m) => m.content).join("\n");
  assert(all.includes(ISSUE), "must carry the issue verbatim");
  assert(all.includes(QUESTION), "must carry the agent's message verbatim");
  assert(!/gold|FAIL_TO_PASS|test_patch/i.test(all), "no gold-data leakage");
  const system = msgs.find((m) => m.role === "system")!;
  assert(
    /only|nothing beyond/i.test(system.content),
    "judge's knowledge must be pinned to the issue text",
  );
  assert(
    system.content.includes(DONE_TOKEN),
    "system prompt must define the terminal token",
  );
  assert(/in English/.test(system.content), "reply language pinned to English");
  assert(
    /do not (write|include) code|no code/i.test(system.content),
    "judge must not write code",
  );
});

Deno.test("AnswerEmulatorOperator: returns the judge's answer as a plain next turn", async () => {
  const seen: string[] = [];
  const op = new AnswerEmulatorOperator(ISSUE, (_issue, msg) => {
    seen.push(msg);
    return Promise.resolve(
      "Only the tz name path — the issue names nothing else; legacy is your call.",
    );
  });
  const reply = await op.getResponse([
    { role: "user", content: "fix the bug" },
    { role: "assistant", content: QUESTION },
  ]);
  assertEquals(seen, [QUESTION], "judge must receive the LAST agent message");
  assert(reply!.includes("your call"));
  assert(
    !reply!.startsWith("/"),
    "baseline turns are plain text, not slash commands",
  );
});

Deno.test("AnswerEmulatorOperator: DONE token ends the session", async () => {
  const op = new AnswerEmulatorOperator(
    ISSUE,
    () => Promise.resolve(`  ${DONE_TOKEN}\n`),
  );
  assertEquals(
    await op.getResponse([{ role: "assistant", content: "Fix is in place." }]),
    null,
  );
});

Deno.test("AnswerEmulatorOperator: blank reply rejects (fail fast)", async () => {
  const op = new AnswerEmulatorOperator(ISSUE, () => Promise.resolve(" \n"));
  await assertRejects(
    () => op.getResponse([{ role: "assistant", content: "done?" }]),
    Error,
    "blank",
  );
});

Deno.test("AnswerEmulatorOperator: judge failure rejects (no silent fallback)", async () => {
  const op = new AnswerEmulatorOperator(
    ISSUE,
    () => Promise.reject(new Error("cli down")),
  );
  await assertRejects(
    () => op.getResponse([{ role: "assistant", content: "q?" }]),
    Error,
    "cli down",
  );
});

Deno.test("AnswerEmulatorOperator: no assistant message rejects (contract violation)", async () => {
  const op = new AnswerEmulatorOperator(ISSUE, () => Promise.resolve("ok"));
  await assertRejects(
    () => op.getResponse([{ role: "user", content: "fix the bug" }]),
    Error,
    "assistant",
  );
});
