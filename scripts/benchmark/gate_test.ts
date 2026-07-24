import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  BaselineJudgeOperator,
  DONE_TOKEN,
  implementTurnWithVerdict,
  judgeAnswerMessages,
  judgeGateMessages,
  JudgeGateOperator,
} from "./gate.ts";
import { reviewTurn } from "./operator.ts";

const ISSUE =
  "Fixed offset timezones lose their offset name in _get_timezone_name.";
const PLAN = [
  "## Stated outcomes",
  "1. offset name preserved",
  "### Variant 1 — patch _get_timezone_name (recommended)",
  "### Variant 2 — patch callers",
].join("\n");

Deno.test("judgeGateMessages: carries the issue and the plan output, no gold fields", () => {
  const msgs = judgeGateMessages(ISSUE, PLAN);
  const all = msgs.map((m) => m.content).join("\n");
  assert(all.includes(ISSUE), "must carry the issue verbatim");
  assert(all.includes(PLAN), "must carry the plan output verbatim");
  // Honesty: the judge must never receive grading data.
  assert(!/gold|FAIL_TO_PASS|test_patch/i.test(all), "no gold-data leakage");
  const system = msgs.find((m) => m.role === "system");
  assert(system, "must have a system message");
  // Reviewer duties, not solver duties.
  assert(/review/i.test(system!.content), "system prompt frames a reviewer");
  assert(
    /miss|cover|omit/i.test(system!.content),
    "reviewer must check outcome coverage against the issue",
  );
  assert(
    /variant/i.test(system!.content),
    "reviewer must authorize a variant",
  );
  assert(
    /do not (write|include) code|no code/i.test(system!.content),
    "reviewer must not write code",
  );
  // The bench agent works in English; user-level language memory must not leak
  // into the gate turn (observed: judge replied in Russian without this).
  assert(
    /in English/.test(system!.content),
    "verdict language pinned to English",
  );
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

Deno.test("JudgeGateOperator: judges the LAST assistant message, then review turn, then null", async () => {
  const seen: Array<{ issue: string; plan: string }> = [];
  const op = new JudgeGateOperator(ISSUE, (issue, plan) => {
    seen.push({ issue, plan });
    return Promise.resolve(
      "Go ahead with Variant 2 — it matches the root cause.",
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
    seen[0].plan,
    PLAN,
    "judge must receive the LAST assistant message",
  );
  assert(first!.startsWith("/implement "));
  assert(first!.includes("Go ahead with Variant 2"));

  const second = await op.getResponse(messages);
  assertEquals(second, reviewTurn());
  assertEquals(await op.getResponse(messages), null);
});

Deno.test("JudgeGateOperator: judge failure rejects (fail fast, no silent rubber stamp)", async () => {
  const op = new JudgeGateOperator(
    ISSUE,
    () => Promise.reject(new Error("cli down")),
  );
  await assertRejects(
    () => op.getResponse([{ role: "assistant", content: PLAN }]),
    Error,
    "cli down",
  );
});

Deno.test("JudgeGateOperator: blank verdict rejects", async () => {
  const op = new JudgeGateOperator(ISSUE, () => Promise.resolve("   \n"));
  await assertRejects(
    () => op.getResponse([{ role: "assistant", content: PLAN }]),
    Error,
    "blank",
  );
});

Deno.test("JudgeGateOperator: no assistant message yet rejects (contract violation)", async () => {
  const op = new JudgeGateOperator(ISSUE, () => Promise.resolve("ok"));
  await assertRejects(
    () => op.getResponse([{ role: "user", content: "/plan ..." }]),
    Error,
    "assistant",
  );
});

// --- FR-BENCH-SWE.SYMMETRY: the same judge answers questions in the bare arm ---

const QUESTION =
  "Should I also handle the legacy offset format, or only the tz name path?";

Deno.test("judgeAnswerMessages: issue + agent message, no gold, DONE protocol, English", () => {
  const msgs = judgeAnswerMessages(ISSUE, QUESTION);
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

Deno.test("BaselineJudgeOperator: returns the judge's answer as a plain next turn", async () => {
  const seen: string[] = [];
  const op = new BaselineJudgeOperator(ISSUE, (_issue, msg) => {
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

Deno.test("BaselineJudgeOperator: DONE token ends the session", async () => {
  const op = new BaselineJudgeOperator(
    ISSUE,
    () => Promise.resolve(`  ${DONE_TOKEN}\n`),
  );
  assertEquals(
    await op.getResponse([{ role: "assistant", content: "Fix is in place." }]),
    null,
  );
});

Deno.test("BaselineJudgeOperator: blank reply rejects (fail fast)", async () => {
  const op = new BaselineJudgeOperator(ISSUE, () => Promise.resolve(" \n"));
  await assertRejects(
    () => op.getResponse([{ role: "assistant", content: "done?" }]),
    Error,
    "blank",
  );
});

Deno.test("BaselineJudgeOperator: judge failure rejects (no silent fallback)", async () => {
  const op = new BaselineJudgeOperator(
    ISSUE,
    () => Promise.reject(new Error("cli down")),
  );
  await assertRejects(
    () => op.getResponse([{ role: "assistant", content: "q?" }]),
    Error,
    "cli down",
  );
});

Deno.test("BaselineJudgeOperator: no assistant message rejects (contract violation)", async () => {
  const op = new BaselineJudgeOperator(ISSUE, () => Promise.resolve("ok"));
  await assertRejects(
    () => op.getResponse([{ role: "user", content: "fix the bug" }]),
    Error,
    "assistant",
  );
});
