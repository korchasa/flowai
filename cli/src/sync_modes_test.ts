// Global sync mode, --dry-run, and prefix-based orphan cleanup.
// [FR-DIST.GLOBAL](../../documents/requirements.md#fr-dist.global-scope-selection-global-local-auto) — global sync mode.
// [FR-DIST.SYNC](../../documents/requirements.md#fr-dist.sync-sync-command-flowai) — `--dry-run`.
// [FR-DIST.CLEAN-PREFIX](../../documents/requirements.md#fr-dist.clean-prefix-prefix-based-orphan-cleanup) — prefix cleanup.
// Split out of sync_test.ts to keep individual test files under 500 lines.
import { assert, assertEquals } from "@std/assert";
import { sync } from "./sync.ts";
import { InMemoryFrameworkSource } from "./source.ts";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import type { FlowConfig } from "./types.ts";

function makeConfig(overrides: Partial<FlowConfig> = {}): FlowConfig {
  return {
    version: "1.1",
    ides: ["claude"],
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: [] },
    ...overrides,
  };
}

/** Minimal framework fixture covering pack + skill + command + asset. */
function makeMinimalFramework(): InMemoryFrameworkSource {
  const files = new Map<string, string>();
  files.set(
    "framework/core/pack.yaml",
    `name: core
version: 1.0.0
description: Core pack
assets:
  AGENTS.template.md: AGENTS.md
`,
  );
  files.set(
    "framework/core/skills/flowai-demo/SKILL.md",
    `---
name: flowai-demo
description: Demo skill
---
Body.
`,
  );
  files.set(
    "framework/core/commands/flowai-project-cmd/SKILL.md",
    `---
name: flowai-project-cmd
description: Project-only command
scope: project-only
---
Body.
`,
  );
  files.set(
    "framework/core/commands/flowai-global-cmd/SKILL.md",
    `---
name: flowai-global-cmd
description: Global-only command
scope: global-only
---
Body.
`,
  );
  files.set(
    "framework/core/assets/AGENTS.template.md",
    "# AGENTS template\n",
  );
  return new InMemoryFrameworkSource(files);
}

Deno.test("global mode installs templates", async () => {
  const fs = new InMemoryFsAdapter();
  const src = makeMinimalFramework();
  await sync(
    "/project",
    makeConfig({ packs: ["core"], ides: ["claude"] }),
    fs,
    { yes: true, scope: "global", home: "/home/user", source: src },
  );

  // Template lands at ~/.claude/assets/AGENTS.template.md
  assertEquals(
    await fs.exists("/home/user/.claude/assets/AGENTS.template.md"),
    true,
  );
});

Deno.test("global mode skips artifact sync", async () => {
  const fs = new InMemoryFsAdapter();
  const src = makeMinimalFramework();
  const result = await sync(
    "/project",
    makeConfig({ packs: ["core"], ides: ["claude"] }),
    fs,
    { yes: true, scope: "global", home: "/home/user", source: src },
  );

  for (const action of result.assetActions) {
    assertEquals(action.scaffolds, []);
  }
  assertEquals(await fs.exists("/project/CLAUDE.md"), false);
  assertEquals(
    await fs.exists("/project/.claude/skills/flowai-demo/SKILL.md"),
    false,
  );
  assertEquals(
    await fs.exists(
      "/home/user/.claude/skills/flowai-demo/SKILL.md",
    ),
    true,
  );
});

Deno.test("scope filter respects global mode", async () => {
  const fs = new InMemoryFsAdapter();
  const src = makeMinimalFramework();
  await sync(
    "/project",
    makeConfig({ packs: ["core"], ides: ["claude"] }),
    fs,
    { yes: true, scope: "global", home: "/home/user", source: src },
  );

  // project-only command is excluded in global mode.
  assertEquals(
    await fs.exists("/home/user/.claude/skills/flowai-project-cmd/SKILL.md"),
    false,
  );
  // global-only command is installed in global mode.
  assertEquals(
    await fs.exists("/home/user/.claude/skills/flowai-global-cmd/SKILL.md"),
    true,
  );
});

