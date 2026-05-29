import { assertEquals, assertThrows } from "@std/assert";
import {
  autoInstallEnabled,
  codexCachePathFor,
  ENV_AUTO_INSTALL_PLUGINS,
  parseAndStripFlowaiTables,
  parseArgs,
  planClaudeActions,
  readMarketplacePluginNames,
  reconcileCodexFlowaiPluginEntries,
  shouldWipeLegacyCodexCache,
  validateCatalogMarketplaceName,
} from "./sync-plugins-local.ts";

Deno.test("readMarketplacePluginNames: extracts sorted unique plugin names", () => {
  const json = JSON.stringify({
    name: "flowai-plugins",
    plugins: [
      { name: "flowai-engineering" },
      { name: "flowai" },
      { name: "flowai-deno" },
      { name: "flowai" },
    ],
  });
  assertEquals(readMarketplacePluginNames(json), [
    "flowai",
    "flowai-deno",
    "flowai-engineering",
  ]);
});

Deno.test("readMarketplacePluginNames: throws when plugins array is missing", () => {
  assertThrows(() =>
    readMarketplacePluginNames(JSON.stringify({ name: "flowai-plugins" }))
  );
});

Deno.test("readMarketplacePluginNames: throws when marketplace declares zero plugins", () => {
  // Refusal-to-wipe guard: an empty list would silently nuke the user's
  // Codex flowai entries if it propagated to reconcileCodexFlowaiPluginEntries.
  assertThrows(() =>
    readMarketplacePluginNames(
      JSON.stringify({ name: "flowai-plugins", plugins: [] }),
    )
  );
});

Deno.test("planClaudeActions: every emitted plugin goes to install, disabled stays skipped", () => {
  // Fixtures imitate dogfood-namespace state — see Critique #8 in task
  // documents/tasks/2026/05/local-marketplace-namespace.md.
  const plan = planClaudeActions(
    ["flowai", "flowai-deno", "flowai-memex", "flowai-typescript"],
    [
      { id: "flowai@flowai-plugins-local", scope: "user", enabled: true },
      { id: "flowai-deno@flowai-plugins-local", scope: "user", enabled: false },
      { id: "flowai-memex@flowai-plugins-local", scope: "user", enabled: true },
    ],
  );
  assertEquals(plan.install, [
    "flowai@flowai-plugins-local",
    "flowai-memex@flowai-plugins-local",
    "flowai-typescript@flowai-plugins-local",
  ]);
  assertEquals(plan.skipped, ["flowai-deno@flowai-plugins-local"]);
});

Deno.test("planClaudeActions: ignores project-scope and other-marketplace disabled entries", () => {
  // Upstream `flowai@flowai-plugins` and any third-marketplace entry must
  // NOT influence the dogfood plan, even when disabled at user scope.
  const plan = planClaudeActions(
    ["flowai"],
    [
      { id: "flowai@flowai-plugins-local", scope: "project", enabled: false },
      { id: "flowai@flowai-plugins", scope: "user", enabled: false },
      { id: "flowai@other-marketplace", scope: "user", enabled: false },
    ],
  );
  assertEquals(plan.install, ["flowai@flowai-plugins-local"]);
  assertEquals(plan.skipped, []);
});

Deno.test("parseAndStripFlowaiTables: removes 2-line blocks and records enabled state", () => {
  // Fixtures imitate dogfood-namespace state — see Critique #8 in task
  // documents/tasks/2026/05/local-marketplace-namespace.md.
  const text = `[plugins."foreign@other-marketplace"]
enabled = true

[plugins."flowai-core@flowai-plugins-local"]
enabled = true

[plugins."flowai-deno@flowai-plugins-local"]
enabled = false

[projects."/tmp/x"]
trust_level = "trusted"
`;
  const { stripped, previousEnabled } = parseAndStripFlowaiTables(text);
  assertEquals(
    stripped.includes('[plugins."flowai-core@flowai-plugins-local"]'),
    false,
  );
  assertEquals(
    stripped.includes('[plugins."flowai-deno@flowai-plugins-local"]'),
    false,
  );
  assertEquals(
    stripped.includes('[plugins."foreign@other-marketplace"]'),
    true,
  );
  assertEquals(stripped.includes('[projects."/tmp/x"]'), true);
  assertEquals(previousEnabled.get("flowai-core"), true);
  assertEquals(previousEnabled.get("flowai-deno"), false);
});

