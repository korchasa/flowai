/**
 * Drives `compare_rules.py` the way the `update` skill does — template path,
 * then project AGENTS.md path — so `deno task check` covers the comparison
 * even though it is Python.
 */
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { fromFileUrl, join } from "jsr:@std/path";

const SCRIPT = fromFileUrl(new URL("./compare_rules.py", import.meta.url));

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

async function compare(template: string, artifact: string): Promise<Run> {
  const dir = await Deno.makeTempDir();
  try {
    const t = join(dir, "AGENTS.template.md");
    const a = join(dir, "AGENTS.md");
    await Deno.writeTextFile(t, template);
    await Deno.writeTextFile(a, artifact);
    return await run(t, a);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

async function run(...args: string[]): Promise<Run> {
  const out = await new Deno.Command("python3", {
    args: [SCRIPT, ...args],
    stdout: "piped",
    stderr: "piped",
  }).output();
  return {
    code: out.code,
    stdout: new TextDecoder().decode(out.stdout),
    stderr: new TextDecoder().decode(out.stderr),
  };
}

/** The lines of one output group, from its title to the next blank line. */
function group(stdout: string, title: string): string[] {
  const lines = stdout.split("\n");
  const start = lines.indexOf(title);
  if (start < 0) return [];
  const end = lines.indexOf("", start);
  return lines.slice(start + 1, end < 0 ? undefined : end);
}

const TEMPLATE = [
  "# Core Project Rules",
  "",
  "- **Proactive Resolution**: Exhaust resources before asking.",
  "- **Forward motion**: Do not re-confirm.",
  "",
  "## TDD Flow",
  "",
  "1. **RED**: Write a failing test.",
  "2. **GREEN**: Pass it.",
  "3. **REFACTOR**: Improve.",
  "4. **CHECK**: Run fmt, lint and the full suite.",
  "",
  "## Example",
  "",
  "```markdown",
  "- **Inside a fence**: not a rule.",
  "```",
  "",
].join("\n");

Deno.test("compare_rules: a rule missing from a section the project has is listed by name", async () => {
  const r = await compare(
    TEMPLATE,
    [
      "# MyProject",
      "## TDD FLOW",
      "1. **RED**: Write test.",
      "2. **GREEN**: Pass test.",
      "3. **REFACTOR:** Improve.",
      "- **Proactive Resolution**: kept here.",
      "- **Forward motion**: kept.",
      "## Example",
    ].join("\n"),
  );
  assertEquals(r.code, 0, r.stderr);
  // Heading and label case, and the colon inside or outside the bold, do not matter.
  assertEquals(group(r.stdout, "In sections the artifact already has:"), [
    "- [TDD Flow] CHECK",
  ]);
  assertStringIncludes(r.stdout, "Missing named rules: 1.");
});

Deno.test("compare_rules: a rule the project moved to another section is not reported", async () => {
  const r = await compare(
    TEMPLATE,
    [
      "## Planning Rules",
      "- **Proactive Resolution**: moved here by the project.",
      "- **Forward motion**: moved too.",
      "## TDD Flow",
      "1. **RED**: a",
      "2. **GREEN**: b",
      "3. **REFACTOR**: c",
      "4. **CHECK**: d",
      "## Example",
    ].join("\n"),
  );
  assertEquals(r.code, 0, r.stderr);
  assertStringIncludes(r.stdout, "Missing named rules: none.");
  // The template section is still reported, because the heading is absent.
  assertEquals(group(r.stdout, "Missing sections: 1."), [
    "- Core Project Rules (2 named rules)",
  ]);
});

Deno.test("compare_rules: rules of a section the project lacks are listed one per line", async () => {
  const r = await compare(TEMPLATE, "# MyProject\n## TDD Flow\n");
  assertEquals(r.code, 0, r.stderr);
  assertEquals(group(r.stdout, "In sections the artifact does not have:"), [
    "- [Core Project Rules] Proactive Resolution",
    "- [Core Project Rules] Forward motion",
  ]);
  assertEquals(group(r.stdout, "In sections the artifact already has:"), [
    "- [TDD Flow] RED",
    "- [TDD Flow] GREEN",
    "- [TDD Flow] REFACTOR",
    "- [TDD Flow] CHECK",
  ]);
});

Deno.test("compare_rules: a bold item inside a fenced block is not a rule", async () => {
  const r = await compare(TEMPLATE, "");
  assertEquals(r.code, 0, r.stderr);
  assert(!r.stdout.includes("Inside a fence"), r.stdout);
  assertStringIncludes(r.stdout, "6 named rules");
});

Deno.test("compare_rules: an unreadable file exits 2 and names the path", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const t = join(dir, "AGENTS.template.md");
    await Deno.writeTextFile(t, TEMPLATE);
    const missing = join(dir, "absent.md");
    const r = await run(t, missing);
    assertEquals(r.code, 2);
    assertStringIncludes(r.stderr, missing);
    const usage = await run(t);
    assertEquals(usage.code, 2);
    assertStringIncludes(usage.stderr, "usage:");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
