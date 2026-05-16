// implements [FR-DIST.MARKETPLACE](../documents/requirements.md#fr-dist.marketplace-claude-code-plugin-marketplace-pilot)
// Verification of scripts/validate-claude-plugins.ts.
//
// Hermetic fixtures + one happy-path against the real `framework/core/` build.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { buildClaudePlugins } from "./build-claude-plugins.ts";
import { validateMarketplaceTree } from "./validate-claude-plugins.ts";

async function freshBuild(): Promise<string> {
  const out = await Deno.makeTempDir({ prefix: "flowai-validate-test-" });
  await buildClaudePlugins({
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
    assertEquals(issues.length, 1);
    assertStringIncludes(issues[0].message, "marketplace.json not found");
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
      "flowai-core",
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
      "flowai-core",
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
    const skills = join(out, "plugins", "flowai-core", "skills");
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
    const agentsDir = join(out, "plugins", "flowai-core", "agents");
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
