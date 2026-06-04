/**
 * Tests for scripts/generate-skill-composites.ts (FR-SKILL-COMPOSE).
 *
 * Commit-1 scope: manifest loading + empty-manifest no-op. Commit-2+ extends
 * with atom render / param substitution / composite render / canon tests.
 */
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";

import {
  checkGitignoreParity,
  diffAgainstDisk,
  listTargets,
  loadManifest,
  type Manifest,
  MANIFEST_PATH,
  parseAtomSource,
  renderAll,
  renderAtomTarget,
  substituteParams,
  validateAtomCanon,
} from "./generate-skill-composites.ts";

async function withTempManifest<T>(
  yaml: string,
  fn: (path: string) => Promise<T>,
): Promise<T> {
  const dir = await Deno.makeTempDir({ prefix: "flowai-generate-test-" });
  try {
    const path = join(dir, "composites.yaml");
    await Deno.writeTextFile(path, yaml);
    return await fn(path);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test("manifest_loads: parses schema_version + empty atoms/composites", async () => {
  const yaml = "schema_version: 1\natoms: {}\ncomposites: {}\n";
  await withTempManifest(yaml, async (path) => {
    const m = await loadManifest(path);
    assertEquals(m.schema_version, 1);
    assertEquals(Object.keys(m.atoms).length, 0);
    assertEquals(Object.keys(m.composites).length, 0);
  });
});

Deno.test("manifest_loads: real framework manifest parses", async () => {
  const m = await loadManifest(MANIFEST_PATH);
  assertEquals(m.schema_version, 1);
});

Deno.test("manifest_layout: generator inputs live outside primitive directories", async () => {
  // implements [REF:fr:skill-compose | FR-SKILL-COMPOSE]
  const m = await loadManifest(MANIFEST_PATH);
  const primitiveInputRe =
    /^framework\/[^/]+\/(?:commands|skills)\/[^/]+\/_(?:atom|composite)\.md$/;

  for (const [id, atom] of Object.entries(m.atoms)) {
    assertEquals(
      primitiveInputRe.test(atom.source),
      false,
      `atom '${id}' source must not live in a command/skill directory: ${atom.source}`,
    );
    assertStringIncludes(atom.source, "framework/atoms/");
  }
  for (const [id, composite] of Object.entries(m.composites)) {
    assertEquals(
      primitiveInputRe.test(composite.wrapper),
      false,
      `composite '${id}' wrapper must not live in a command/skill directory: ${composite.wrapper}`,
    );
    assertStringIncludes(composite.wrapper, "framework/composites/");
  }
});

Deno.test("empty_manifest_no_op: renderAll returns []", async () => {
  const empty: Manifest = { schema_version: 1, atoms: {}, composites: {} };
  const out = await renderAll(empty);
  assertEquals(out, []);
});

Deno.test("empty_manifest_no_op: diffAgainstDisk on [] returns []", async () => {
  const drifts = await diffAgainstDisk([]);
  assertEquals(drifts, []);
});

Deno.test("malformed_manifest_fails_with_clear_message: bad YAML", async () => {
  await withTempManifest(
    "schema_version: 1\natoms: {{",
    (path) =>
      assertRejects(
        () => loadManifest(path),
        Error,
        "malformed YAML",
      ),
  );
});

Deno.test("malformed_manifest_fails_with_clear_message: missing schema_version", async () => {
  await withTempManifest("atoms: {}\ncomposites: {}\n", (path) =>
    assertRejects(
      () => loadManifest(path),
      Error,
      "schema_version",
    ));
});

Deno.test("malformed_manifest_fails_with_clear_message: unsupported schema_version", async () => {
  await withTempManifest(
    "schema_version: 99\natoms: {}\ncomposites: {}\n",
    (path) =>
      assertRejects(
        () => loadManifest(path),
        Error,
        "unsupported schema_version",
      ),
  );
});

Deno.test("manifest_loads: composite phase must specify atom XOR inline", async () => {
  const yaml = `schema_version: 1
atoms: {}
composites:
  foo:
    target: framework/core/commands/foo/SKILL.md
    wrapper: framework/composites/foo.md
    phases:
      - title: P
`;
  await withTempManifest(yaml, (path) =>
    assertRejects(
      () => loadManifest(path),
      Error,
      "exactly one of 'atom:' or 'inline: true'",
    ));
});

// --- Atom render pipeline (Commit 2) ---

const SAMPLE_ATOM = `---
name: sample
description: Sample atom for tests.
kind: command
_params:
  TERMINATION:
    choices: [TOTAL_STOP, HAND_OFF_TO_NEXT]
    default: TOTAL_STOP
    description: How the final step terminates.
---

# Sample

<step_by_step>
1. Step one.
2. {{TERMINATION}}
</step_by_step>

<param-branch name="TERMINATION" value="TOTAL_STOP">
**TOTAL STOP** — stop here.
</param-branch>

<param-branch name="TERMINATION" value="HAND_OFF_TO_NEXT">
**Hand off to next phase** — continue.
</param-branch>
`;

Deno.test("parseAtomSource: strips _params from frontmatter + extracts branches", () => {
  const parsed = parseAtomSource(SAMPLE_ATOM, "framework/atoms/sample.md");
  assertEquals(parsed.frontmatter.name, "sample");
  assertEquals(parsed.frontmatter._params, undefined);
  assertEquals(parsed.params.size, 1);
  const term = parsed.params.get("TERMINATION")!;
  assertEquals(term.choices, ["TOTAL_STOP", "HAND_OFF_TO_NEXT"]);
  assertEquals(term.default, "TOTAL_STOP");
  assertEquals(term.branches.get("TOTAL_STOP"), "**TOTAL STOP** — stop here.");
  assertEquals(
    term.branches.get("HAND_OFF_TO_NEXT"),
    "**Hand off to next phase** — continue.",
  );
  // Body must NOT contain <param-branch> tags after parse.
  assertEquals(parsed.body.includes("<param-branch"), false);
});

Deno.test("substituteParams: missing_param_falls_back_to_default", () => {
  const parsed = parseAtomSource(SAMPLE_ATOM, "framework/atoms/sample.md");
  const rendered = substituteParams(
    parsed.body,
    parsed.params,
    {},
    "framework/atoms/sample.md",
  );
  assertStringIncludes(rendered, "**TOTAL STOP**");
  assertEquals(rendered.includes("**Hand off"), false);
});

Deno.test("substituteParams: explicit override uses HAND_OFF_TO_NEXT branch", () => {
  const parsed = parseAtomSource(SAMPLE_ATOM, "framework/atoms/sample.md");
  const rendered = substituteParams(
    parsed.body,
    parsed.params,
    { TERMINATION: "HAND_OFF_TO_NEXT" },
    "framework/atoms/sample.md",
  );
  assertStringIncludes(rendered, "**Hand off to next phase**");
  assertEquals(rendered.includes("**TOTAL STOP**"), false);
});

Deno.test("substituteParams: unknown_param_value_fails_with_suggestion", () => {
  const parsed = parseAtomSource(SAMPLE_ATOM, "framework/atoms/sample.md");
  try {
    substituteParams(
      parsed.body,
      parsed.params,
      { TERMINATION: "TOTAL_STOPP" }, // typo
      "framework/atoms/sample.md",
    );
    throw new Error("expected throw");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    assertStringIncludes(msg, "TOTAL_STOPP");
    assertStringIncludes(msg, "did you mean 'TOTAL_STOP'");
  }
});

Deno.test("parseAtomSource: throws when <param-branch> references unknown param", () => {
  const bad = `---
name: x
description: x
_params:
  KNOWN:
    choices: [A]
    default: A
---

<step_by_step>
1. {{KNOWN}}
</step_by_step>

<param-branch name="UNKNOWN" value="A">x</param-branch>
<param-branch name="KNOWN" value="A">y</param-branch>
`;
  try {
    parseAtomSource(bad, "framework/atoms/bad.md");
    throw new Error("expected throw");
  } catch (e) {
    assertStringIncludes(
      e instanceof Error ? e.message : String(e),
      "unknown param 'UNKNOWN'",
    );
  }
});

Deno.test("parseAtomSource: throws when a choice has no <param-branch>", () => {
  const bad = `---
name: x
description: x
_params:
  TERMINATION:
    choices: [TOTAL_STOP, HAND_OFF_TO_NEXT]
    default: TOTAL_STOP
---

<step_by_step>
1. {{TERMINATION}}
</step_by_step>

<param-branch name="TERMINATION" value="TOTAL_STOP">a</param-branch>
`;
  try {
    parseAtomSource(bad, "framework/atoms/bad.md");
    throw new Error("expected throw");
  } catch (e) {
    assertStringIncludes(
      e instanceof Error ? e.message : String(e),
      "missing <param-branch> for choice 'HAND_OFF_TO_NEXT'",
    );
  }
});

Deno.test("renderAtomTarget: writes deterministic output across runs", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "flowai-atom-test-" });
  try {
    const src = join(tmp, "sample.md");
    await Deno.writeTextFile(src, SAMPLE_ATOM);
    const entry = {
      source: src,
      target: join(tmp, "SKILL.md"),
      default_params: { TERMINATION: "TOTAL_STOP" },
    };
    const r1 = await renderAtomTarget("sample", entry);
    const r2 = await renderAtomTarget("sample", entry);
    assertEquals(r1.body, r2.body);
    assertStringIncludes(r1.body, "GENERATED FROM");
    assertStringIncludes(r1.body, "**TOTAL STOP**");
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("validateAtomCanon: rejects multiple <step_by_step> blocks", () => {
  const body =
    `<step_by_step>1.</step_by_step>\n\n<step_by_step>2.</step_by_step>`;
  try {
    validateAtomCanon("x", body, "x/SKILL.md");
    throw new Error("expected throw");
  } catch (e) {
    assertStringIncludes(
      e instanceof Error ? e.message : String(e),
      "expected exactly 1 <step_by_step>",
    );
  }
});

Deno.test("renderAtomTarget: drift detection on edited target", async () => {
  // Renders the real plan atom. Output should match on-disk SKILL.md
  // byte-for-byte after regeneration.
  const m = await loadManifest();
  const entry = m.atoms["plan"];
  const r = await renderAtomTarget("plan", entry);
  const onDisk = await Deno.readTextFile(entry.target);
  assertEquals(r.body, onDisk);
});

Deno.test("manifest_loads: composite must reference an existing atom", async () => {
  const yaml = `schema_version: 1
atoms: {}
composites:
  foo:
    target: framework/core/commands/foo/SKILL.md
    wrapper: framework/composites/foo.md
    phases:
      - title: P
        atom: nonexistent
`;
  await withTempManifest(yaml, (path) =>
    assertRejects(
      () => loadManifest(path),
      Error,
      "unknown atom 'nonexistent'",
    ));
});

Deno.test("checkGitignoreParity: real .gitignore lists every manifest target", async () => {
  const targets = await listTargets();
  const diff = await checkGitignoreParity(targets);
  assertEquals(
    diff,
    null,
    diff
      ? `gitignore parity drift — missing: ${diff.missing.join(", ")}; ` +
        `extra: ${diff.extra.join(", ")}`
      : "",
  );
});

Deno.test("checkGitignoreParity: reports a missing target", async () => {
  const fakeTargets = [
    ...await listTargets(),
    "framework/core/commands/nonexistent/SKILL.md",
  ];
  const diff = await checkGitignoreParity(fakeTargets);
  assertEquals(diff?.missing, [
    "framework/core/commands/nonexistent/SKILL.md",
  ]);
  assertEquals(diff?.extra, []);
});
