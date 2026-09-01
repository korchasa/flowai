import { assert, assertEquals } from "@std/assert";
import { buildJudgeRequest } from "./judge.ts";

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
