// implements [FR-DIST.MARKETPLACE](../documents/requirements.md#fr-dist.marketplace-claude-code-plugin-marketplace-pilot)
// Verification of scripts/build-claude-plugins.ts.
//
// Tests run the real build against the actual `framework/core/` tree, plus
// hermetic fixtures for fail-fast invariant violations. No network.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { parse as parseYaml } from "@std/yaml";
import {
  buildClaudePlugins,
  DEFAULT_MARKETPLACE_NAME,
  resolveModelTier,
  transformAgentFrontmatter,
} from "./build-claude-plugins.ts";

const FRAMEWORK = join(Deno.cwd(), "framework");

async function tempOut(): Promise<string> {
  return await Deno.makeTempDir({ prefix: "flowai-plugins-test-" });
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await Deno.readTextFile(path));
}

async function readFrontmatter(
  path: string,
): Promise<Record<string, unknown>> {
  const text = await Deno.readTextFile(path);
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error(`no frontmatter in ${path}`);
  return parseYaml(m[1]) as Record<string, unknown>;
}

Deno.test("emits-marketplace-and-plugin-manifest-for-core", async () => {
  const out = await tempOut();
  try {
    await buildClaudePlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });

    const mp = await readJson(
      join(out, ".claude-plugin", "marketplace.json"),
    ) as Record<string, unknown>;
    assertEquals(mp.name, DEFAULT_MARKETPLACE_NAME);
    assert(Array.isArray(mp.plugins));
    const plugins = mp.plugins as Array<Record<string, unknown>>;
    assertEquals(plugins.length, 1);
    assertEquals(plugins[0].name, "flowai-core");
    assertEquals(plugins[0].source, "./plugins/flowai-core");
    assert(Array.isArray(plugins[0].keywords));
    assertEquals(plugins[0].category, "development-workflows");
    assert(
      typeof plugins[0].version === "string" &&
        (plugins[0].version as string).length > 0,
      "marketplace entry must carry a version",
    );

    const pj = await readJson(
      join(out, "plugins", "flowai-core", ".claude-plugin", "plugin.json"),
    ) as Record<string, unknown>;
    assertEquals(pj.name, "flowai-core");
    assert(typeof pj.description === "string");
    assertEquals(pj.version, plugins[0].version);
    assertEquals(pj.category, undefined);
    assertEquals(pj.keywords, undefined);
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("skill-and-command-dirs-have-prefix-stripped", async () => {
  const out = await tempOut();
  try {
    await buildClaudePlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });

    const skillsDir = join(out, "plugins", "flowai-core", "skills");
    const names: string[] = [];
    for await (const e of Deno.readDir(skillsDir)) {
      if (e.isDirectory) names.push(e.name);
    }
    assert(names.length > 0, "no skills emitted");
    for (const n of names) {
      assert(
        !n.startsWith("flowai-"),
        `skill dir "${n}" still has flowai- prefix`,
      );
    }
    assert(names.includes("commit"), "commit (from flowai-commit) missing");
    assert(names.includes("plan"), "plan (from flowai-plan) missing");
    assert(names.includes("review"), "review (from flowai-review) missing");
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test(
  "commands-get-disable-model-invocation-injected-skills-do-not",
  async () => {
    const out = await tempOut();
    try {
      await buildClaudePlugins({
        packs: ["core"],
        frameworkDir: FRAMEWORK,
        outDir: out,
      });

      const cmdFm = await readFrontmatter(
        join(out, "plugins", "flowai-core", "skills", "commit", "SKILL.md"),
      );
      assertEquals(
        cmdFm["disable-model-invocation"],
        true,
        "command must carry disable-model-invocation: true",
      );

      const sklFm = await readFrontmatter(
        join(out, "plugins", "flowai-core", "skills", "review", "SKILL.md"),
      );
      assertEquals(
        sklFm["disable-model-invocation"],
        undefined,
        "skill must NOT carry disable-model-invocation",
      );
    } finally {
      await Deno.remove(out, { recursive: true });
    }
  },
);

Deno.test("agent-frontmatter-matches-claude-native-mapping", () => {
  const universal = {
    name: "ag",
    description: "d",
    tools: "Bash",
    disallowedTools: "Write",
    readonly: true,
    mode: "subagent",
    opencode_tools: { write: false },
    model: "smart" as const,
    effort: "medium" as const,
    maxTurns: 15,
    background: false,
    isolation: "worktree" as const,
    color: "blue",
  };
  const out = transformAgentFrontmatter(universal);
  assertEquals(out.name, "ag");
  assertEquals(out.description, "d");
  assertEquals(out.tools, "Bash");
  assertEquals(out.disallowedTools, "Write");
  assertEquals(out.model, "sonnet");
  assertEquals(out.effort, "medium");
  assertEquals(out.maxTurns, 15);
  assertEquals(out.background, false);
  assertEquals(out.isolation, "worktree");
  assertEquals(out.color, "blue");
  assertEquals((out as Record<string, unknown>).readonly, undefined);
  assertEquals((out as Record<string, unknown>).mode, undefined);
  assertEquals((out as Record<string, unknown>).opencode_tools, undefined);
});

Deno.test("model-tier-resolution", () => {
  assertEquals(resolveModelTier("max"), "opus");
  assertEquals(resolveModelTier("smart"), "sonnet");
  assertEquals(resolveModelTier("fast"), "haiku");
  assertEquals(resolveModelTier("cheap"), "haiku");
  assertEquals(resolveModelTier("inherit"), undefined);
  assertEquals(resolveModelTier(undefined), undefined);
});

Deno.test("marketplace-and-plugin-json-schema-valid", async () => {
  const out = await tempOut();
  try {
    await buildClaudePlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });

    const mp = await readJson(
      join(out, ".claude-plugin", "marketplace.json"),
    ) as Record<string, unknown>;
    assert(
      typeof mp.name === "string" && /^[a-z0-9-]+$/.test(mp.name as string),
    );
    assert(typeof mp.owner === "object" && mp.owner !== null);
    assert(
      typeof (mp.owner as Record<string, unknown>).name === "string",
    );
    assert(Array.isArray(mp.plugins));

    const pj = await readJson(
      join(out, "plugins", "flowai-core", ".claude-plugin", "plugin.json"),
    ) as Record<string, unknown>;
    assert(
      typeof pj.name === "string" && /^[a-z0-9-]+$/.test(pj.name as string),
    );
    assert(typeof pj.description === "string" && pj.description !== "");
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("byte-deterministic-rerun", async () => {
  const a = await tempOut();
  const b = await tempOut();
  try {
    await buildClaudePlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: a,
    });
    await buildClaudePlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: b,
    });

    const filesA = await listAllFiles(a);
    const filesB = await listAllFiles(b);
    assertEquals(
      filesA.sort(),
      filesB.sort(),
      "file set diverged between runs",
    );
    for (const rel of filesA) {
      const ba = await Deno.readFile(join(a, rel));
      const bb = await Deno.readFile(join(b, rel));
      assertEquals(
        ba.length,
        bb.length,
        `length mismatch on ${rel}: ${ba.length} vs ${bb.length}`,
      );
      for (let i = 0; i < ba.length; i++) {
        if (ba[i] !== bb[i]) {
          throw new Error(`byte diff at ${rel}:${i}`);
        }
      }
    }
  } finally {
    await Deno.remove(a, { recursive: true });
    await Deno.remove(b, { recursive: true });
  }
});