Deno.test("parseAndStripFlowaiTables: handles CRLF line endings", () => {
  const text =
    `[plugins."flowai@flowai-plugins-local"]\r\nenabled = true\r\n\r\n[plugins."foreign@other"]\r\nenabled = true\r\n`;
  const { stripped, previousEnabled } = parseAndStripFlowaiTables(text);
  assertEquals(
    stripped.includes('[plugins."flowai@flowai-plugins-local"]'),
    false,
  );
  assertEquals(stripped.includes('[plugins."foreign@other"]'), true);
  assertEquals(previousEnabled.get("flowai"), true);
});

Deno.test("parseAndStripFlowaiTables: tolerates trailing whitespace and inline comments on enabled line", () => {
  const text = `[plugins."flowai@flowai-plugins-local"]
enabled = false   # pinned-off
extra_key = "value"

[next-section]
`;
  const { stripped, previousEnabled } = parseAndStripFlowaiTables(text);
  assertEquals(
    stripped.includes('[plugins."flowai@flowai-plugins-local"]'),
    false,
  );
  assertEquals(stripped.includes("extra_key"), false);
  assertEquals(stripped.includes("[next-section]"), true);
  assertEquals(previousEnabled.get("flowai"), false);
});

Deno.test("parseAndStripFlowaiTables: tables with extra keys are consumed entirely", () => {
  const text = `[plugins."flowai@flowai-plugins-local"]
enabled = true
version = "1.0"
custom = "x"

[unrelated]
key = 1
`;
  const { stripped } = parseAndStripFlowaiTables(text);
  assertEquals(
    stripped.includes('[plugins."flowai@flowai-plugins-local"]'),
    false,
  );
  assertEquals(stripped.includes("version"), false);
  assertEquals(stripped.includes('custom = "x"'), false);
  assertEquals(stripped.includes("[unrelated]"), true);
});

Deno.test("parseAndStripFlowaiTables: leaves upstream flowai-plugins blocks untouched when stripping dogfood", () => {
  // Dual-marketplace invariant: a config carrying BOTH upstream
  // `<x>@flowai-plugins` and dogfood `<x>@flowai-plugins-local` tables must
  // see only the dogfood ones stripped when the default marketplaceName is
  // the dogfood const. Upstream entries are byte-identical post-strip.
  const text = `[plugins."flowai@flowai-plugins"]
enabled = true

[plugins."flowai@flowai-plugins-local"]
enabled = true

[plugins."flowai-deno@flowai-plugins"]
enabled = false

[other]
key = 1
`;
  const { stripped, previousEnabled } = parseAndStripFlowaiTables(text);
  assertEquals(
    stripped.includes('[plugins."flowai@flowai-plugins"]'),
    true,
    "upstream flowai must survive",
  );
  assertEquals(
    stripped.includes('[plugins."flowai-deno@flowai-plugins"]'),
    true,
    "upstream flowai-deno must survive",
  );
  assertEquals(
    stripped.includes('[plugins."flowai@flowai-plugins-local"]'),
    false,
    "dogfood entry must be removed",
  );
  assertEquals(stripped.includes("[other]"), true);
  // Only the dogfood entry contributes to previousEnabled.
  assertEquals(previousEnabled.get("flowai"), true);
  assertEquals(previousEnabled.size, 1);
});

Deno.test("parseAndStripFlowaiTables: file ending without trailing newline still parses", () => {
  const text =
    `[other]\nkey = 1\n\n[plugins."flowai@flowai-plugins-local"]\nenabled = true`;
  const { stripped, previousEnabled } = parseAndStripFlowaiTables(text);
  assertEquals(
    stripped.includes('[plugins."flowai@flowai-plugins-local"]'),
    false,
  );
  assertEquals(stripped.includes("[other]"), true);
  assertEquals(previousEnabled.get("flowai"), true);
});

