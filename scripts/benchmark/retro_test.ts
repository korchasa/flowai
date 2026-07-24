import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { assertStringIncludes } from "@std/assert";
import { classifyReport, renderRetroMarkdown, scanRun } from "./retro.ts";

type Tests = {
  f2pPass?: string[];
  f2pFail?: string[];
  p2pPass?: string[];
  p2pFail?: string[];
};

/** Build a swebench per-instance report object in its on-disk shape. */
function report(
  id: string,
  over: Record<string, unknown> = {},
  tests?: Tests,
): Record<string, unknown> {
  const rec: Record<string, unknown> = {
    patch_is_None: false,
    patch_exists: true,
    patch_successfully_applied: true,
    resolved: false,
    ...over,
  };
  if (tests) {
    rec.tests_status = {
      FAIL_TO_PASS: {
        success: tests.f2pPass ?? [],
        failure: tests.f2pFail ?? [],
      },
      PASS_TO_PASS: {
        success: tests.p2pPass ?? [],
        failure: tests.p2pFail ?? [],
      },
    };
  }
  return { [id]: rec };
}

Deno.test("classifyReport: clean = F2P all pass ∧ P2P no failures", () => {
  const g = classifyReport(
    "r1",
    "flowai",
    "i1",
    report("i1", { resolved: true }, { f2pPass: ["a", "b"], p2pPass: ["c"] }),
  );
  assertEquals(g.klass, "clean");
  assertEquals(g.solved, true);
  assertEquals(g.noRegression, true);
  assertEquals(g.f2pPass, 2);
  assertEquals(g.p2pFail, 0);
  assertEquals(g.resolvedMismatch, false);
});

Deno.test("classifyReport: solved-broke = F2P pass but P2P failures", () => {
  const g = classifyReport(
    "r1",
    "flowai",
    "i1",
    report("i1", {}, { f2pPass: ["a"], p2pPass: ["c"], p2pFail: ["t1", "t2"] }),
  );
  assertEquals(g.klass, "solved-broke");
  assertEquals(g.solved, true);
  assertEquals(g.noRegression, false);
  assertEquals(g.p2pFailedTests, ["t1", "t2"]);
});

Deno.test("classifyReport: unsolved when F2P failures remain (P2P counted anyway)", () => {
  const g = classifyReport(
    "r1",
    "baseline",
    "i1",
    report("i1", {}, { f2pPass: ["a"], f2pFail: ["b"], p2pFail: ["t"] }),
  );
  assertEquals(g.klass, "unsolved");
  assertEquals(g.solved, false);
  assertEquals(g.p2pFail, 1);
});

Deno.test("classifyReport: no-patch (patch_is_None or !patch_exists)", () => {
  const a = classifyReport(
    "r",
    "flowai",
    "i",
    report("i", { patch_is_None: true }),
  );
  assertEquals(a.klass, "no-patch");
  const b = classifyReport(
    "r",
    "flowai",
    "i",
    report("i", { patch_exists: false }),
  );
  assertEquals(b.klass, "no-patch");
});

Deno.test("classifyReport: apply-failed", () => {
  const g = classifyReport(
    "r",
    "flowai",
    "i",
    report("i", { patch_successfully_applied: false }),
  );
  assertEquals(g.klass, "apply-failed");
});

Deno.test("classifyReport: ungraded when tests_status absent or F2P empty", () => {
  const a = classifyReport("r", "flowai", "i", report("i"));
  assertEquals(a.klass, "ungraded");
  const b = classifyReport(
    "r",
    "flowai",
    "i",
    report("i", {}, { p2pPass: ["x"] }),
  );
  assertEquals(b.klass, "ungraded");
});

Deno.test("classifyReport: flags mismatch between derived clean and swebench resolved", () => {
  // Derived clean but swebench says unresolved → mismatch (and vice versa).
  const a = classifyReport(
    "r",
    "flowai",
    "i",
    report("i", { resolved: false }, { f2pPass: ["a"], p2pPass: ["b"] }),
  );
  assertEquals(a.resolvedMismatch, true);
  const b = classifyReport(
    "r",
    "flowai",
    "i",
    report("i", { resolved: true }, { f2pFail: ["a"] }),
  );
  assertEquals(b.resolvedMismatch, true);
});

Deno.test("classifyReport: missing instance key fails fast", () => {
  assertThrows(
    () => classifyReport("r", "flowai", "other", report("i")),
    Error,
    "other",
  );
});

Deno.test("scanRun: walks <run>/<arm>/<instance>/report.json", async () => {
  const root = await Deno.makeTempDir();
  try {
    const mk = async (
      arm: string,
      id: string,
      json: Record<string, unknown>,
    ) => {
      const dir = `${root}/runX/${arm}/${id}`;
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(`${dir}/report.json`, JSON.stringify(json));
    };
    await mk(
      "flowai",
      "i1",
      report("i1", { resolved: true }, { f2pPass: ["a"] }),
    );
    await mk("baseline", "i2", report("i2", {}, { f2pFail: ["a"] }));
    const grades = await scanRun(root, "runX");
    assertEquals(grades.length, 2);
    assertEquals(grades.map((g) => g.arm).sort(), ["baseline", "flowai"]);
    assertEquals(grades.find((g) => g.arm === "flowai")!.klass, "clean");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("scanRun: missing run dir fails fast", async () => {
  const root = await Deno.makeTempDir();
  try {
    await assertRejects(() => scanRun(root, "absent"), Error, "absent");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("renderRetroMarkdown: per-arm class counts, solved-broke tests, mismatches", () => {
  const grades = [
    classifyReport(
      "r1",
      "flowai",
      "i1",
      report("i1", { resolved: true }, { f2pPass: ["a"], p2pPass: ["b"] }),
    ),
    classifyReport(
      "r1",
      "flowai",
      "i2",
      report("i2", {}, { f2pPass: ["a"], p2pFail: ["broken_test"] }),
    ),
    classifyReport(
      "r2",
      "baseline",
      "i1",
      report("i1", {}, { f2pFail: ["a"] }),
    ),
    classifyReport(
      "r2",
      "baseline",
      "i3",
      report("i3", { resolved: false }, { f2pPass: ["a"], p2pPass: ["b"] }),
    ),
  ];
  const md = renderRetroMarkdown(grades, { title: "flowai3 retro" });
  assertStringIncludes(md, "flowai3 retro");
  assertStringIncludes(md, "clean 1");
  assertStringIncludes(md, "solved-broke 1");
  assertStringIncludes(md, "`i2`");
  assertStringIncludes(md, "broken_test");
  // i3: derived clean but resolved=false → surfaced loudly.
  assertStringIncludes(md, "mismatch");
  assertStringIncludes(md, "`i3`");
});
