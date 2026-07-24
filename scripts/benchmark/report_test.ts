import { assertEquals, assertStringIncludes } from "@std/assert";
import { aggregateAB, renderMarkdownAB, type ReportMeta } from "./report.ts";
import type { Candidate } from "./select.ts";

const POOL: Candidate[] = [
  {
    instanceId: "p1",
    repo: "django/django",
    difficulty: "<15 min fix",
    patchBytes: 100,
    f2p: 1,
  },
  {
    instanceId: "p2",
    repo: "sympy/sympy",
    difficulty: "<15 min fix",
    patchBytes: 200,
    f2p: 1,
  },
  {
    instanceId: "p3",
    repo: "django/django",
    difficulty: "15 min - 1 hour",
    patchBytes: 300,
    f2p: 1,
  },
  {
    instanceId: "p4",
    repo: "sphinx-doc/sphinx",
    difficulty: "1-4 hours",
    patchBytes: 400,
    f2p: 1,
  },
];

const META: ReportMeta = {
  date: "2026-06-21",
  model: "sonnet",
  dataset: "princeton-nlp/SWE-bench_Verified",
};

Deno.test("aggregateAB: baseline counts and flowai wins over baseline-failures", () => {
  // baseline resolved p1 only; flowai attempted the 3 failures (p2,p3,p4),
  // resolved p2 and p3.
  const rep = aggregateAB(POOL, ["p1"], ["p2", "p3"], ["p2", "p3", "p4"]);
  assertEquals(rep.poolTotal, 4);
  assertEquals(rep.baselineResolved, 1);
  assertEquals(rep.baselineFailed, 3);
  assertEquals(rep.flowaiAttempted, 3);
  assertEquals(rep.flowaiWins, ["p2", "p3"]);
  assertEquals(rep.regressions, []);
});

Deno.test("aggregateAB: a flowai pass on a baseline-pass is NOT a win", () => {
  // flowai resolved p1 too, but baseline already passed it → not a unique win.
  const rep = aggregateAB(POOL, ["p1"], ["p1", "p2"], ["p1", "p2", "p3", "p4"]);
  assertEquals(rep.flowaiWins, ["p2"]);
});

Deno.test("aggregateAB: regression = baseline pass, flowai attempted+fail", () => {
  const rep = aggregateAB(POOL, ["p1"], [], ["p1", "p2"]);
  assertEquals(rep.regressions, ["p1"]);
  assertEquals(rep.flowaiWins, []);
});

Deno.test("aggregateAB: un-attempted flowai instances show no flowai data", () => {
  const rep = aggregateAB(POOL, ["p1"], [], []);
  assertEquals(rep.flowaiAttempted, 0);
  const p2 = rep.rows.find((r) => r.instanceId === "p2")!;
  assertEquals(p2.flowaiAttempted, false);
});

Deno.test("renderMarkdownAB: shows headline, per-instance marks, wins", () => {
  const rep = aggregateAB(POOL, ["p1"], ["p2", "p3"], ["p2", "p3", "p4"]);
  const md = renderMarkdownAB(rep, META);
  assertStringIncludes(md, "flowai vs pure Claude Code");
  assertStringIncludes(md, "resolved 1/4");
  assertStringIncludes(md, "2 resolved");
  assertStringIncludes(md, "`p2`");
  assertStringIncludes(md, "isolates flowai");
  assertStringIncludes(md, "—"); // p1 flowai not attempted
});

Deno.test("renderMarkdownAB: no wins renders empty placeholder", () => {
  const rep = aggregateAB(POOL, ["p1"], [], ["p2", "p3", "p4"]);
  const md = renderMarkdownAB(rep, META);
  assertStringIncludes(md, "_None yet._");
});

Deno.test("renderMarkdownAB: cost section renders per-arm totals when present", () => {
  const rep = aggregateAB(POOL, ["p1"], [], []);
  const md = renderMarkdownAB(rep, META, {
    baseline: {
      instances: 2,
      wallClockMs: 120_000,
      apiCalls: 40,
      inputTokens: 1_500_000,
      outputTokens: 30_000,
      cacheReadTokens: 900_000,
      cacheCreationTokens: 10_000,
      toolCalls: 55,
      parseErrors: 0,
    },
  });
  assertStringIncludes(md, "Cost (informative");
  assertStringIncludes(md, "never a quality criterion");
  assertStringIncludes(md, "baseline");
  assertStringIncludes(md, "2 instance");
  assertStringIncludes(md, "40");
});

Deno.test("renderMarkdownAB: no cost section without metrics", () => {
  const rep = aggregateAB(POOL, ["p1"], [], []);
  const md = renderMarkdownAB(rep, META);
  assertEquals(md.includes("Cost (informative"), false);
});

Deno.test("renderMarkdownAB: web-access section lists totals and flagged accesses", () => {
  const rep = aggregateAB(POOL, ["p1"], [], []);
  const md = renderMarkdownAB(rep, META, undefined, {
    baseline: [
      {
        instanceId: "p1",
        repo: "django/django",
        transcriptFiles: 2,
        parseErrors: 0,
        accesses: [
          {
            tool: "WebSearch",
            target: "django 16454 fix",
            flagged: true,
          },
          {
            tool: "WebFetch",
            target: "https://docs.djangoproject.com/",
            flagged: false,
          },
        ],
        flaggedCount: 1,
      },
    ],
  });
  assertStringIncludes(md, "Web access");
  assertStringIncludes(md, "never banned");
  assertStringIncludes(md, "2 access(es)");
  assertStringIncludes(md, "1 flagged");
  assertStringIncludes(md, "django 16454 fix");
  assertEquals(
    md.includes("docs.djangoproject.com"),
    false,
    "unflagged accesses are totalled, not listed",
  );
});

Deno.test("renderMarkdownAB: no web-access section without audits", () => {
  const rep = aggregateAB(POOL, ["p1"], [], []);
  const md = renderMarkdownAB(rep, META);
  assertEquals(md.includes("Web access"), false);
});
