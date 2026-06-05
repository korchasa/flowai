// implements [REF:fr:dist.marketplace | FR-DIST.MARKETPLACE]
// Verification of scripts/build-plugins.ts.
//
// Tests run the real build against the actual `framework/core/` tree, plus
// hermetic fixtures for fail-fast invariant violations. No network.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { parse as parseYaml } from "@std/yaml";
import {
  buildPlugins,
  DEFAULT_MARKETPLACE_NAME,
  resolveModelTier,
  transformAgentFrontmatter,
} from "./build-plugins.ts";

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
    await buildPlugins({
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
    assertEquals(plugins[0].name, "flowai");
    assertEquals(plugins[0].source, "./plugins/flowai");
    assert(Array.isArray(plugins[0].keywords));
    assertEquals(plugins[0].category, "development-workflows");
    assert(
      typeof plugins[0].version === "string" &&
        (plugins[0].version as string).length > 0,
      "marketplace entry must carry a version",
    );

    const pj = await readJson(
      join(out, "plugins", "flowai", ".claude-plugin", "plugin.json"),
    ) as Record<string, unknown>;
    assertEquals(pj.name, "flowai");
    assert(typeof pj.description === "string");
    assertEquals(pj.version, plugins[0].version);
    assertEquals(pj.category, undefined);
    assertEquals(pj.keywords, undefined);
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("codex-marketplace emits-codex-marketplace-for-all-packs", async () => {
  const out = await tempOut();
  try {
    await buildPlugins({
      packs: ["typescript", "core", "deno"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });

    const mp = await readJson(
      join(out, ".agents", "plugins", "marketplace.json"),
    ) as Record<string, unknown>;
    assertEquals(mp.name, DEFAULT_MARKETPLACE_NAME);
    assertEquals(
      (mp.interface as Record<string, unknown>).displayName,
      DEFAULT_MARKETPLACE_NAME,
    );
    assert(Array.isArray(mp.plugins));
    const plugins = mp.plugins as Array<Record<string, unknown>>;
    assertEquals(
      plugins.map((p) => p.name),
      ["flowai", "flowai-deno", "flowai-typescript"],
    );
    assertEquals(
      plugins.map((
        p,
      ) => ((p.source as Record<string, unknown>).path as string)),
      [
        "./plugins/flowai",
        "./plugins/flowai-deno",
        "./plugins/flowai-typescript",
      ],
    );
    for (const plugin of plugins) {
      assertEquals(
        (plugin.source as Record<string, unknown>).source,
        "local",
      );
      assertEquals(
        (plugin.policy as Record<string, unknown>).installation,
        "AVAILABLE",
      );
      assertEquals(
        (plugin.policy as Record<string, unknown>).authentication,
        "ON_INSTALL",
      );
      assertEquals(plugin.category, "Productivity");
    }
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("codex-plugin-manifest displayName matches pluginName for every pack", async () => {
  // Regression guard for the "flowai-core" UI bug: when `displayName` derives
  // from `flowai ${packName}`, Codex renders the `core` pack as `flowai-core`
  // even though `name` is `flowai`. Locking displayName to pluginName keeps the
  // user-visible label aligned with the install identifier.
  const out = await tempOut();
  try {
    await buildPlugins({
      packs: ["core", "deno", "engineering"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });
    for (
      const [packName, pluginName] of [
        ["core", "flowai"],
        ["deno", "flowai-deno"],
        ["engineering", "flowai-engineering"],
      ] as const
    ) {
      const manifest = await readJson(
        join(out, "plugins", pluginName, ".codex-plugin", "plugin.json"),
      ) as Record<string, unknown>;
      assertEquals(
        manifest.name,
        pluginName,
        `${packName} pack: manifest name`,
      );
      assertEquals(
        (manifest.interface as Record<string, unknown>).displayName,
        pluginName,
        `${packName} pack: displayName must equal pluginName`,
      );
    }
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("codex-plugin-manifests emits-codex-plugin-manifests", async () => {
  const out = await tempOut();
  try {
    await buildPlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });

    const manifest = await readJson(
      join(out, "plugins", "flowai", ".codex-plugin", "plugin.json"),
    ) as Record<string, unknown>;
    assertEquals(manifest.name, "flowai");
    assertEquals(manifest.skills, "./skills/");
    // core carries no hooks (the doc-anchors-validate Stop hook lives in the
    // opt-in `beta` pack), so the manifest omits the hooks component.
    assertEquals(manifest.hooks, undefined);
    assertEquals(manifest.repository, "https://github.com/korchasa/flowai");
    assertEquals((manifest.author as Record<string, unknown>).name, "korchasa");
    assertEquals(
      (manifest.interface as Record<string, unknown>).displayName,
      "flowai",
    );
    assertEquals(
      (manifest.interface as Record<string, unknown>).category,
      "Productivity",
    );
    assert(
      Array.isArray(
        (manifest.interface as Record<string, unknown>).capabilities,
      ),
      "Codex manifest must declare user-visible capabilities",
    );
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

// Locks the pack move: the doc-anchors-validate Stop hook ships in the opt-in
// `beta` pack (plugin `flowai-beta`), NOT in core.
// [REF:fr:doc-anchors.hook | FR-DOC-ANCHORS.HOOK]
Deno.test("beta-pack ships-doc-anchors-stop-hook", async () => {
  const out = await tempOut();
  try {
    await buildPlugins({
      packs: ["beta"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });

    const hooks = await readJson(
      join(out, "plugins", "flowai-beta", "hooks", "hooks.json"),
    ) as {
      hooks: Record<
        string,
        Array<{ hooks: Array<{ command: string; timeout?: number }> }>
      >;
    };
    assert(
      Array.isArray(hooks.hooks.Stop),
      "beta must emit a Stop hook",
    );
    assertStringIncludes(
      hooks.hooks.Stop[0].hooks[0].command,
      "hooks/doc-anchors-validate/run.ts",
    );

    const runCopied = await Deno.stat(
      join(
        out,
        "plugins",
        "flowai-beta",
        "hooks",
        "doc-anchors-validate",
        "run.ts",
      ),
    ).then(() => true).catch(() => false);
    assert(runCopied, "beta plugin must copy the hook run.ts");

    // Hook-only pack → Claude-only plugin: Claude manifest present, NO Codex
    // manifest (Codex schema mandates a skills component the pack lacks).
    const claudeManifest = await readJson(
      join(
        out,
        "plugins",
        "flowai-beta",
        ".claude-plugin",
        "plugin.json",
      ),
    ) as Record<string, unknown>;
    assertEquals(claudeManifest.name, "flowai-beta");
    const codexEmitted = await Deno.stat(
      join(
        out,
        "plugins",
        "flowai-beta",
        ".codex-plugin",
        "plugin.json",
      ),
    ).then(() => true).catch(() => false);
    assertEquals(
      codexEmitted,
      false,
      "hook-only pack must not emit a Codex manifest",
    );
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("codex-payload codex-payload-matches-shared-transform-contract", async () => {
  const out = await tempOut();
  try {
    await buildPlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });

    const skillsDir = join(out, "plugins", "flowai", "skills");
    const names: string[] = [];
    for await (const e of Deno.readDir(skillsDir)) {
      if (e.isDirectory) names.push(e.name);
    }
    names.sort();
    assert(names.includes("commit"), "command payload missing");
    assert(names.includes("plan"), "skill payload missing");
    assert(
      names.includes("update"),
      "plugin-installable update command missing",
    );
    assert(!names.includes("flowai-commit"), "flowai- prefix leaked");

    const cmdFm = await readFrontmatter(
      join(skillsDir, "commit", "SKILL.md"),
    );
    assertEquals(cmdFm["disable-model-invocation"], true);

    const skillText = await Deno.readTextFile(
      join(skillsDir, "update", "SKILL.md"),
    );
    assertStringIncludes(skillText, "assets/AGENTS.template.md");
    assert(!skillText.includes("../../assets/AGENTS.template.md"));
    assert(!/\/flowai-(commit|plan|review)\b/.test(skillText));
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("skill-and-command-dirs-have-prefix-stripped", async () => {
  const out = await tempOut();
  try {
    await buildPlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });

    const skillsDir = join(out, "plugins", "flowai", "skills");
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
    assert(names.includes("commit"), "commit (from commit) missing");
    assert(names.includes("plan"), "plan (from plan) missing");
    assert(names.includes("review"), "review (from review) missing");
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("short source primitive names emit stable short plugin payload", async () => {
  const root = await Deno.makeTempDir({ prefix: "flowai-short-src-" });
  const out = await tempOut();
  try {
    const frameworkDir = join(root, "framework");
    const packDir = join(frameworkDir, "core");
    await Deno.mkdir(join(packDir, "commands", "commit"), {
      recursive: true,
    });
    await Deno.mkdir(join(packDir, "skills", "review"), {
      recursive: true,
    });
    await Deno.mkdir(join(packDir, "agents"), { recursive: true });
    await Deno.writeTextFile(
      join(packDir, "pack.yaml"),
      "name: core\nversion: 1.0.0\ndescription: Core pack\n",
    );
    await Deno.writeTextFile(
      join(packDir, "commands", "commit", "SKILL.md"),
      "---\nname: commit\ndescription: Commit changes\n---\nRun /review.\n",
    );
    await Deno.writeTextFile(
      join(packDir, "skills", "review", "SKILL.md"),
      "---\nname: review\ndescription: Review changes\n---\nRun /commit.\n",
    );
    await Deno.writeTextFile(
      join(packDir, "agents", "diff-specialist.md"),
      "---\nname: diff-specialist\ndescription: Diff specialist\n---\nBody\n",
    );

    await buildPlugins({
      packs: ["core"],
      frameworkDir,
      outDir: out,
      version: "1.2.3",
    });

    const skillsDir = join(out, "plugins", "flowai", "skills");
    const names: string[] = [];
    for await (const e of Deno.readDir(skillsDir)) {
      if (e.isDirectory) names.push(e.name);
    }
    names.sort();
    assertEquals(names, ["commit", "review"]);
    const commandText = await Deno.readTextFile(
      join(skillsDir, "commit", "SKILL.md"),
    );
    assertStringIncludes(commandText, "/flowai:review");
    const skillText = await Deno.readTextFile(
      join(skillsDir, "review", "SKILL.md"),
    );
    assertStringIncludes(skillText, "/flowai:commit");

    const agentFiles: string[] = [];
    for await (
      const e of Deno.readDir(join(out, "plugins", "flowai", "agents"))
    ) {
      if (e.isFile) agentFiles.push(e.name);
    }
    assertEquals(agentFiles, ["diff-specialist.md"]);
  } finally {
    await Deno.remove(root, { recursive: true });
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test(
  "commands-get-disable-model-invocation-injected-skills-do-not",
  async () => {
    const out = await tempOut();
    try {
      await buildPlugins({
        packs: ["core"],
        frameworkDir: FRAMEWORK,
        outDir: out,
      });

      const cmdFm = await readFrontmatter(
        join(out, "plugins", "flowai", "skills", "commit", "SKILL.md"),
      );
      assertEquals(
        cmdFm["disable-model-invocation"],
        true,
        "command must carry disable-model-invocation: true",
      );

      const sklFm = await readFrontmatter(
        join(out, "plugins", "flowai", "skills", "review", "SKILL.md"),
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

// Regression guards for the `marketplaceName` override that
// `sync-plugins-local.ts` relies on to emit the dogfood
// `flowai-plugins-local` namespace. The override path was already supported
// before this change; these tests lock the API surface so future refactors
// cannot quietly remove it.
Deno.test("builds-catalog-with-marketplace-name-override", async () => {
  const out = await tempOut();
  try {
    await buildPlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
      marketplaceName: "flowai-plugins-local",
    });
    const mp = await readJson(
      join(out, ".claude-plugin", "marketplace.json"),
    ) as Record<string, unknown>;
    assertEquals(mp.name, "flowai-plugins-local");
    const plugins = mp.plugins as Array<Record<string, unknown>>;
    assertEquals(plugins[0].name, "flowai");
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("codex-marketplace honours-marketplace-name-override", async () => {
  const out = await tempOut();
  try {
    await buildPlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
      marketplaceName: "flowai-plugins-local",
    });
    const mp = await readJson(
      join(out, ".agents", "plugins", "marketplace.json"),
    ) as Record<string, unknown>;
    assertEquals(mp.name, "flowai-plugins-local");
    assertEquals(
      (mp.interface as Record<string, unknown>).displayName,
      "flowai-plugins-local",
    );
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("marketplace-and-plugin-json-schema-valid", async () => {
  const out = await tempOut();
  try {
    await buildPlugins({
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
      join(out, "plugins", "flowai", ".claude-plugin", "plugin.json"),
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
    await buildPlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: a,
    });
    await buildPlugins({
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
    await Deno.mkdir(join(pack, "commands", "bad"), { recursive: true });
    await Deno.writeTextFile(
      join(fx, "deno.json"),
      JSON.stringify({ version: "0.0.1" }),
    );
    await Deno.writeTextFile(
      join(pack, "pack.yaml"),
      'name: core\nversion: "1.0.0"\ndescription: t\n',
    );
    await Deno.writeTextFile(
      join(pack, "commands", "bad", "SKILL.md"),
      "---\nname: bad\ndescription: x\ndisable-model-invocation: true\n---\nbody\n",
    );
    let threw = false;
    try {
      await buildPlugins({
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
        "bad",
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
    await Deno.mkdir(join(pack, "skills", "bad"), { recursive: true });
    await Deno.writeTextFile(
      join(fx, "deno.json"),
      JSON.stringify({ version: "0.0.1" }),
    );
    await Deno.writeTextFile(
      join(pack, "pack.yaml"),
      'name: core\nversion: "1.0.0"\ndescription: t\n',
    );
    await Deno.writeTextFile(
      join(pack, "skills", "bad", "SKILL.md"),
      "---\nname: bad\ndescription: x\ndisable-model-invocation: true\n---\nbody\n",
    );
    let threw = false;
    try {
      await buildPlugins({
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
    await buildPlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });
    const skillsDir = join(out, "plugins", "flowai", "skills");
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
    await buildPlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });
    const agentsDir = join(out, "plugins", "flowai", "agents");
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

Deno.test("plugin-includes-project-integration-update-command", async () => {
  const out = await tempOut();
  try {
    await buildPlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });
    const skillsDir = join(out, "plugins", "flowai", "skills");
    const names: string[] = [];
    for await (const e of Deno.readDir(skillsDir)) {
      if (e.isDirectory) names.push(e.name);
    }
    assert(
      names.includes("update"),
      `update command must be present for plugin/user-level installs, got: ${
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
    await buildPlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });
    const upstream = JSON.parse(
      await Deno.readTextFile(join(Deno.cwd(), "deno.json")),
    ) as { version: string };
    const pj = await readJson(
      join(out, "plugins", "flowai", ".claude-plugin", "plugin.json"),
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
    await buildPlugins({
      packs: ["core"],
      frameworkDir: FRAMEWORK,
      outDir: out,
    });
    // update reads AGENTS.template.md through a skill-local plugin asset path,
    // so the file must be copied to the per-skill location.
    const skillDir = join(
      out,
      "plugins",
      "flowai",
      "skills",
      "update",
    );
    const localAsset = join(skillDir, "assets", "AGENTS.template.md");
    const stat = await Deno.stat(localAsset);
    assert(
      stat.isFile,
      "AGENTS.template.md not copied into update/assets/",
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
    await Deno.mkdir(join(pack, "skills", "x"), { recursive: true });
    await Deno.writeTextFile(
      join(fx, "deno.json"),
      JSON.stringify({ version: "0.0.1" }),
    );
    await Deno.writeTextFile(
      join(pack, "pack.yaml"),
      'name: core\nversion: "1.0.0"\ndescription: t\n',
    );
    await Deno.writeTextFile(
      join(pack, "skills", "x", "SKILL.md"),
      [
        "---",
        "name: x",
        "description: d",
        "---",
        "before",
        "<!-- begin: cli-only-skill-update -->",
        "SECRET BLOCK",
        "<!-- end: cli-only-skill-update -->",
        "after",
      ].join("\n") + "\n",
    );
    await buildPlugins({
      packs: ["core"],
      frameworkDir: join(fx, "framework"),
      outDir: out,
    });
    const emitted = await Deno.readTextFile(
      join(out, "plugins", "flowai", "skills", "x", "SKILL.md"),
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

Deno.test("slash-rewriter-skips-file-paths-and-identifiers", async () => {
  const fx = await Deno.makeTempDir({ prefix: "flowai-slash-path-" });
  const out = await tempOut();
  try {
    const pack = join(fx, "framework", "core");
    await Deno.mkdir(join(pack, "skills", "a"), { recursive: true });
    await Deno.mkdir(join(pack, "commands", "commit"), { recursive: true });
    await Deno.writeTextFile(
      join(fx, "deno.json"),
      JSON.stringify({ version: "0.0.1" }),
    );
    await Deno.writeTextFile(
      join(pack, "pack.yaml"),
      'name: core\nversion: "1.0.0"\ndescription: t\n',
    );
    await Deno.writeTextFile(
      join(pack, "commands", "commit", "SKILL.md"),
      [
        "---",
        "name: commit",
        "description: d",
        "---",
        "Commit.",
      ].join("\n") + "\n",
    );
    await Deno.writeTextFile(
      join(pack, "skills", "a", "SKILL.md"),
      [
        "---",
        "name: a",
        "description: d",
        "---",
        "Real slash command: /commit (should rewrite).",
        "File path: scripts/audit.ts (must NOT rewrite).",
        "URL: https://example.com/flowai-skills (must NOT rewrite).",
        "Module name: import 'X/flowai-tools' (must NOT rewrite).",
      ].join("\n") + "\n",
    );
    await buildPlugins({
      packs: ["core"],
      frameworkDir: join(fx, "framework"),
      outDir: out,
    });
    const emitted = await Deno.readTextFile(
      join(out, "plugins", "flowai", "skills", "a", "SKILL.md"),
    );
    assertStringIncludes(emitted, "/flowai:commit");
    assertStringIncludes(emitted, "scripts/audit.ts");
    assertStringIncludes(emitted, "https://example.com/flowai-skills");
    assertStringIncludes(emitted, "'X/flowai-tools'");
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
    await Deno.mkdir(join(pack, "skills", "a"), { recursive: true });
    await Deno.mkdir(join(pack, "commands", "commit"), { recursive: true });
    await Deno.mkdir(join(pack, "skills", "plan"), { recursive: true });
    await Deno.mkdir(join(pack, "skills", "review"), { recursive: true });
    await Deno.writeTextFile(
      join(fx, "deno.json"),
      JSON.stringify({ version: "0.0.1" }),
    );
    await Deno.writeTextFile(
      join(pack, "pack.yaml"),
      'name: core\nversion: "1.0.0"\ndescription: t\n',
    );
    await Deno.writeTextFile(
      join(pack, "commands", "commit", "SKILL.md"),
      [
        "---",
        "name: commit",
        "description: d",
        "---",
        "Commit.",
      ].join("\n") + "\n",
    );
    await Deno.writeTextFile(
      join(pack, "skills", "plan", "SKILL.md"),
      [
        "---",
        "name: plan",
        "description: d",
        "---",
        "Plan.",
      ].join("\n") + "\n",
    );
    await Deno.writeTextFile(
      join(pack, "skills", "review", "SKILL.md"),
      [
        "---",
        "name: review",
        "description: d",
        "---",
        "Review.",
      ].join("\n") + "\n",
    );
    await Deno.writeTextFile(
      join(pack, "skills", "a", "SKILL.md"),
      [
        "---",
        "name: a",
        "description: d",
        "---",
        "Run /commit then /plan, finally /review.",
        "Already-rewritten /flowai:other stays untouched.",
      ].join("\n") + "\n",
    );
    await buildPlugins({
      packs: ["core"],
      frameworkDir: join(fx, "framework"),
      outDir: out,
    });
    const emitted = await Deno.readTextFile(
      join(out, "plugins", "flowai", "skills", "a", "SKILL.md"),
    );
    assertStringIncludes(emitted, "/flowai:commit");
    assertStringIncludes(emitted, "/flowai:plan");
    assertStringIncludes(emitted, "/flowai:review");
    assertStringIncludes(emitted, "/flowai:other");
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
    await Deno.mkdir(join(pack, "skills", "one"), { recursive: true });
    await Deno.mkdir(join(pack, "skills", "two"), { recursive: true });
    await Deno.writeTextFile(
      join(fx, "deno.json"),
      JSON.stringify({ version: "0.0.1" }),
    );
    await Deno.writeTextFile(
      join(pack, "pack.yaml"),
      'name: core\nversion: "1.0.0"\ndescription: t\n',
    );
    await Deno.writeTextFile(
      join(pack, "skills", "one", "SKILL.md"),
      "---\nname: one\ndescription: d\ntags: [alpha, shared]\n---\nbody\n",
    );
    await Deno.writeTextFile(
      join(pack, "skills", "two", "SKILL.md"),
      "---\nname: two\ndescription: d\ntags: [beta, shared]\n---\nbody\n",
    );
    await buildPlugins({
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
      join(out, "plugins", "flowai", ".claude-plugin", "plugin.json"),
    ) as Record<string, unknown>;
    assertEquals(pj.tags, undefined);
    // Skill frontmatter must have `tags` stripped (they migrated upward).
    const fm = await readFrontmatter(
      join(out, "plugins", "flowai", "skills", "one", "SKILL.md"),
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
    await buildPlugins({
      packs: ["core"],
      frameworkDir: join(fx, "framework"),
      outDir: out,
    });
    const hooksPath = join(
      out,
      "plugins",
      "flowai",
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
      join(out, "plugins", "flowai", "hooks", "my-hook", "run.ts"),
    );
    assert(runStat.isFile);
  } finally {
    await Deno.remove(fx, { recursive: true });
    await Deno.remove(out, { recursive: true });
  }
});

// Contract lock for FR-HOOK-RESOURCES.FORMAT: `Stop` is a supported hook event.
// emitHooks is event-agnostic (buckets by arbitrary `meta.event`), so a `Stop`
// hook flows into hooks.json under a top-level `Stop` key with no special-casing.
// This guards the plugin-bundle path against a future allowlist regression that
// would silently drop Stop-triggered hooks (e.g. doc-anchors-validate).
Deno.test("emits-stop-event-hooks-json", async () => {
  const fx = await Deno.makeTempDir({ prefix: "flowai-hooks-stop-" });
  const out = await tempOut();
  try {
    const pack = join(fx, "framework", "core");
    await Deno.mkdir(join(pack, "hooks", "doc-anchors-validate"), {
      recursive: true,
    });
    await Deno.writeTextFile(
      join(fx, "deno.json"),
      JSON.stringify({ version: "0.0.1" }),
    );
    await Deno.writeTextFile(
      join(pack, "pack.yaml"),
      'name: core\nversion: "1.0.0"\ndescription: t\n',
    );
    await Deno.writeTextFile(
      join(pack, "hooks", "doc-anchors-validate", "hook.yaml"),
      "event: Stop\ntimeout: 30\n",
    );
    await Deno.writeTextFile(
      join(pack, "hooks", "doc-anchors-validate", "run.ts"),
      'console.log("hi");\n',
    );
    await buildPlugins({
      packs: ["core"],
      frameworkDir: join(fx, "framework"),
      outDir: out,
    });
    const hooks = await readJson(
      join(out, "plugins", "flowai", "hooks", "hooks.json"),
    ) as {
      hooks: Record<
        string,
        Array<{
          matcher: string;
          hooks: Array<{ type: string; command: string; timeout?: number }>;
        }>
      >;
    };
    assert(Array.isArray(hooks.hooks.Stop), "Stop bucket missing");
    assertEquals(hooks.hooks.Stop[0].matcher, "");
    assertStringIncludes(
      hooks.hooks.Stop[0].hooks[0].command,
      "${CLAUDE_PLUGIN_ROOT}/hooks/doc-anchors-validate/run.ts",
    );
    assertEquals(hooks.hooks.Stop[0].hooks[0].timeout, 30);
  } finally {
    await Deno.remove(fx, { recursive: true });
    await Deno.remove(out, { recursive: true });
  }
});