Deno.test("reconcileCodexFlowaiPluginEntries: preserves enabled=false across reconcile", () => {
  const original = `[plugins."flowai-memex@flowai-plugins-local"]
enabled = false

[plugins."flowai@flowai-plugins-local"]
enabled = true
`;
  const next = reconcileCodexFlowaiPluginEntries(original, [
    "flowai",
    "flowai-memex",
    "flowai-typescript",
  ]);
  assertEquals(
    next.includes(
      '[plugins."flowai-memex@flowai-plugins-local"]\nenabled = false',
    ),
    true,
    "previously-disabled plugin must keep enabled=false",
  );
  assertEquals(
    next.includes('[plugins."flowai@flowai-plugins-local"]\nenabled = true'),
    true,
  );
  assertEquals(
    next.includes(
      '[plugins."flowai-typescript@flowai-plugins-local"]\nenabled = true',
    ),
    true,
    "newly-emitted plugin defaults to enabled=true",
  );
});

Deno.test("reconcileCodexFlowaiPluginEntries: CRLF-encoded input does not produce duplicate tables", () => {
  const original =
    `[plugins."flowai@flowai-plugins-local"]\r\nenabled = true\r\n\r\n[other]\r\nkey = 1\r\n`;
  const next = reconcileCodexFlowaiPluginEntries(original, ["flowai"]);
  const occurrences =
    next.match(/\[plugins\."flowai@flowai-plugins-local"\]/g) ?? [];
  assertEquals(
    occurrences.length,
    1,
    "exactly one flowai-plugins-local table after reconcile",
  );
});

Deno.test("reconcileCodexFlowaiPluginEntries: idempotent across repeated runs", () => {
  const original = `[plugins."flowai-core@flowai-plugins-local"]
enabled = true
`;
  const once = reconcileCodexFlowaiPluginEntries(original, [
    "flowai",
    "flowai-deno",
  ]);
  const twice = reconcileCodexFlowaiPluginEntries(once, [
    "flowai",
    "flowai-deno",
  ]);
  assertEquals(once, twice);
});

Deno.test("reconcileCodexFlowaiPluginEntries: upstream flowai-plugins blocks survive a dogfood reconcile", () => {
  // Dual-marketplace coexistence test: upstream entries must be byte-
  // identical after a dogfood reconcile and dogfood blocks fully replaced.
  const original = `[plugins."flowai@flowai-plugins"]
enabled = true

[plugins."flowai-deno@flowai-plugins"]
enabled = false

[plugins."flowai@flowai-plugins-local"]
enabled = false
`;
  const next = reconcileCodexFlowaiPluginEntries(original, [
    "flowai",
    "flowai-deno",
  ]);
  assertEquals(
    next.includes('[plugins."flowai@flowai-plugins"]\nenabled = true'),
    true,
    "upstream flowai stays enabled",
  );
  assertEquals(
    next.includes('[plugins."flowai-deno@flowai-plugins"]\nenabled = false'),
    true,
    "upstream flowai-deno stays disabled",
  );
  assertEquals(
    next.includes('[plugins."flowai@flowai-plugins-local"]\nenabled = false'),
    true,
    "previously-disabled dogfood flowai stays disabled after reconcile",
  );
  assertEquals(
    next.includes(
      '[plugins."flowai-deno@flowai-plugins-local"]\nenabled = true',
    ),
    true,
    "new dogfood flowai-deno defaults to enabled=true",
  );
});

Deno.test("reconcileCodexFlowaiPluginEntries: throws on empty emittedNames", () => {
  assertThrows(
    () => reconcileCodexFlowaiPluginEntries("[other]\nkey = 1\n", []),
    Error,
    "refusing to reconcile",
  );
});

Deno.test("parseArgs: --out without value fails fast", () => {
  assertThrows(() => parseArgs(["--out"]), Error, "--out requires");
  assertThrows(
    () => parseArgs(["--out", "--no-build"]),
    Error,
    "--out requires",
  );
});

