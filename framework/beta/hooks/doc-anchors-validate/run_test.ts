// Unit tests for the doc-anchors-validate Stop hook.
// [REF:fr:doc-anchors.hook | FR-DOC-ANCHORS.HOOK]
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  collectFiles,
  decide,
  findIssues,
  isSkippedPath,
  readSkipEnv,
} from "./run.ts";
import { join } from "@std/path";

async function git(cwd: string, ...args: string[]): Promise<void> {
  await new Deno.Command("git", { args, cwd, stdout: "null", stderr: "null" })
    .output();
}

Deno.test("reports-cross-file-dead-ref", () => {
  const issues = findIssues([
    { path: "a.md", content: "See [REF:fr:widget | Widget]." },
    { path: "b.md", content: "Unrelated [ANC:fr:gadget] anchor." },
  ]);
  assertEquals(issues.length, 1);
  assertEquals(issues[0].kind, "dead-ref");
  assertEquals(issues[0].file, "a.md");
  assertStringIncludes(issues[0].message, "fr:widget");
});

Deno.test("reports-duplicate-anchor", () => {
  const issues = findIssues([
    { path: "a.md", content: "[ANC:fr:dup] first" },
    { path: "b.md", content: "[ANC:fr:dup] second" },
  ]);
  assertEquals(issues.length, 1);
  assertEquals(issues[0].kind, "duplicate-anchor");
  assertStringIncludes(issues[0].message, "fr:dup");
});

Deno.test("settled-forward-ref-clean", () => {
  // Ref + its anchor both present (the multi-file edit settled within the turn).
  // No finding — this is the livelock-avoidance guarantee of variant B.
  const issues = findIssues([
    { path: "a.md", content: "Defines [ANC:fr:widget] here." },
    { path: "b.md", content: "Uses [REF:fr:widget] there." },
  ]);
  assertEquals(issues, []);
});

Deno.test("ignores-code-span-examples", () => {
  // Grammar shown as an example inside fenced / inline code must NOT be parsed
  // as a real ref, so it must not produce a dead-ref.
  const issues = findIssues([
    {
      path: "doc.md",
      content: [
        "Inline example: `[REF:fr:example]` is the grammar.",
        "```",
        "[REF:fr:fenced-example]",
        "```",
      ].join("\n"),
    },
  ]);
  assertEquals(issues, []);
});

Deno.test("no-salp-tokens-silent", () => {
  const issues = findIssues([
    { path: "a.md", content: "# Title\n\nPlain prose, no anchors." },
    { path: "b.ts", content: "export const x = 1;\n" },
  ]);
  assertEquals(issues, []);
});

Deno.test("reports-syntax-error-salp-short", () => {
  // salp-short (no namespace) is rejected by the grammar → a fixable finding.
  const issues = findIssues([
    { path: "a.md", content: "Bad [ANC:nonamespace] anchor." },
  ]);
  assertEquals(issues.length, 1);
  assertEquals(issues[0].kind, "syntax-error");
});

Deno.test("blocks-stop-with-findings-reason", () => {
  const issues = findIssues([
    { path: "a.md", content: "[REF:fr:missing]" },
  ]);
  const d = decide({ stop_hook_active: false }, issues);
  assertEquals(d.block, true);
  assert(typeof d.reason === "string" && d.reason.length > 0);
  assertStringIncludes(d.reason, "fr:missing");
  // The hook prescribes the fix METHOD: delegate the fix to a subagent, then
  // resume the primary task. It must NOT tell the agent to fix inline, nor to
  // stop after the fix (the main agent continues its primary task).
  const reason = d.reason ?? "";
  assertStringIncludes(reason, "subagent");
  assertStringIncludes(reason, "primary task");
  assert(
    !/then stop|stops cleanly|Fix them, then stop/i.test(reason),
    "block reason must not carry a stop directive",
  );
});

Deno.test("respects-stop-hook-active-guard", () => {
  // Anti-loop: if we are already continuing because of a prior Stop block,
  // do NOT block again — let the agent stop even with surviving findings.
  const issues = findIssues([
    { path: "a.md", content: "[REF:fr:missing]" },
  ]);
  const d = decide({ stop_hook_active: true }, issues);
  assertEquals(d.block, false);
});

Deno.test("no-findings-does-not-block", () => {
  const d = decide({ stop_hook_active: false }, []);
  assertEquals(d.block, false);
});

