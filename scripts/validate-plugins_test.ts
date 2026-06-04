// implements [REF:fr:dist.marketplace | FR-DIST.MARKETPLACE]
// Verification of scripts/validate-plugins.ts.
//
// Hermetic fixtures + one happy-path against the real `framework/core/` build.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { buildPlugins } from "./build-plugins.ts";
import { validateMarketplaceTree } from "./validate-plugins.ts";

async function freshBuild(): Promise<string> {
  const out = await Deno.makeTempDir({ prefix: "flowai-validate-test-" });
  await buildPlugins({
    packs: ["core"],
    frameworkDir: join(Deno.cwd(), "framework"),
    outDir: out,
  });
  return out;
}

Deno.test("validator-passes-on-real-core-build", async () => {
  const out = await freshBuild();
  try {
    const issues = await validateMarketplaceTree(out);
    assertEquals(
      issues,
      [],
      `unexpected issues: ${JSON.stringify(issues, null, 2)}`,
    );
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("rejects-missing-marketplace-json", async () => {
  const out = await Deno.makeTempDir({ prefix: "flowai-validate-test-" });
  try {
    const issues = await validateMarketplaceTree(out);
    assertEquals(issues.length, 2);
    assert(
      issues.some((issue) =>
        issue.file.includes(".claude-plugin") &&
        issue.message.includes("marketplace.json not found")
      ),
    );
    assert(
      issues.some((issue) =>
        issue.file.includes(".agents/plugins") &&
        issue.message.includes("marketplace.json not found")
      ),
    );
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("rejects-invalid-marketplace-name", async () => {
  const out = await freshBuild();
  try {
    // Mutate to a reserved name.
    const mp = JSON.parse(
      await Deno.readTextFile(
        join(out, ".claude-plugin", "marketplace.json"),
      ),
    );
    mp.name = "claude-plugins-official";
    await Deno.writeTextFile(
      join(out, ".claude-plugin", "marketplace.json"),
      JSON.stringify(mp, null, 2),
    );
    const issues = await validateMarketplaceTree(out);
    assert(issues.length > 0, "expected schema failure on reserved name");
    assertStringIncludes(issues[0].message, "reserved");
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("rejects-missing-required-marketplace-field", async () => {
  const out = await freshBuild();
  try {
    const mp = JSON.parse(
      await Deno.readTextFile(
        join(out, ".claude-plugin", "marketplace.json"),
      ),
    );
    delete mp.owner;
    await Deno.writeTextFile(
      join(out, ".claude-plugin", "marketplace.json"),
      JSON.stringify(mp, null, 2),
    );
    const issues = await validateMarketplaceTree(out);
    assert(issues.some((i) => i.message.includes("owner")));
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("rejects-plugin-source-pointing-to-missing-dir", async () => {
  const out = await freshBuild();
  try {
    const mp = JSON.parse(
      await Deno.readTextFile(
        join(out, ".claude-plugin", "marketplace.json"),
      ),
    );
    mp.plugins[0].source = "./does-not-exist";
    await Deno.writeTextFile(
      join(out, ".claude-plugin", "marketplace.json"),
      JSON.stringify(mp, null, 2),
    );
    const issues = await validateMarketplaceTree(out);
    assert(
      issues.some((i) => i.message.includes("does not exist")),
      `expected missing-dir issue, got: ${JSON.stringify(issues)}`,
    );
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("rejects-plugin-manifest-name-mismatch", async () => {
  const out = await freshBuild();
  try {
    const manifestPath = join(
      out,
      "plugins",
      "flowai",
      ".claude-plugin",
      "plugin.json",
    );
    const pj = JSON.parse(await Deno.readTextFile(manifestPath));
    pj.name = "flowai-something-else";
    await Deno.writeTextFile(manifestPath, JSON.stringify(pj, null, 2));
    const issues = await validateMarketplaceTree(out);
    assert(issues.some((i) => i.message.includes("name mismatch")));
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("rejects-skill-with-broken-frontmatter", async () => {
  const out = await freshBuild();
  try {
    const skillPath = join(
      out,
      "plugins",
      "flowai",
      "skills",
      "plan",
      "SKILL.md",
    );
    await Deno.writeTextFile(skillPath, "no frontmatter here\nbody body\n");
    const issues = await validateMarketplaceTree(out);
    assert(issues.some((i) => i.message.includes("missing YAML frontmatter")));
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("rejects-skill-dir-with-unstripped-flowai-prefix", async () => {
  const out = await freshBuild();
  try {
    // Rename one skill dir to retain the flowai- prefix.
    const skills = join(out, "plugins", "flowai", "skills");
    await Deno.rename(join(skills, "plan"), join(skills, "flowai-plan"));
    const issues = await validateMarketplaceTree(out);
    assert(
      issues.some((i) => i.message.includes("flowai-")),
      `expected prefix-leak issue, got: ${JSON.stringify(issues)}`,
    );
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("rejects-agent-with-missing-description", async () => {
  const out = await freshBuild();
  try {
    const agentsDir = join(out, "plugins", "flowai", "agents");
    let firstAgent: string | undefined;
    for await (const e of Deno.readDir(agentsDir)) {
      if (e.isFile && e.name.endsWith(".md")) {
        firstAgent = join(agentsDir, e.name);
        break;
      }
    }
    assert(firstAgent, "no agent emitted to test against");
    await Deno.writeTextFile(
      firstAgent,
      "---\nname: ok\n---\nbody only, no description in fm\n",
    );
    const issues = await validateMarketplaceTree(out);
    assert(
      issues.some((i) => i.message.includes("description")),
      `expected missing-description issue, got: ${JSON.stringify(issues)}`,
    );
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("codex rejects-invalid-codex-marketplace", async () => {
  const out = await freshBuild();
  try {
    const marketplacePath = join(
      out,
      ".agents",
      "plugins",
      "marketplace.json",
    );
    const mp = JSON.parse(await Deno.readTextFile(marketplacePath));
    mp.plugins[0].source.path = "../outside";
    await Deno.writeTextFile(marketplacePath, JSON.stringify(mp, null, 2));

    const issues = await validateMarketplaceTree(out);
    assert(
      issues.some((i) =>
        i.file.includes(".agents/plugins/marketplace.json") &&
        i.message.includes("must start with './'")
      ),
      `expected Codex source path issue, got: ${JSON.stringify(issues)}`,
    );
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("codex rejects-invalid-codex-plugin-manifest", async () => {
  const out = await freshBuild();
  try {
    const manifestPath = join(
      out,
      "plugins",
      "flowai",
      ".codex-plugin",
      "plugin.json",
    );
    const manifest = JSON.parse(await Deno.readTextFile(manifestPath));
    manifest.skills = "../skills/";
    await Deno.writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));

    const issues = await validateMarketplaceTree(out);
    assert(
      issues.some((i) =>
        i.file.includes(".codex-plugin/plugin.json") &&
        i.message.includes("component path") &&
        i.message.includes("must start with './'")
      ),
      `expected Codex component path issue, got: ${JSON.stringify(issues)}`,
    );
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});