Deno.test("parseArgs: accepts valid --out and --no-build", () => {
  assertEquals(parseArgs(["--out", "tmp/dist"]), {
    outDir: "tmp/dist",
    skipBuild: false,
  });
  assertEquals(parseArgs(["--no-build"]), {
    outDir: "dist/claude-plugins",
    skipBuild: true,
  });
});

Deno.test("codexCachePathFor: honours CODEX_HOME over HOME", () => {
  assertEquals(
    codexCachePathFor("flowai-plugins-local", {
      codexHome: "/var/custom/codex",
      home: "/Users/me",
    }),
    "/var/custom/codex/plugins/cache/flowai-plugins-local",
  );
});

Deno.test("codexCachePathFor: falls back to HOME/.codex when CODEX_HOME unset", () => {
  assertEquals(
    codexCachePathFor("flowai-plugins-local", { home: "/Users/me" }),
    "/Users/me/.codex/plugins/cache/flowai-plugins-local",
  );
});

Deno.test("shouldWipeLegacyCodexCache: wipes absent legacy marketplace cache", () => {
  const text = `[marketplaces.flowai-plugins-local]
source_type = "local"
source = "/repo/dist/claude-plugins"
`;
  assertEquals(
    shouldWipeLegacyCodexCache(
      text,
      "flowai-plugins",
      "/repo/dist/claude-plugins",
    ),
    true,
  );
});

Deno.test("shouldWipeLegacyCodexCache: wipes legacy cache when it points at current dist", () => {
  const text = `[marketplaces.flowai-plugins]
source_type = "local"
source = "/repo/dist/claude-plugins"

[marketplaces.flowai-plugins-local]
source_type = "local"
source = "/repo/dist/claude-plugins"
`;
  assertEquals(
    shouldWipeLegacyCodexCache(
      text,
      "flowai-plugins",
      "/repo/dist/claude-plugins",
    ),
    true,
  );
});

Deno.test("shouldWipeLegacyCodexCache: preserves genuine upstream legacy cache", () => {
  const text = `[marketplaces.flowai-plugins]
source_type = "git"
source = "korchasa/flowai-plugins"
`;
  assertEquals(
    shouldWipeLegacyCodexCache(
      text,
      "flowai-plugins",
      "/repo/dist/claude-plugins",
    ),
    false,
  );
});

Deno.test("validateCatalogMarketplaceName: returns null when name matches", () => {
  const json = JSON.stringify({ name: "flowai-plugins-local", plugins: [] });
  assertEquals(
    validateCatalogMarketplaceName(json, "flowai-plugins-local", "dist/x"),
    null,
  );
});

Deno.test("validateCatalogMarketplaceName: reports mismatch with rebuild hint", () => {
  const json = JSON.stringify({ name: "flowai-plugins", plugins: [] });
  const err = validateCatalogMarketplaceName(
    json,
    "flowai-plugins-local",
    "dist/x",
  );
  assertEquals(typeof err, "string");
  // Hint must name the expected value and the rebuild command.
  assertEquals(err!.includes("flowai-plugins-local"), true);
  assertEquals(err!.includes("--marketplace-name flowai-plugins-local"), true);
  assertEquals(err!.includes("flowai-plugins"), true);
});

Deno.test("validateCatalogMarketplaceName: reports malformed JSON", () => {
  const err = validateCatalogMarketplaceName(
    "{not json",
    "flowai-plugins-local",
    "dist/x",
  );
  assertEquals(typeof err, "string");
  assertEquals(err!.includes("Failed to parse"), true);
});

Deno.test("autoInstallEnabled: reads explicit true from dotenv content", () => {
  assertEquals(
    autoInstallEnabled(`${ENV_AUTO_INSTALL_PLUGINS}=true\n`),
    true,
  );
});

Deno.test("autoInstallEnabled: only exact true enables auto-install", () => {
  assertEquals(autoInstallEnabled(`${ENV_AUTO_INSTALL_PLUGINS}=1\n`), false);
  assertEquals(
    autoInstallEnabled(`${ENV_AUTO_INSTALL_PLUGINS}=false\n`),
    false,
  );
  assertEquals(autoInstallEnabled("AUTO_INSTALL_PLPUGINS=true\n"), false);
});