async function listAllFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string, prefix: string) {
    const entries: Array<{ name: string; isDir: boolean }> = [];
    for await (const e of Deno.readDir(dir)) {
      entries.push({ name: e.name, isDir: e.isDirectory });
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDir) await walk(join(dir, e.name), rel);
      else out.push(rel);
    }
  }
  await walk(root, "");
  return out;
}

Deno.test("fails-fast-on-cmd-invariant-violation", async () => {
  const fx = await Deno.makeTempDir({ prefix: "flowai-fix-cmd-" });
  const out = await tempOut();
  try {
    const pack = join(fx, "framework", "core");
    await Deno.mkdir(join(pack, "commands", "flowai-bad"), { recursive: true });
    await Deno.writeTextFile(
      join(fx, "deno.json"),
      JSON.stringify({ version: "0.0.1" }),
    );
    await Deno.writeTextFile(
      join(pack, "pack.yaml"),
      'name: core\nversion: "1.0.0"\ndescription: t\n',
    );
    await Deno.writeTextFile(
      join(pack, "commands", "flowai-bad", "SKILL.md"),
      "---\nname: flowai-bad\ndescription: x\ndisable-model-invocation: true\n---\nbody\n",
    );
    let threw = false;
    try {
      await buildClaudePlugins({
        packs: ["core"],
        frameworkDir: join(fx, "framework"),
        outDir: out,
      });
    } catch (e) {
      threw = true;
      assertStringIncludes(
        (e as Error).message,
        "FR-PACKS.CMD-INVARIANT",
        "error must name violated invariant",
      );
      assertStringIncludes(
        (e as Error).message,
        "flowai-bad",
        "error must name offending file",
      );
    }
    assert(threw, "build should have thrown on CMD-INVARIANT violation");
  } finally {
    await Deno.remove(fx, { recursive: true });
    await Deno.remove(out, { recursive: true }).catch(() => {});
  }
});