Deno.test("collectFiles-respects-gitignore", async () => {
  const dir = await Deno.makeTempDir({ prefix: "doc-anchors-gi-" });
  try {
    await git(dir, "init", "-q");
    await Deno.writeTextFile(join(dir, ".gitignore"), "ignored/\nbuild-out/\n");
    await Deno.mkdir(join(dir, "ignored"));
    await Deno.mkdir(join(dir, "build-out"));
    // Both ignored files carry a dead ref — must NOT be scanned.
    await Deno.writeTextFile(join(dir, "ignored", "x.md"), "[REF:fr:ghost]");
    await Deno.writeTextFile(join(dir, "build-out", "y.md"), "[REF:fr:ghoul]");
    // A non-ignored, freshly-created (untracked) file IS scanned.
    await Deno.writeTextFile(join(dir, "real.md"), "Clean prose, no anchors.");

    const files = await collectFiles(dir);
    const paths = files.map((f) => f.path);
    assert(
      !paths.some((p) => p.includes("/ignored/") || p.includes("/build-out/")),
      `gitignored files leaked into scan: ${paths.join(", ")}`,
    );
    assert(
      paths.some((p) => p.endsWith("/real.md")),
      "untracked non-ignored file must be scanned",
    );
    // The dead refs live only in ignored files → no findings.
    assertEquals(findIssues(files), []);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("collectFiles-non-git-repo-still-scans", async () => {
  const dir = await Deno.makeTempDir({ prefix: "doc-anchors-nogit-" });
  try {
    // No `git init` — fall back to the manual walk.
    await Deno.writeTextFile(join(dir, "a.md"), "Plain docs.");
    const files = await collectFiles(dir);
    assert(
      files.some((f) => f.path.endsWith("/a.md")),
      "non-git repo must still be scanned via fallback walk",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("isSkippedPath-honors-extra-substrings", () => {
  // Project-supplied skip folders (via FLOWAI_DOC_ANCHORS_SKIP) are matched as
  // plain path substrings, additive to the built-in patterns.
  assert(isSkippedPath("anchor-systems/fixtures/auth.md", ["fixtures"]));
  assert(isSkippedPath("a/b/vendor/x.md", ["vendor/"]));
  // Without the extra entry the same path is scanned (built-ins don't match
  // the plural `fixtures` segment).
  assertEquals(isSkippedPath("anchor-systems/fixtures/auth.md"), false);
  assertEquals(isSkippedPath("src/auth.md", ["fixtures"]), false);
});

Deno.test("readSkipEnv-parses-comma-list", () => {
  const prev = Deno.env.get("FLOWAI_DOC_ANCHORS_SKIP");
  try {
    Deno.env.set("FLOWAI_DOC_ANCHORS_SKIP", " fixtures , vendor/ ,, examples ");
    assertEquals(readSkipEnv(), ["fixtures", "vendor/", "examples"]);
    Deno.env.delete("FLOWAI_DOC_ANCHORS_SKIP");
    assertEquals(readSkipEnv(), []);
  } finally {
    if (prev === undefined) Deno.env.delete("FLOWAI_DOC_ANCHORS_SKIP");
    else Deno.env.set("FLOWAI_DOC_ANCHORS_SKIP", prev);
  }
});

Deno.test("collectFiles-respects-skip-env", async () => {
  const prev = Deno.env.get("FLOWAI_DOC_ANCHORS_SKIP");
  const dir = await Deno.makeTempDir({ prefix: "doc-anchors-skipenv-" });
  try {
    await git(dir, "init", "-q");
    await Deno.mkdir(join(dir, "fixtures"));
    // A project's own fixture carries an intentional dead ref. With the project
    // skip env set, it must NOT be scanned (no finding); without it, it would.
    await Deno.writeTextFile(join(dir, "fixtures", "x.md"), "[REF:fr:ghost]");
    await Deno.writeTextFile(join(dir, "real.md"), "Clean prose.");

    Deno.env.set("FLOWAI_DOC_ANCHORS_SKIP", "fixtures");
    const files = await collectFiles(dir);
    const paths = files.map((f) => f.path);
    assert(
      !paths.some((p) => p.includes("/fixtures/")),
      `skip-env folder leaked into scan: ${paths.join(", ")}`,
    );
    assertEquals(findIssues(files), []);
  } finally {
    if (prev === undefined) Deno.env.delete("FLOWAI_DOC_ANCHORS_SKIP");
    else Deno.env.set("FLOWAI_DOC_ANCHORS_SKIP", prev);
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("skips-generated-and-fixture-surfaces", () => {
  // Parity with scripts/check-salp.ts SKIP_PATH_PATTERNS: run artifacts and
  // committed fixtures carry illustrative/dangling SALP tokens that must NOT
  // be flagged as real repo defects.
  for (
    const p of [
      "acceptance-tests/runs/2026-06-04T22-50-13/x/run-1/judge-evidence.md",
      "acceptance-tests/cache/whatever.md",
      "framework/core/skills/plan/acceptance-tests/x/fixture/srs.md",
      "scripts/migrate-to-salp.fixtures/sample.md",
      "framework/core/hooks/doc-anchors-validate/run_test.ts",
    ]
  ) {
    assert(isSkippedPath(p), `expected skipped: ${p}`);
  }
  // Real source surfaces are still scanned.
  for (
    const p of [
      "documents/design-notes.md",
      "framework/core/commands/adapt/SKILL.md",
      "README.md",
    ]
  ) {
    assertEquals(isSkippedPath(p), false, `expected scanned: ${p}`);
  }
});
