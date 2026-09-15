import { assert, assertEquals } from "@std/assert";
import { buildJudgeRequest, evaluateChecklist } from "./judge.ts";
import type { codexChatCompletion } from "./llm.ts";

const checklist = [
  { id: "a1", description: "did X", critical: true },
  { id: "b2", description: "did Y", critical: false },
];

Deno.test("buildJudgeRequest: the evidence rides inside the system message — codex has no append-file channel", () => {
  const req = buildJudgeRequest(
    "fix the bug",
    "[turn 1] > hi",
    "diff --git",
    checklist,
  );
  const system = req.messages.find((m) => m.role === "system");
  assert(system, "a system message carries the auditor persona");
  assert(system.content.includes("<evidence>"), "evidence block folded in");
  assert(
    system.content.includes("fix the bug"),
    "user query is part of the evidence",
  );
  assert(
    system.content.includes("[turn 1] > hi"),
    "agent transcript is part of the evidence",
  );
  assert(
    system.content.includes("diff --git"),
    "file diffs are part of the evidence",
  );
  assertEquals(req.evidenceContent.includes("<evidence>"), true);
});

Deno.test("buildJudgeRequest: the user turn lists the checklist and the schema requires every id", () => {
  const req = buildJudgeRequest("q", "logs", "diffs", checklist);
  const user = req.messages.find((m) => m.role === "user");
  assert(
    user && user.content.includes('"a1"') && user.content.includes('"b2"'),
  );
  assertEquals(req.jsonSchema.required, ["a1", "b2"]);
  const props = req.jsonSchema.properties as Record<
    string,
    { required: string[] }
  >;
  assertEquals(props.a1.required, ["pass", "reason"]);
});

Deno.test("buildJudgeRequest: reasons are demanded in English so verdicts read the same across models", () => {
  const req = buildJudgeRequest("q", "logs", "diffs", checklist);
  const system = req.messages.find((m) => m.role === "system")!;
  assert(/in English/i.test(system.content));
});

Deno.test("evaluateChecklist: the judge reports what its own turn cost", async () => {
  const runDir = await Deno.makeTempDir({ prefix: "judge-usage-" });
  try {
    const client = () =>
      Promise.resolve({
        content: JSON.stringify({
          a1: { pass: true, reason: "ok" },
          b2: { pass: true, reason: "ok" },
        }),
        usage: {
          freshInput: 11,
          cachedInput: 22,
          cacheWrite: 0,
          output: 3,
          reasoning: 1,
          total: 37,
        },
      });
    const out = await evaluateChecklist(
      "q",
      "logs",
      "diffs",
      checklist,
      { model: "m", temperature: 0 },
      runDir,
      client as unknown as typeof codexChatCompletion,
    );
    assertEquals(out.usage.total, 37);
    assertEquals(out.usage.cachedInput, 22);
  } finally {
    await Deno.remove(runDir, { recursive: true });
  }
});

Deno.test("evaluateChecklist: a judge that never answered reports zero, not a guess", async () => {
  const runDir = await Deno.makeTempDir({ prefix: "judge-usage-" });
  try {
    const client = () => Promise.reject(new Error("boom"));
    const out = await evaluateChecklist(
      "q",
      "logs",
      "diffs",
      checklist,
      { model: "m", temperature: 0 },
      runDir,
      client as unknown as typeof codexChatCompletion,
    );
    assertEquals(out.usage.total, 0);
    assertEquals(out.results.a1.pass, false);
  } finally {
    await Deno.remove(runDir, { recursive: true });
  }
});