Deno.test("fails-fast-on-skill-invariant-violation", async () => {
  const fx = await Deno.makeTempDir({ prefix: "flowai-fix-skl-" });
  const out = await tempOut();
  try {
    const pack = join(fx, "framework", "core");
    await Deno.mkdir(join(pack, "skills", "flowai-bad"), { recursive: true });
    await Deno.writeTextFile(
      join(fx, "deno.json"),
      JSON.stringify({ version: "0.0.1" }),
    );
    await Deno.writeTextFile(
      join(pack, "pack.yaml"),
      'name: core\nversion: "1.0.0"\ndescription: t\n',
    );
    await Deno.writeTextFile(
      join(pack, "skills", "flowai-bad", "SKILL.md"),
      "---\nname: flowai-bad\ndescription: x\ndisable-model-invocation: true\n---\nbody\n",
    );
    let threw = false;
    try {
      await buildClaudePlugins({
        packs: ["core"],
        frameworkDir: join(fx, "framework"),
        outDir: out,
      });
    } catch (e) {
      threw = true;
      assertStringIncludes(
        (e as Error).message,
        "FR-PACKS.SKILL-INVARIANT",
      );
    }
    assert(threw, "build should have thrown on SKILL-INVARIANT violation");
  } finally {
    await Deno.remove(fx, { recursive: true });
    await Deno.remove(out, { recursive: true }).catch(() => {});
  }
});