Deno.test("scope filter respects project mode", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project/.claude");
  const src = makeMinimalFramework();
  await sync(
    "/project",
    makeConfig({ packs: ["core"], ides: ["claude"] }),
    fs,
    { yes: true, source: src },
  );

  assertEquals(
    await fs.exists("/project/.claude/skills/flowai-project-cmd/SKILL.md"),
    true,
  );
  assertEquals(
    await fs.exists("/project/.claude/skills/flowai-global-cmd/SKILL.md"),
    false,
  );
});

Deno.test("both modes coexist - independent targets", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project/.claude");
  const src = makeMinimalFramework();

  await sync(
    "/project",
    makeConfig({ packs: ["core"], ides: ["claude"] }),
    fs,
    { yes: true, source: src },
  );
  await sync(
    "/project",
    makeConfig({ packs: ["core"], ides: ["claude"] }),
    fs,
    { yes: true, scope: "global", home: "/home/user", source: src },
  );

  assertEquals(
    await fs.exists("/project/.claude/skills/flowai-demo/SKILL.md"),
    true,
  );
  assertEquals(
    await fs.exists("/home/user/.claude/skills/flowai-demo/SKILL.md"),
    true,
  );
});

// --- FR-DIST.SYNC — --dry-run ---

Deno.test("sync - dry-run does not write files but produces plan actions", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project/.claude");
  const src = makeMinimalFramework();

  const filesBefore = fs.files.size;

  const result = await sync(
    "/project",
    makeConfig({ packs: ["core"], ides: ["claude"] }),
    fs,
    { yes: true, dryRun: true, source: src },
  );

  assertEquals(fs.files.size, filesBefore, "dry-run must leave fs untouched");
  assertEquals(
    await fs.exists("/project/.claude/skills/flowai-demo/SKILL.md"),
    false,
  );
  assert(
    result.skillActions.some(
      (a) => a.name === "flowai-demo" && a.action === "create",
    ),
    "dry-run must still compute skillActions from plan",
  );
  assertEquals(
    result.totalWritten,
    0,
    "dry-run must not increment totalWritten",
  );
});

Deno.test("sync - dry-run global mode does not touch user dirs", async () => {
  const fs = new InMemoryFsAdapter();
  const src = makeMinimalFramework();

  const filesBefore = fs.files.size;

  await sync(
    "/project",
    makeConfig({ packs: ["core"], ides: ["claude"] }),
    fs,
    {
      yes: true,
      dryRun: true,
      scope: "global",
      home: "/home/user",
      source: src,
    },
  );

  assertEquals(fs.files.size, filesBefore);
  assertEquals(
    await fs.exists("/home/user/.claude/skills/flowai-demo/SKILL.md"),
    false,
  );
});

// --- FR-DIST.CLEAN-PREFIX — prefix-based orphan cleanup end-to-end ---

Deno.test("sync - removes orphan skill dir after framework rename", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project");
  fs.dirs.add("/project/.claude");

  // Pre-existing installation: the old primitive dir from a previous sync.
  await fs.writeFile(
    "/project/.claude/skills/flowai-old/SKILL.md",
    "old body",
  );
  // A user-owned skill that must survive cleanup.
  await fs.writeFile(
    "/project/.claude/skills/my-custom/SKILL.md",
    "user body",
  );

  const source = new InMemoryFrameworkSource(
    new Map([
      [
        "framework/core/pack.yaml",
        "name: core\nversion: 1.0.0\ndescription: core\n",
      ],
      [
        "framework/core/skills/flowai-new/SKILL.md",
        `---
name: flowai-new
description: New name after rename
---
Body.
`,
      ],
    ]),
  );

  const config: FlowConfig = {
    version: "1.1",
    ides: ["claude"],
    packs: ["core"],
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: [] },
  };

  await sync("/project", config, fs, {
    yes: true,
    source,
    onProgress: () => {},
  });

  assertEquals(
    await fs.exists("/project/.claude/skills/flowai-new/SKILL.md"),
    true,
    "new name must be present after sync",
  );
  assertEquals(
    await fs.exists("/project/.claude/skills/flowai-old"),
    false,
    "stale flowai-* dir must be removed by prefix cleanup",
  );
  assertEquals(
    await fs.exists("/project/.claude/skills/my-custom/SKILL.md"),
    true,
    "user-owned skill must survive prefix cleanup",
  );
});
