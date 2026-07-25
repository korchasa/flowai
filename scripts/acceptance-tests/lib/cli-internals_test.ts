import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolveSkillModel, transformAgent } from "./cli-internals.ts";

Deno.test("resolveSkillModel resolves abstract tier to concrete model (claude)", () => {
  const src = "---\nname: x\ndescription: d\nmodel: cheap\n---\n\n# Body\n";
  const out = resolveSkillModel(src, "claude");
  assertStringIncludes(out, "model: sonnet");
  assertStringIncludes(out, "effort: low");
  assertEquals(out.includes("model: cheap"), false);
});

Deno.test("resolveSkillModel resolves smart tier (claude)", () => {
  const src = "---\nname: x\ndescription: d\nmodel: smart\n---\n\n# Body\n";
  const out = resolveSkillModel(src, "claude");
  assertStringIncludes(out, "model: opus");
  assertStringIncludes(out, "effort: high");
});

// [REF:fr:dist.mapping | FR-DIST.MAPPING]: the tier owns effort — a stale source `effort:` is replaced,
// not duplicated.
Deno.test("resolveSkillModel replaces a stale effort beside the tier", () => {
  const src =
    "---\nname: x\ndescription: d\nmodel: fast\neffort: high\n---\n\n# Body\n";
  const out = resolveSkillModel(src, "claude");
  assertStringIncludes(out, "model: sonnet");
  assertStringIncludes(out, "effort: medium");
  assertEquals(out.includes("effort: high"), false);
});

Deno.test("resolveSkillModel drops `inherit`", () => {
  const src =
    "---\nname: x\ndescription: d\nmodel: inherit\neffort: low\n---\n\n# Body\n";
  const out = resolveSkillModel(src, "claude");
  assertEquals(out.includes("model:"), false);
  assertEquals(out.includes("effort:"), false);
  // Other frontmatter survives.
  assertStringIncludes(out, "name: x");
  assertStringIncludes(out, "description: d");
});

// A skill with no tier runs on the session model — its own effort is untouched.
Deno.test("resolveSkillModel leaves a tier-less effort alone", () => {
  const src = "---\nname: x\ndescription: d\neffort: high\n---\n\n# Body\n";
  const out = resolveSkillModel(src, "claude");
  assertEquals(out, src);
});

Deno.test("resolveSkillModel drops tier with no IDE mapping (opencode)", () => {
  const src = "---\nname: x\ndescription: d\nmodel: cheap\n---\n\n# Body\n";
  const out = resolveSkillModel(src, "opencode");
  assertEquals(out.includes("model:"), false);
});

Deno.test("resolveSkillModel leaves a concrete model untouched", () => {
  const src = "---\nname: x\ndescription: d\nmodel: haiku\n---\n\n# Body\n";
  const out = resolveSkillModel(src, "claude");
  assertStringIncludes(out, "model: haiku");
});

Deno.test("resolveSkillModel is a no-op when no model field present", () => {
  const src = "---\nname: x\ndescription: d\n---\n\n# Body\n";
  const out = resolveSkillModel(src, "claude");
  assertEquals(out, src);
});

Deno.test("resolveSkillModel is a no-op when there is no frontmatter", () => {
  const src = "# Just a body, no frontmatter\nmodel: cheap appears in prose\n";
  const out = resolveSkillModel(src, "claude");
  assertEquals(out, src);
});

// Guard: the agent path resolves tiers to the same pair as the skill path.
Deno.test("transformAgent resolves cheap -> sonnet/low for claude", () => {
  const src = "---\nname: a\ndescription: d\nmodel: cheap\n---\n\nBody\n";
  const out = transformAgent(src, "claude");
  assertStringIncludes(out, "model: sonnet");
  assertStringIncludes(out, "effort: low");
});

// Cursor keeps the model half; it has no effort field at all.
Deno.test("transformAgent gives cursor the model half only", () => {
  const src = "---\nname: a\ndescription: d\nmodel: smart\n---\n\nBody\n";
  const out = transformAgent(src, "cursor");
  assertStringIncludes(out, "model: slow");
  assertEquals(out.includes("effort:"), false);
});

// A user override may set the model alone (string) or the pair (object).
Deno.test("transformAgent honours both user override forms", () => {
  const src = "---\nname: a\ndescription: d\nmodel: fast\n---\n\nBody\n";
  const modelOnly = transformAgent(src, "claude", { fast: "haiku" });
  assertStringIncludes(modelOnly, "model: haiku");
  assertStringIncludes(modelOnly, "effort: medium"); // built-in effort kept

  const pair = transformAgent(src, "claude", {
    fast: { model: "haiku", effort: "low" },
  });
  assertStringIncludes(pair, "model: haiku");
  assertStringIncludes(pair, "effort: low");
});
