import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import {
  copyFrameworkToIdeDir,
  installCodexAgents,
  userInvokedCommandOf,
  writeRunFile,
} from "./utils.ts";

Deno.test("userInvokedCommandOf exempts the skill only when the query types `/name`", () => {
  assertEquals(
    userInvokedCommandOf("commit", "/commit Commit changes."),
    "commit",
  );
  assertEquals(userInvokedCommandOf("init", "/init"), "init");
  assertEquals(userInvokedCommandOf("commit", "  /commit"), "commit");
  // A plain-language query is the model discovering the primitive on its own —
  // exactly what the flag governs, so the flag must stay on.
  assertEquals(
    userInvokedCommandOf("commit", "Commit my current changes."),
    undefined,
  );
  // A different command typed by hand does not exempt this one.
  assertEquals(userInvokedCommandOf("commit", "/commit-all now"), undefined);
  assertEquals(userInvokedCommandOf("commit", "/review-and-commit"), undefined);
  assertEquals(userInvokedCommandOf(undefined, "/commit"), undefined);
});

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

/**
 * A primitive's own unit tests are for this repo, not for the sandbox project.
 * Copied in, they join the sandbox's `deno test` run: on 2026-10-04 the five
 * `tasks-overview` tests (they spawn Python, which `--allow-read --allow-write`
 * forbids) turned the fixture baseline of two `review` scenarios red.
 */
Deno.test("copyFrameworkToIdeDir leaves primitive unit tests out of the sandbox", async () => {
  const root = await Deno.makeTempDir({ prefix: "copyfw-tests-" });
  try {
    const frameworkPath = await buildTestFrameworkTree(root);
    const packDir = join(frameworkPath, "testpack");
    const place = async (rel: string) => {
      await Deno.mkdir(join(packDir, rel, ".."), { recursive: true });
      await Deno.writeTextFile(join(packDir, rel), "// x\n");
    };
    await place("skills/demo-skill/scripts/run.py");
    await place("skills/demo-skill/scripts/run_test.ts");
    await place("commands/demo-command/scripts/gen.ts");
    await place("commands/demo-command/scripts/gen.test.ts");
    await place("hooks/demo-hook/run.ts");
    await place("hooks/demo-hook/run_test.ts");
    const ideConfigDir = join(root, ".codex");
    await copyFrameworkToIdeDir(frameworkPath, ideConfigDir, "codex", [
      "testpack",
    ]);

    const exists = async (rel: string) => {
      try {
        await Deno.stat(join(ideConfigDir, rel));
        return true;
      } catch {
        return false;
      }
    };
    assertEquals(
      {
        script: await exists("skills/demo-skill/scripts/run.py"),
        skillTest: await exists("skills/demo-skill/scripts/run_test.ts"),
        cmdScript: await exists("skills/demo-command/scripts/gen.ts"),
        cmdTest: await exists("skills/demo-command/scripts/gen.test.ts"),
        hook: await exists("scripts/demo-hook/run.ts"),
        hookTest: await exists("scripts/demo-hook/run_test.ts"),
      },
      {
        script: true,
        skillTest: false,
        cmdScript: true,
        cmdTest: false,
        hook: true,
        hookTest: false,
      },
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("copyFrameworkToIdeDir resolves abstract model tier in skills", async () => {
  const root = await Deno.makeTempDir({ prefix: "copyfw-model-" });
  try {
    const frameworkPath = join(root, "framework");
    const packDir = join(frameworkPath, "testpack");
    const skillDir = join(packDir, "skills", "cheap-skill");
    await Deno.mkdir(skillDir, { recursive: true });
    await Deno.writeTextFile(join(packDir, "pack.yaml"), "name: testpack\n");
    await Deno.writeTextFile(
      join(skillDir, "SKILL.md"),
      "---\nname: cheap-skill\ndescription: d\nmodel: cheap\n---\n\n# Body\n",
    );

    const ideConfigDir = join(root, ".claude");
    await copyFrameworkToIdeDir(frameworkPath, ideConfigDir, "claude", [
      "testpack",
    ]);

    const content = await Deno.readTextFile(
      join(ideConfigDir, "skills", "cheap-skill", "SKILL.md"),
    );
    // The raw tier must NOT survive — it would crash the IDE CLI on invoke.
    assertEquals(content.includes("model: cheap"), false);
    // The tier resolves to a model + effort pair.
    assertStringIncludes(content, "model: sonnet");
    assertStringIncludes(content, "effort: low");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("copyFrameworkToIdeDir exempts the command the scenario drives", async () => {
  const root = await Deno.makeTempDir({ prefix: "copyfw-userinvoked-" });
  try {
    const frameworkPath = await buildTestFrameworkTree(root);
    const ideConfigDir = join(root, ".claude");
    // Fifth argument: the command this scenario invokes by hand via `/name`.
    // Regression for 2026-08-24, when `init-vision-integration` refused to do
    // any work because the flag said the model may not load `/init`.
    await copyFrameworkToIdeDir(frameworkPath, ideConfigDir, "claude", [
      "testpack",
    ], "demo-command");

    const cmdPath = join(ideConfigDir, "skills", "demo-command", "SKILL.md");
    const content = await Deno.readTextFile(cmdPath);
    assertEquals(
      content.includes("disable-model-invocation"),
      false,
      "the command under test must stay loadable by the model",
    );
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
    // user-only (not agent-auto-invocable). This mirrors the shipped
    // behaviour of `scripts/build-plugins.ts`, reimplemented for the harness
    // in cli-internals.ts::injectDisableModelInvocation.
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

// The IDE-dir copy writes agents as `.md`, which codex ignores; a codex run
// needs each pack agent as `$CODEX_HOME/agents/<name>.toml` to dispatch it.
Deno.test("installCodexAgents writes one TOML role per pack agent into CODEX_HOME", async () => {
  const root = await Deno.makeTempDir({ prefix: "codex-agents-" });
  try {
    const frameworkPath = await buildTestFrameworkTree(root);
    const agentsDir = join(frameworkPath, "testpack", "agents");
    await Deno.mkdir(agentsDir, { recursive: true });
    await Deno.writeTextFile(
      join(agentsDir, "demo-agent.md"),
      "---\nname: demo-agent\ndescription: Demo agent.\nmodel: smart\n---\n\nDo the demo.\n",
    );
    const codexHome = join(root, "home", ".codex");
    const written = await installCodexAgents(
      frameworkPath,
      codexHome,
      "gpt-5.6-sol",
      ["testpack"],
    );
    assertEquals(written, ["demo-agent"]);
    const toml = await Deno.readTextFile(
      join(codexHome, "agents", "demo-agent.toml"),
    );
    assertStringIncludes(toml, 'name = "demo-agent"');
    assertStringIncludes(toml, 'model = "gpt-5.6-sol"');
    assertStringIncludes(toml, "Do the demo.");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("installCodexAgents skips packs outside the allowed list", async () => {
  const root = await Deno.makeTempDir({ prefix: "codex-agents-" });
  try {
    const frameworkPath = await buildTestFrameworkTree(root);
    const agentsDir = join(frameworkPath, "testpack", "agents");
    await Deno.mkdir(agentsDir, { recursive: true });
    await Deno.writeTextFile(
      join(agentsDir, "demo-agent.md"),
      "---\nname: demo-agent\ndescription: Demo agent.\n---\n\nDo the demo.\n",
    );
    const codexHome = join(root, "home", ".codex");
    const written = await installCodexAgents(
      frameworkPath,
      codexHome,
      "gpt-5.6-sol",
      ["core"],
    );
    assertEquals(written, []);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