Deno.test("preserves-skill-subdirectories", async () => {
  const out = await tempOut();
  try {
    await buildClaudePlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });
    const skillsDir = join(out, "plugins", "flowai-core", "skills");
    for await (const e of Deno.readDir(skillsDir)) {
      if (!e.isDirectory) continue;
      const skillFile = join(skillsDir, e.name, "SKILL.md");
      const stat = await Deno.stat(skillFile);
      assert(stat.isFile, `${e.name}/SKILL.md missing`);
    }
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("emits-agents-with-claude-native-frontmatter", async () => {
  const out = await tempOut();
  try {
    await buildClaudePlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });
    const agentsDir = join(out, "plugins", "flowai-core", "agents");
    const names: string[] = [];
    for await (const e of Deno.readDir(agentsDir)) {
      if (e.isFile && e.name.endsWith(".md")) names.push(e.name);
    }
    assert(names.length > 0, "no agents emitted");
    for (const n of names) {
      const fm = await readFrontmatter(join(agentsDir, n));
      assertEquals(fm.mode, undefined, `${n}: mode should be dropped`);
      assertEquals(
        fm.opencode_tools,
        undefined,
        `${n}: opencode_tools should be dropped`,
      );
      assertEquals(fm.readonly, undefined, `${n}: readonly should be dropped`);
      assert(typeof fm.name === "string", `${n}: name missing`);
      assert(typeof fm.description === "string", `${n}: description missing`);
    }
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

// ---------- New round-2 transforms ----------

Deno.test("scope-filter-excludes-project-only-primitives", async () => {
  const out = await tempOut();
  try {
    await buildClaudePlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });
    const skillsDir = join(out, "plugins", "flowai-core", "skills");
    const names: string[] = [];
    for await (const e of Deno.readDir(skillsDir)) {
      if (e.isDirectory) names.push(e.name);
    }
    // flowai-update declares scope: project-only and must be excluded.
    assert(
      !names.includes("update"),
      `update (from flowai-update, scope: project-only) must NOT be present, got: ${
        names.join(", ")
      }`,
    );
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("injects-version-from-upstream-deno-json", async () => {
  const out = await tempOut();
  try {
    await buildClaudePlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });
    const upstream = JSON.parse(
      await Deno.readTextFile(join(Deno.cwd(), "deno.json")),
    ) as { version: string };
    const pj = await readJson(
      join(out, "plugins", "flowai-core", ".claude-plugin", "plugin.json"),
    ) as Record<string, unknown>;
    assertEquals(pj.version, upstream.version);
    const mp = await readJson(
      join(out, ".claude-plugin", "marketplace.json"),
    ) as { plugins: Array<Record<string, unknown>> };
    assertEquals(mp.plugins[0].version, upstream.version);
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("copies-pack-assets-into-consuming-skill-dirs", async () => {
  const out = await tempOut();
  try {
    await buildClaudePlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });
    // adapt-instructions body cites `.{ide}/assets/AGENTS.template.md` in
    // several places — the file must be copied to the per-skill location.
    const skillDir = join(
      out,
      "plugins",
      "flowai-core",
      "skills",
      "adapt-instructions",
    );
    const localAsset = join(skillDir, "assets", "AGENTS.template.md");
    const stat = await Deno.stat(localAsset);
    assert(
      stat.isFile,
      "AGENTS.template.md not copied into adapt-instructions/assets/",
    );
    const skillText = await Deno.readTextFile(join(skillDir, "SKILL.md"));
    assertStringIncludes(skillText, "assets/AGENTS.template.md");
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("strips-cli-only-fences", async () => {
  const fx = await Deno.makeTempDir({ prefix: "flowai-fence-" });
  const out = await tempOut();
  try {
    const pack = join(fx, "framework", "core");
    await Deno.mkdir(join(pack, "skills", "flowai-x"), { recursive: true });
    await Deno.writeTextFile(
      join(fx, "deno.json"),
      JSON.stringify({ version: "0.0.1" }),
    );
    await Deno.writeTextFile(
      join(pack, "pack.yaml"),
      'name: core\nversion: "1.0.0"\ndescription: t\n',
    );
    await Deno.writeTextFile(
      join(pack, "skills", "flowai-x", "SKILL.md"),
      [
        "---",
        "name: flowai-x",
        "description: d",
        "---",
        "before",
        "<!-- begin: cli-only-skill-update -->",
        "SECRET BLOCK",
        "<!-- end: cli-only-skill-update -->",
        "after",
      ].join("\n") + "\n",
    );
    await buildClaudePlugins({
      packs: ["core"],
      frameworkDir: join(fx, "framework"),
      outDir: out,
    });
    const emitted = await Deno.readTextFile(
      join(out, "plugins", "flowai-core", "skills", "x", "SKILL.md"),
    );
    assert(!emitted.includes("SECRET BLOCK"));
    assert(!emitted.includes("begin: cli-only-skill-update"));
    assert(!emitted.includes("end: cli-only-skill-update"));
    assertStringIncludes(emitted, "before");
    assertStringIncludes(emitted, "after");
  } finally {
    await Deno.remove(fx, { recursive: true });
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("rewrites-cross-skill-slash-invocations", async () => {
  const fx = await Deno.makeTempDir({ prefix: "flowai-slash-" });
  const out = await tempOut();
  try {
    const pack = join(fx, "framework", "core");
    await Deno.mkdir(join(pack, "skills", "flowai-a"), { recursive: true });
    await Deno.writeTextFile(
      join(fx, "deno.json"),
      JSON.stringify({ version: "0.0.1" }),
    );
    await Deno.writeTextFile(
      join(pack, "pack.yaml"),
      'name: core\nversion: "1.0.0"\ndescription: t\n',
    );
    await Deno.writeTextFile(
      join(pack, "skills", "flowai-a", "SKILL.md"),
      [
        "---",
        "name: flowai-a",
        "description: d",
        "---",
        "Run /flowai-commit then /flowai-plan, finally /flowai-review.",
        "Already-rewritten /flowai-core:other stays untouched.",
      ].join("\n") + "\n",
    );
    await buildClaudePlugins({
      packs: ["core"],
      frameworkDir: join(fx, "framework"),
      outDir: out,
    });
    const emitted = await Deno.readTextFile(
      join(out, "plugins", "flowai-core", "skills", "a", "SKILL.md"),
    );
    assertStringIncludes(emitted, "/flowai-core:commit");
    assertStringIncludes(emitted, "/flowai-core:plan");
    assertStringIncludes(emitted, "/flowai-core:review");
    assertStringIncludes(emitted, "/flowai-core:other");
    assert(
      !/\/flowai-(commit|plan|review)\b/.test(emitted),
      `unrewritten /flowai-* command leaked: ${emitted}`,
    );
  } finally {
    await Deno.remove(fx, { recursive: true });
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("collects-tags-into-marketplace-entry-only", async () => {
  const fx = await Deno.makeTempDir({ prefix: "flowai-tags-" });
  const out = await tempOut();
  try {
    const pack = join(fx, "framework", "core");
    await Deno.mkdir(join(pack, "skills", "flowai-one"), { recursive: true });
    await Deno.mkdir(join(pack, "skills", "flowai-two"), { recursive: true });
    await Deno.writeTextFile(
      join(fx, "deno.json"),
      JSON.stringify({ version: "0.0.1" }),
    );
    await Deno.writeTextFile(
      join(pack, "pack.yaml"),
      'name: core\nversion: "1.0.0"\ndescription: t\n',
    );
    await Deno.writeTextFile(
      join(pack, "skills", "flowai-one", "SKILL.md"),
      "---\nname: flowai-one\ndescription: d\ntags: [alpha, shared]\n---\nbody\n",
    );
    await Deno.writeTextFile(
      join(pack, "skills", "flowai-two", "SKILL.md"),
      "---\nname: flowai-two\ndescription: d\ntags: [beta, shared]\n---\nbody\n",
    );
    await buildClaudePlugins({
      packs: ["core"],
      frameworkDir: join(fx, "framework"),
      outDir: out,
    });
    const mp = await readJson(
      join(out, ".claude-plugin", "marketplace.json"),
    ) as { plugins: Array<Record<string, unknown>> };
    const tags = mp.plugins[0].tags as string[];
    assertEquals(tags, ["alpha", "beta", "shared"]);
    // Plugin.json must NOT carry tags (Claude validator rejects them).
    const pj = await readJson(
      join(out, "plugins", "flowai-core", ".claude-plugin", "plugin.json"),
    ) as Record<string, unknown>;
    assertEquals(pj.tags, undefined);
    // Skill frontmatter must have `tags` stripped (they migrated upward).
    const fm = await readFrontmatter(
      join(out, "plugins", "flowai-core", "skills", "one", "SKILL.md"),
    );
    assertEquals(fm.tags, undefined);
  } finally {
    await Deno.remove(fx, { recursive: true });
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("transforms-hook-yaml-into-hooks-json", async () => {
  const fx = await Deno.makeTempDir({ prefix: "flowai-hooks-" });
  const out = await tempOut();
  try {
    const pack = join(fx, "framework", "core");
    await Deno.mkdir(join(pack, "hooks", "my-hook"), { recursive: true });
    await Deno.writeTextFile(
      join(fx, "deno.json"),
      JSON.stringify({ version: "0.0.1" }),
    );
    await Deno.writeTextFile(
      join(pack, "pack.yaml"),
      'name: core\nversion: "1.0.0"\ndescription: t\n',
    );
    await Deno.writeTextFile(
      join(pack, "hooks", "my-hook", "hook.yaml"),
      "event: SessionStart\nmatcher: startup|resume\ntimeout: 10\n",
    );
    await Deno.writeTextFile(
      join(pack, "hooks", "my-hook", "run.ts"),
      'console.log("hi");\n',
    );
    await buildClaudePlugins({
      packs: ["core"],
      frameworkDir: join(fx, "framework"),
      outDir: out,
    });
    const hooksPath = join(
      out,
      "plugins",
      "flowai-core",
      "hooks",
      "hooks.json",
    );
    const hooks = await readJson(hooksPath) as {
      hooks: Record<
        string,
        Array<{
          matcher: string;
          hooks: Array<{ type: string; command: string; timeout?: number }>;
        }>
      >;
    };
    assert(
      Array.isArray(hooks.hooks.SessionStart),
      "SessionStart bucket missing",
    );
    assertEquals(hooks.hooks.SessionStart[0].matcher, "startup|resume");
    assertEquals(hooks.hooks.SessionStart[0].hooks[0].type, "command");
    assertStringIncludes(
      hooks.hooks.SessionStart[0].hooks[0].command,
      "${CLAUDE_PLUGIN_ROOT}/hooks/my-hook/run.ts",
    );
    assertEquals(hooks.hooks.SessionStart[0].hooks[0].timeout, 10);
    // Run.ts must be copied alongside.
    const runStat = await Deno.stat(
      join(out, "plugins", "flowai-core", "hooks", "my-hook", "run.ts"),
    );
    assert(runStat.isFile);
  } finally {
    await Deno.remove(fx, { recursive: true });
    await Deno.remove(out, { recursive: true });
  }
});
