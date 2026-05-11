import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { copyFrameworkToIdeDir, writeRunFile } from "./utils.ts";

Deno.test("writeRunFile writes content and returns path", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const path = await writeRunFile(dir, "test-output.md", "hello world");
    assertEquals(path, join(dir, "test-output.md"));
    const content = await Deno.readTextFile(path);
    assertEquals(content, "hello world");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("writeRunFile overwrites existing file", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await writeRunFile(dir, "out.md", "first");
    const path = await writeRunFile(dir, "out.md", "second");
    const content = await Deno.readTextFile(path);
    assertEquals(content, "second");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

/**
 * Build a minimal pack tree on disk for copyFrameworkToIdeDir tests.
 * Layout:
 *   <root>/framework/<pack>/pack.yaml
 *   <root>/framework/<pack>/skills/<skill>/SKILL.md
 *   <root>/framework/<pack>/commands/<command>/SKILL.md
 */
async function buildTestFrameworkTree(root: string): Promise<string> {
  const frameworkPath = join(root, "framework");
  const packDir = join(frameworkPath, "testpack");
  await Deno.mkdir(packDir, { recursive: true });
  await Deno.writeTextFile(join(packDir, "pack.yaml"), "name: testpack\n");

  // Skill primitive
  const skillDir = join(packDir, "skills", "demo-skill");
  await Deno.mkdir(skillDir, { recursive: true });
  await Deno.writeTextFile(
    join(skillDir, "SKILL.md"),
    "---\nname: demo-skill\ndescription: Demo skill.\n---\n\n# Demo Skill\n",
  );

  // Command primitive (user-only — writer must inject disable-model-invocation)
  const cmdDir = join(packDir, "commands", "demo-command");
  await Deno.mkdir(cmdDir, { recursive: true });
  await Deno.writeTextFile(
    join(cmdDir, "SKILL.md"),
    "---\nname: demo-command\ndescription: Demo command.\n---\n\n# Demo Command\n",
  );

  return frameworkPath;
}

Deno.test("copyFrameworkToIdeDir copies skills into dest/skills/", async () => {
  const root = await Deno.makeTempDir({ prefix: "copyfw-skills-" });
  try {
    const frameworkPath = await buildTestFrameworkTree(root);
    const ideConfigDir = join(root, ".claude");
    await copyFrameworkToIdeDir(frameworkPath, ideConfigDir, "claude", [
      "testpack",
    ]);

    const skillPath = join(ideConfigDir, "skills", "demo-skill", "SKILL.md");
    const content = await Deno.readTextFile(skillPath);
    assertStringIncludes(content, "name: demo-skill");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("copyFrameworkToIdeDir copies commands into dest/skills/", async () => {
  const root = await Deno.makeTempDir({ prefix: "copyfw-commands-" });
  try {
    const frameworkPath = await buildTestFrameworkTree(root);
    const ideConfigDir = join(root, ".claude");
    await copyFrameworkToIdeDir(frameworkPath, ideConfigDir, "claude", [
      "testpack",
    ]);

    // Commands install into the SAME target dir as skills (.{ide}/skills/);
    // the classifier is the source directory, not the install location.
    const cmdPath = join(ideConfigDir, "skills", "demo-command", "SKILL.md");
    const content = await Deno.readTextFile(cmdPath);
    assertStringIncludes(content, "name: demo-command");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("copyFrameworkToIdeDir injects disable-model-invocation into commands", async () => {
  const root = await Deno.makeTempDir({ prefix: "copyfw-inject-" });
  try {
    const frameworkPath = await buildTestFrameworkTree(root);
    const ideConfigDir = join(root, ".claude");
    await copyFrameworkToIdeDir(frameworkPath, ideConfigDir, "claude", [
      "testpack",
    ]);

    // Commands MUST have `disable-model-invocation: true` injected in their
    // frontmatter by the writer — it's the IDE signal that makes them
    // user-only (not agent-auto-invocable). This mirrors production CLI
    // behavior in cli/src/sync.ts::injectDisableModelInvocation.
    const cmdPath = join(ideConfigDir, "skills", "demo-command", "SKILL.md");
    const content = await Deno.readTextFile(cmdPath);
    assertStringIncludes(content, "disable-model-invocation: true");

    // Skills MUST NOT have this flag — they are agent-invocable.
    const skillPath = join(ideConfigDir, "skills", "demo-skill", "SKILL.md");
    const skillContent = await Deno.readTextFile(skillPath);
    assertEquals(
      skillContent.includes("disable-model-invocation"),
      false,
      "skills must not carry disable-model-invocation flag",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
