import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolveSkillModel, transformAgent } from "./cli-internals.ts";

Deno.test("resolveSkillModel resolves abstract tier to concrete model (claude)", () => {
  const src = "---\nname: x\ndescription: d\nmodel: cheap\n---\n\n# Body\n";
  const out = resolveSkillModel(src, "claude");
  assertStringIncludes(out, "model: haiku");
  assertEquals(out.includes("model: cheap"), false);
});

Deno.test("resolveSkillModel resolves smart tier (claude)", () => {
  const src = "---\nname: x\ndescription: d\nmodel: smart\n---\n\n# Body\n";
  const out = resolveSkillModel(src, "claude");
  assertStringIncludes(out, "model: sonnet");
});

Deno.test("resolveSkillModel drops `inherit`", () => {
  const src = "---\nname: x\ndescription: d\nmodel: inherit\n---\n\n# Body\n";
  const out = resolveSkillModel(src, "claude");
  assertEquals(out.includes("model:"), false);
  // Other frontmatter survives.
  assertStringIncludes(out, "name: x");
  assertStringIncludes(out, "description: d");
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

// Guard: the agent path already resolved tiers — keep that behaviour intact.
Deno.test("transformAgent still resolves cheap -> haiku for claude", () => {
  const src = "---\nname: a\ndescription: d\nmodel: cheap\n---\n\nBody\n";
  const out = transformAgent(src, "claude");
  assertStringIncludes(out, "model: haiku");
});
